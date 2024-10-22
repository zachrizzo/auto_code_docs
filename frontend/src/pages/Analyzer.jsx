import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box,
    IconButton,
    Typography,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Button,
    Tooltip,
    CircularProgress,
    Divider,
    Toolbar,
    Tab,
    Tabs,
    Drawer,
    List,
    ListItem,
    Switch as MuiSwitch,
    FormControlLabel,
} from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    ClearAll as ClearAllIcon,
    SwapHoriz as SwapHorizIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    Save as SaveIcon,
    Code as CodeIcon,
    Description as DescriptionIcon,
    BugReport as BugReportIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import PolylineOutlinedIcon from '@mui/icons-material/PolylineOutlined';
import BorderedTreeView from '../components/analyzer/TreeDocumentation';
import CodeFlowChart from '../components/analyzer/mindMap/CodeMap';
import { getAIDescription, generateUnitTest } from '../api/CodeDocumentation';
import NodeClickContext from '../contexts/NodeClickContext';
import { ReactFlowProvider } from 'reactflow';
import { useTheme } from '@mui/material/styles';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

import { ErrorBoundary } from 'react-error-boundary';

// Updated CodeMirror imports
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import ReactMarkdown from 'react-markdown';

const { ipcRenderer } = window.electronAPI;

const drawerMinWidth = 300;
const drawerMaxWidth = 800;

