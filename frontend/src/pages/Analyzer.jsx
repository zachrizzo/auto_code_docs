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
} from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    ClearAll as ClearAllIcon,
    SwapHoriz as SwapHorizIcon,
    Search as SearchIcon,
    Close as CloseIcon,
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

// CodeMirror imports
import CodeMirror, { lineNumbers, EditorView } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentOnInput } from '@codemirror/language';

import ReactMarkdown from 'react-markdown';

const { ipcRenderer } = window.electronAPI;

const drawerMinWidth = 300;
const drawerMaxWidth = 800;

const Analyzer = () => {
    const [results, setResults] = useState({});
    const [aiDescriptions, setAIDescriptions] = useState({});
    const [selectedNode, setSelectedNode] = useState(null);
    const [watchingDir, setWatchingDir] = useState('');
    const [viewMode, setViewMode] = useState('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [focusNodeId, setFocusNodeId] = useState(null);
    const [isDirectoryDialogOpen, setIsDirectoryDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedCode, setEditedCode] = useState('');
    const [unitTest, setUnitTest] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerWidth, setDrawerWidth] = useState(400);
    const [fileCode, setFileCode] = useState(''); // Entire file content
    const [codeSnippet, setCodeSnippet] = useState(''); // Code snippet
    const [isCodeExpanded, setIsCodeExpanded] = useState(false);
    const editorRef = useRef(null);
    const theme = useTheme();

    const handleAnalyze = useCallback(async () => {
        if (!watchingDir) {
            alert('Please select a directory to analyze.');
            return;
        }

        setIsLoading(true);

        try {
            const { analysisResults, graphData } = await ipcRenderer.invoke('analyze-directory', watchingDir);

            const parsedAnalysisResults = JSON.parse(analysisResults);
            const parsedGraphData = JSON.parse(graphData);

            setResults(parsedGraphData);
        } catch (error) {
            console.error('Renderer: Error during analysis:', error);
            alert('An error occurred during analysis. Please check the console for details.');
        } finally {
            setIsLoading(false);
        }
    }, [watchingDir]);

    const clear = () => {
        setAIDescriptions({});
        setResults({});
        setSelectedNode(null); // Uncommented to reset the selected node
        setEditedCode('');
        setUnitTest('');
        setIsDrawerOpen(false);
        setFileCode('');
        setCodeSnippet('');
        setIsCodeExpanded(false);
    };

    console.log('Selected Node:', selectedNode);

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

    useEffect(() => {
        ipcRenderer.on('file-changed', (event, { filePath, content }) => {
            handleAnalyze();
        });

        return () => {
            ipcRenderer.removeAllListeners('file-changed');
        };
    }, [handleAnalyze]);

    /**
     * Handles search form submission.
     * @param {Event} e - The form submission event.
     */
    const handleSearch = (e) => {
        e.preventDefault();

        if (!searchQuery) {
            setFocusNodeId(null);
            return;
        }

        const matchingNode = results.nodes?.find((node) =>
            node.data.label.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (matchingNode) {
            setFocusNodeId(matchingNode.id);
        } else {
            alert('Node not found');
        }
    };

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
            sx={{
                width: '100vw',
                height: '93vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',  // Add this line

            }}
        >
            {/* Controls */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Typography variant="h6" sx={{ flexGrow: 1, color: theme.palette.text }}>
                    Code Analyzer
                </Typography>
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
                        onClick={() => setViewMode(viewMode === 'map' ? 'tree' : 'map')}
                    >
                        <SwapHorizIcon />
                    </IconButton>
                </Tooltip>
                <Box
                    component="form"
                    onSubmit={handleSearch}
                    sx={{
                        mx: 2,
                        p: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        width: 250,
                    }}
                >
                    <TextField
                        variant="standard"
                        placeholder="Search code..."
                        inputProps={{ 'aria-label': 'search code' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ ml: 1, flex: 1, px: 2 }}
                        InputProps={{
                            disableUnderline: true,
                        }}
                    />
                    <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
                        <SearchIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Main Content and Resizable Drawer */}
            <Box sx={{ display: 'flex', flexGrow: 1, height: '100%', position: 'relative' }}>
                {/* Main Content */}
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
                                            data={results}
                                            focusNodeId={focusNodeId}
                                        />
                                    ) : (
                                        <Paper sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
                                            <BorderedTreeView data={results} onNodeClick={handleNodeClick} />
                                        </Paper>
                                    )}
                                </Box>
                            </NodeClickContext.Provider>
                        </ReactFlowProvider>
                    )}
                </Box>

                {/* Resizable Drawer */}
                {isDrawerOpen && (
                    <ResizableBox
                        width={drawerWidth}
                        height={Infinity}  // Change this line
                        minConstraints={[drawerMinWidth, 0]}
                        maxConstraints={[drawerMaxWidth, Infinity]}  // Change this line
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
                                    right: isDrawerOpen ? `${drawerWidth}px` : 0,
                                    bottom: 0,
                                    zIndex: 1,
                                    backgroundColor: theme.palette.divider,
                                }}
                            />
                        }
                        sx={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            zIndex: 1300,
                            height: '100%',

                        }}
                    >
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                backgroundColor: theme.palette.background.paper,
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
                                <Typography variant="h6">{selectedNode?.label}</Typography>
                                <IconButton onClick={() => setIsDrawerOpen(false)}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                            <Divider />
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSave}
                                sx={{ mb: 2, m: 2 }}
                            >
                                Save
                            </Button>

                            <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto', height: 'calc(100% - 10px)' }}>
                                <ReactMarkdown variant="body1" gutterBottom>
                                    {aiDescriptions[selectedNode?.id] || 'Loading description...'}
                                </ReactMarkdown>

                                <Typography variant="h6" gutterBottom>
                                    Code:
                                </Typography>

                                <Typography variant="caption">
                                    {`Editing ${isCodeExpanded ? 'full file' : 'function or class'} "${selectedNode?.label}".`}
                                </Typography>

                                <Box sx={{ height: 300, mb: 2 }}>
                                    {editedCode && (
                                        <ErrorBoundary fallback={<div>Error loading code editor</div>}>
                                            <CodeMirror
                                                value={editedCode}
                                                height="100%"
                                                extensions={[
                                                    javascript(),
                                                    lineNumbers(),
                                                    indentOnInput(), // Invoke the function
                                                    EditorView.lineWrapping,
                                                ]}
                                                theme={oneDark}
                                                onCreateEditor={(editor) => {
                                                    editorRef.current = editor;
                                                }}
                                                onChange={(value) => setEditedCode(value)}
                                            />

                                        </ErrorBoundary>
                                    )}
                                </Box>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => {
                                        if (isCodeExpanded) {
                                            // Switch to snippet view
                                            const lines = editedCode.split('\n');
                                            const { startPosition, endPosition } = selectedNode.declarationInfo;
                                            const snippetLines = lines.slice(startPosition.row, endPosition.row + 1);
                                            const snippetCode = snippetLines.join('\n');
                                            setEditedCode(snippetCode);
                                        } else {
                                            // Switch to full code view
                                            const lines = fileCode.split('\n');
                                            const { startPosition, endPosition } = selectedNode.declarationInfo;
                                            const editedLines = editedCode.split('\n');
                                            const beforeLines = lines.slice(0, startPosition.row);
                                            const afterLines = lines.slice(endPosition.row + 1);
                                            const newLines = [...beforeLines, ...editedLines, ...afterLines];
                                            const mergedCode = newLines.join('\n');
                                            setEditedCode(mergedCode);
                                        }
                                        setIsCodeExpanded(!isCodeExpanded);
                                    }}
                                    sx={{ mb: 2 }}
                                >
                                    {isCodeExpanded ? 'Show Snippet' : 'Expand Code'}
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleGenerateUnitTest}
                                    sx={{ mb: 2, ml: 2 }}
                                >
                                    Generate Unit Test
                                </Button>
                                {unitTest && (
                                    <>
                                        <Typography variant="h6" gutterBottom>
                                            Generated Unit Test:
                                        </Typography>
                                        <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', mb: 2 }}>
                                            <Typography
                                                variant="body2"
                                                component="pre"
                                                sx={{ whiteSpace: 'pre-wrap' }}
                                            >
                                                {unitTest}
                                            </Typography>
                                        </Paper>
                                    </>
                                )}
                            </Box>
                        </Box>
                    </ResizableBox>
                )}
            </Box>

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
};

export default Analyzer;