const Analyzer = () => {
    const [results, setResults] = useState({ nodes: [], edges: [] });
    const [aiDescriptions, setAIDescriptions] = useState({});
    const [selectedNode, setSelectedNode] = useState(null);
    const [watchingDir, setWatchingDir] = useState('');
    const [viewMode, setViewMode] = useState('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [focusNode, setFocusNode] = useState(null);
    const [isDirectoryDialogOpen, setIsDirectoryDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedCode, setEditedCode] = useState('');
    const [unitTest, setUnitTest] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerWidth, setDrawerWidth] = useState(400);
    const [fileCode, setFileCode] = useState('');
    const [codeSnippet, setCodeSnippet] = useState('');
    const [isCodeExpanded, setIsCodeExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [includeAnonymousFunctions, setIncludeAnonymousFunctions] = useState(true);
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false); // New state for Settings Panel
    const theme = useTheme();
    const containerRef = useRef(null);
    const [drawerHeight, setDrawerHeight] = useState(0);
    const [maxNodes, setMaxNodes] = useState(1000);
    const [maxEdges, setMaxEdges] = useState(5000);
    const [relationshipOrder, setRelationshipOrder] = useState('calledToCaller');
    const [allFilteredNodes, setAllFilteredNodes] = useState([])

    useEffect(() => {
        const updateDrawerHeight = () => {
            if (containerRef.current) {
                const height = containerRef.current.clientHeight;
                setDrawerHeight(height);
            }
        };

        // Initial height set
        updateDrawerHeight();

        // Update height on window resize
        window.addEventListener('resize', updateDrawerHeight);

        return () => {
            window.removeEventListener('resize', updateDrawerHeight);
        };
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!watchingDir) {
            alert('Please select a directory to analyze.');
            return;
        }

        setIsLoading(true);

        try {
            const { analysisResults, graphData } = await ipcRenderer.invoke('analyze-directory', watchingDir, includeAnonymousFunctions, maxNodes, maxEdges, relationshipOrder);

            const parsedAnalysisResults = JSON.parse(analysisResults);
            const parsedGraphData = JSON.parse(graphData);

            console.log('New Analysis Results:', parsedAnalysisResults);
            console.log('New Graph Data:', parsedGraphData);

            setResults(parsedGraphData);
        } catch (error) {
            console.error('Renderer: Error during analysis:', error);
            alert('An error occurred during analysis. Please check the console for details.');
        } finally {
            setIsLoading(false);
        }
    }, [watchingDir, includeAnonymousFunctions, maxNodes, maxEdges, relationshipOrder]);

    const clear = () => {
        setAIDescriptions({});
        setResults({ nodes: [], edges: [] }); // Reset to initial structure
        setSelectedNode(null);
        setEditedCode('');
        setUnitTest('');
        setIsDrawerOpen(false);
        setFileCode('');
        setCodeSnippet('');
        setIsCodeExpanded(false);
    };

    console.log('Selected Node:', editedCode);

    /**
     * Handles saving the edited code back to the file.
     */
    const handleSave = useCallback(async () => {
        console.log('Selected Node:', selectedNode);
        console.log('Is Code Expanded:', isCodeExpanded);
        console.log('Edited Code Length:', editedCode.length);
        console.log('File Code Length:', fileCode.length);

        if (!selectedNode || !selectedNode.id) {
            alert('No node selected to save.');
            return;
        }

        const filePath = selectedNode.filePath;
        if (!filePath) {
            alert('File path not available for this code.');
            return;
        }

        if (!fileCode) {
            alert('No file content available to save.');
            return;
        }

        try {
            let contentToSave = '';
            if (isCodeExpanded) {
                contentToSave = editedCode;
            } else {
                // Ensure startPosition and endPosition are valid
                const { startPosition, endPosition } = selectedNode.declarationInfo;
                if (
                    !startPosition ||
                    !endPosition ||
                    typeof startPosition.row !== 'number' ||
                    typeof endPosition.row !== 'number'
                ) {
                    console.error('Invalid startPosition or endPosition:', {
                        startPosition,
                        endPosition,
                    });
                    alert('Invalid code snippet positions.');
                    return;
                }

                // Merge the edited snippet back into the full file code
                const lines = fileCode.split('\n');
                const editedLines = editedCode.split('\n');
                const beforeLines = lines.slice(0, startPosition.row);
                const afterLines = lines.slice(endPosition.row + 1);

                const newLines = [...beforeLines, ...editedLines, ...afterLines];
                contentToSave = newLines.join('\n');
            }

            console.log('Content to Save:', contentToSave);

            const result = await ipcRenderer.invoke('save-file', { filePath, content: contentToSave });
            if (result.success) {
                alert('File saved successfully.');
                // Optionally, re-analyze the directory or refresh the node data
                handleAnalyze();
            } else {
                alert(`Failed to save file: ${result.error}`);
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('An error occurred while saving the file.');
        }
    }, [selectedNode, isCodeExpanded, editedCode, fileCode, handleAnalyze]);

    const handleTabChange = useCallback((event, newValue) => {
        setActiveTab(newValue);
    }, []);

    /**
     * Handles node click events to display details and allow editing.
     * @param {string} nodeId - The ID of the clicked node.
     */
    const handleNodeClick = useCallback(
        async (nodeId) => {
            if (!nodeId) {
                console.error('No nodeId provided to handleNodeClick');
                return;
            }

            if (!results || !results.nodes || !results.edges) {
                console.error('Results data is not properly loaded.');
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'Failed to load descriptions.' }));
                return;
            }

            const nodeData = results.nodes.find((node) => node.id === nodeId);

            if (!nodeData) {
                console.error(`Node data not found for nodeId: ${nodeId}`);
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'Node data not found.' }));
                return;
            }

            if (!nodeData.data.code) {
                // This could be a file node or a node without code
                if (nodeData.data.type === 'file') {
                    alert('Selected node is a file. Code insertion is not applicable.');
                } else {
                    setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'No code available for this node.' }));
                }
                return;
            }

            // Ensure the node has a valid declaration type
            if (!nodeData.data.label) {
                alert('Selected node lacks necessary information for code insertion.');
                console.error('Incomplete node data:', nodeData);
                return;
            }

            setSelectedNode({
                id: nodeId,
                code: nodeData.data.code,
                label: nodeData.data.label,
                filePath: nodeData.data.filePath,
                declarationInfo: {
                    name: nodeData.data.label,
                    startPosition: nodeData.data.startPosition,
                    endPosition: nodeData.data.endPosition,
                },
            });

            // Fetch the entire file content
            if (nodeData.data.filePath) {
                try {
                    const response = await ipcRenderer.invoke('get-file-content', nodeData.data.filePath);
                    if (response.success) {
                        setFileCode(response.content);

                        // Extract code snippet between startPosition and endPosition
                        const lines = response.content.split('\n');
                        const { startPosition, endPosition } = nodeData.data;

                        // Adjusting rows if necessary (assuming zero-based)
                        const startRow = startPosition.row;
                        const endRow = endPosition.row;

                        // Validate row indices
                        if (
                            startRow < 0 ||
                            endRow >= lines.length ||
                            startRow > endRow
                        ) {
                            console.error('Invalid row indices for code snippet:', {
                                startRow,
                                endRow,
                                totalLines: lines.length,
                            });
                            alert('Invalid code snippet positions.');
                            setCodeSnippet('');
                            setEditedCode('');
                            return;
                        }

                        const snippetLines = lines.slice(startRow, endRow + 1);
                        const snippetCode = snippetLines.join('\n');

                        setCodeSnippet(snippetCode);
                        setEditedCode(snippetCode);
                        setIsCodeExpanded(false);
                    } else {
                        console.error('Error fetching file content:', response.error);
                        alert(`Failed to fetch file content: ${response.error}`);
                        setFileCode(''); // Clear fileCode if there's an error
                        setEditedCode('');
                    }
                } catch (error) {
                    console.error('Error invoking get-file-content:', error);
                    alert('An unexpected error occurred while fetching file content.');
                    setFileCode('');
                    setEditedCode('');
                }
            } else {
                setFileCode('');
                setEditedCode('');
            }

            setIsDrawerOpen(true);

            if (!aiDescriptions[nodeId]) {
                try {
                    const description = await getAIDescription(nodeData.data.label, nodeData.data.code);
                    setAIDescriptions((prev) => ({ ...prev, [nodeId]: description }));
                } catch (error) {
                    console.error('Error fetching AI description:', error);
                    setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'Failed to generate description.' }));
                }
            }
            setUnitTest('');
        },
        [aiDescriptions, results]
    );

    /**
     * Handles directory selection dialog confirmation.
     */
    const handleSelectDirectory = async () => {
        const selectedDir = await ipcRenderer.invoke('select-directory');
        if (selectedDir) {
            setWatchingDir(selectedDir);
            clear();
            setIsDirectoryDialogOpen(false);
        }
    };


    /**
     * Handles search form submission.
     * @param {Event} e - The form submission event.
     */
    const handleSearch = (e) => {
        e.preventDefault();

        if (!searchQuery) {
            setFocusNode(null);
            return;
        }

        const matchingNodes = results.nodes?.filter((node) =>
            node.data.label.toLowerCase().includes(searchQuery.toLowerCase())
        );


        if (matchingNodes) {
            setFocusNode(matchingNodes[0].id);
            setAllFilteredNodes(matchingNodes)
        } else {
            alert('Node not found');
        }
    };

    /**
     * Handles going to the next node that matches the search query
     */
    const handleNextSearchedNode = () => {
        const selectedNodeIndex = allFilteredNodes.indexOf(focusNode)
        console.log(selectedNodeIndex, allFilteredNodes, focusNode)
        setFocusNode(allFilteredNodes[selectedNodeIndex + 1])

    }

    /**
     * Generates a unit test for the edited code.
     */
    const handleGenerateUnitTest = async () => {
        if (!editedCode) {
            alert('No code available to generate unit test.');
            return;
        }
        try {
            const test = await generateUnitTest(editedCode);
            setUnitTest(test);
        } catch (error) {
            console.error('Error generating unit test:', error);
            alert('Failed to generate unit test.');
        }
    };

    /**
     * Handles resizing of the drawer.
     * @param {Event} event - The resize event.
     * @param {Object} param1 - The resize parameters.
     */
    const handleDrawerResize = (event, { size }) => {
        setDrawerWidth(size.width);
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedNode, handleSave]);

    return (
        <Box
            ref={containerRef}
            sx={{
                width: '100vw',
                height: '93vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
            }}
        >

            {/* Toolbar with Settings Icon */}
            <Toolbar sx={{ justifyContent: 'space-between' }} >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Settings IconButton to open Settings Panel */}
                    <Tooltip title="Settings">
                        <IconButton color="inherit" onClick={() => setIsSettingsPanelOpen(true)}>
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Select Directory">
                        <IconButton color="inherit" onClick={() => setIsDirectoryDialogOpen(true)}>
                            <FolderOpenIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Analyze">
                        <IconButton
                            color="inherit"
                            onClick={handleAnalyze}
                            disabled={!watchingDir || isLoading}
                        >
                            <PolylineOutlinedIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Clear Results">
                        <IconButton color="inherit" onClick={clear}>
                            <ClearAllIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Toggle View">
                        <IconButton
                            color="inherit"
                            onClick={() => setViewMode((prev) => (prev === 'map' ? 'tree' : 'map'))}
                        >
                            <SwapHorizIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Search Form */}
                <Box
                    component="form"
                    onSubmit={handleSearch}
                    sx={{
                        mx: 2,
                        p: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        width: 250,

                        borderRadius: 1,
                    }}
                >
                    <TextField
                        variant="standard"
                        placeholder="Search code..."
                        inputProps={{ 'aria-label': 'search code' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ ml: 1, flex: 1, px: 2, backgroundColor: theme.palette.background.paper }}
                        InputProps={{
                            disableUnderline: true,
                        }}

                    />
                    <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
                        <SearchIcon />
                    </IconButton>
                    <Button
                        onClick={handleNextSearchedNode}
                    >
                        next
                    </Button>
                    <Typography>
                        {allFilteredNodes.length}
                    </Typography>

                </Box>
            </Toolbar>

            {/* Main Content Area */}
            <Box sx={{ display: 'flex', flexGrow: 1, height: '100%', position: 'relative' }}>
                <Box sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
                    {isLoading ? (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '100%',
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    ) : (
                        <ReactFlowProvider>
                            <NodeClickContext.Provider value={handleNodeClick}>
                                <Box sx={{ height: '100%', p: 2 }}>
                                    {viewMode === 'map' ? (
                                        <CodeFlowChart
                                            key={watchingDir} // Force re-mount when directory changes
                                            data={results}
                                            focusNode={focusNode}
                                        />
                                    ) : (
                                        <Paper sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
                                            <BorderedTreeView
                                                key={watchingDir} // Force re-mount when directory changes
                                                data={results}
                                                onNodeClick={handleNodeClick}
                                            />
                                        </Paper>
                                    )}

                                </Box>
                            </NodeClickContext.Provider>
                        </ReactFlowProvider>
                    )}
                </Box>

                {isDrawerOpen && drawerHeight > 0 && (
                    <ResizableBox
                        width={drawerWidth}
                        height={drawerHeight}
                        minConstraints={[drawerMinWidth, drawerHeight]}
                        maxConstraints={[drawerMaxWidth, drawerHeight]}
                        axis="x"
                        resizeHandles={['w']}
                        onResize={handleDrawerResize}
                        handle={
                            <Box
                                sx={{
                                    width: '5px',
                                    cursor: 'col-resize',
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    zIndex: 1,
                                    backgroundColor: theme.palette.primary.main,
                                }}
                            />
                        }
                        sx={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            zIndex: 1300,
                        }}
                    >
                        <Paper
                            elevation={3}
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    p: 2,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography variant="h6">  {selectedNode?.label.substring(0, 10)}</Typography>
                                <IconButton onClick={() => setIsDrawerOpen(false)}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                            <Tabs value={activeTab} onChange={handleTabChange} centered>
                                <Tab icon={<DescriptionIcon />} label="Description" />
                                <Tab icon={<CodeIcon />} label="Code" />
                                <Tab icon={<BugReportIcon />} label="Unit Test" />
                            </Tabs>
                            <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
                                {activeTab === 0 && (
                                    <ReactMarkdown>
                                        {aiDescriptions[selectedNode?.id] || 'Loading description...'}
                                    </ReactMarkdown>
                                )}
                                {activeTab === 1 && (
                                    <>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleSave}
                                                startIcon={<SaveIcon />}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                onClick={() => {
                                                    setIsCodeExpanded(!isCodeExpanded);
                                                    setEditedCode(isCodeExpanded ? codeSnippet : fileCode);
                                                }}
                                            >
                                                {isCodeExpanded ? 'Show Snippet' : 'Expand Code'}
                                            </Button>
                                        </Box>
                                        {/* <Typography variant="caption" display="block" gutterBottom>
                                            {`Editing ${isCodeExpanded ? 'full file' : 'function or class'} "${selectedNode?.label.t}".`}
                                        </Typography> */}
                                        <Box sx={{ height: 300, mb: 2 }}>
                                            {editedCode && (
                                                <ErrorBoundary fallback={<div>Error loading code editor</div>}>
                                                    <CodeMirror

                                                        value={editedCode}
                                                        height="100%"
                                                        extensions={[javascript(), oneDark]}
                                                        onChange={(value, viewUpdate) => {
                                                            setEditedCode(value);
                                                        }}
                                                        theme={oneDark}
                                                    />
                                                </ErrorBoundary>
                                            )}
                                        </Box>
                                    </>
                                )}
                                {activeTab === 2 && (
                                    <>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleGenerateUnitTest}
                                            startIcon={<BugReportIcon />}
                                            sx={{ mb: 2 }}
                                        >
                                            Generate Unit Test
                                        </Button>
                                        {unitTest && (
                                            <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[100], mb: 2 }}>
                                                <Typography
                                                    variant="body2"
                                                    component="pre"
                                                    sx={{ whiteSpace: 'pre-wrap' }}
                                                >
                                                    {unitTest}
                                                </Typography>
                                            </Paper>
                                        )}
                                    </>
                                )}
                            </Box>
                        </Paper>
                    </ResizableBox>
                )}
            </Box>

            {/* Settings Panel Drawer */}
            <Drawer
                anchor="left"
                open={isSettingsPanelOpen}
                onClose={() => setIsSettingsPanelOpen(false)}

                PaperProps={{
                    sx: {
                        width: 400,
                        padding: theme.spacing(2),
                        backgroundColor: theme.palette.background,
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                    }}
                >
                    <Typography variant="h6">Settings</Typography>
                    <IconButton onClick={() => setIsSettingsPanelOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <List>

                    <ListItem>
                        <FormControlLabel
                            control={
                                <MuiSwitch
                                    checked={includeAnonymousFunctions}
                                    onChange={(e) => setIncludeAnonymousFunctions(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Include Anonymous Functions"
                        />
                    </ListItem>
                    <ListItem>
                        <TextField
                            label="Max Nodes"
                            type="number"
                            value={maxNodes}
                            onChange={(e) => setMaxNodes(Number(e.target.value))}
                            fullWidth
                        />
                    </ListItem>
                    <ListItem>
                        <TextField
                            label="Max Edges"
                            type="number"
                            value={maxEdges}
                            onChange={(e) => setMaxEdges(Number(e.target.value))}
                            fullWidth
                        />
                    </ListItem>
                    <ListItem>
                        <FormControlLabel
                            control={
                                <MuiSwitch
                                    checked={relationshipOrder === 'callerToCalled'}
                                    onChange={(e) => setRelationshipOrder(e.target.checked ? 'callerToCalled' : 'calledToCaller')}
                                    color="primary"
                                />
                            }
                            label="Caller to Called"
                        />
                    </ListItem>
                    {/* Add more session-related settings here if needed */}
                </List>
            </Drawer>

            {/* Directory Selection Dialog */}
            <Dialog
                open={isDirectoryDialogOpen}
                onClose={() => setIsDirectoryDialogOpen(false)}
            >
                <DialogTitle>Select Directory to Analyze</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Please select the directory containing the code you wish to analyze.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDirectoryDialogOpen(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleSelectDirectory} color="primary">
                        Select Directory
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Analyzer;
