// src/pages/Analyzer.jsx
import React, { useEffect, useState, useCallback } from 'react';
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
    Grid,
    Drawer,
    Divider,
} from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    Refresh as RefreshIcon,
    ClearAll as ClearAllIcon,
    SwapHoriz as SwapHorizIcon,
    Search as SearchIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import BorderedTreeView from '../components/analyzer/TreeDocumentation';
import CodeFlowChart from '../components/analyzer/mindMap/CodeMap';
import { getAIDescription, generateUnitTest } from '../api/CodeDocumentation';
import NodeClickContext from '../contexts/NodeClickContext'; // Ensure the path is correct
import { ReactFlowProvider } from 'reactflow';
import { useTheme } from '@mui/material/styles';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

// CodeMirror imports
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

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
        setSelectedNode(null);
        setEditedCode('');
        setUnitTest('');
        setIsDrawerOpen(false);
    };

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
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'No code available for this node.' }));
                return;
            }
            setSelectedNode({ id: nodeId, code: nodeData.data.code, label: nodeData.data.label });
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
            setEditedCode(nodeData.data.code);
            setUnitTest('');
        },
        [aiDescriptions, results]
    );

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

    const handleDrawerResize = (event, { size }) => {
        setDrawerWidth(size.width);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Controls */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: theme.palette.background.paper,
                }}
            >
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Code Analyzer
                </Typography>
                <Tooltip title="Select Directory">
                    <IconButton color="primary" onClick={() => setIsDirectoryDialogOpen(true)}>
                        <FolderOpenIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Analyze">
                    <IconButton
                        color="primary"
                        onClick={handleAnalyze}
                        disabled={!watchingDir || isLoading}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Clear Results">
                    <IconButton color="primary" onClick={clear}>
                        <ClearAllIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Toggle View">
                    <IconButton
                        color="primary"
                        onClick={() => setViewMode(viewMode === 'map' ? 'tree' : 'map')}
                    >
                        <SwapHorizIcon />
                    </IconButton>
                </Tooltip>
                <Paper
                    component="form"
                    onSubmit={handleSearch}
                    sx={{
                        ml: 2,
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
                        sx={{ ml: 1, flex: 1 }}
                    />
                    <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
                        <SearchIcon />
                    </IconButton>
                </Paper>
            </Box>

            {/* Main Content */}
            <Grid container sx={{ flexGrow: 1 }}>
                <Grid item xs={12} sx={{ height: '100%' }}>
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
                </Grid>
            </Grid>

            {/* Details Drawer */}
            <Drawer
                anchor="right"
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                variant="persistent"
                PaperProps={{
                    sx: {
                        width: drawerWidth,
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                <ResizableBox
                    width={drawerWidth}
                    height={Infinity}
                    minConstraints={[drawerMinWidth, 0]}
                    maxConstraints={[drawerMaxWidth, Infinity]}
                    axis="x"
                    onResize={handleDrawerResize}
                    handle={
                        <Box
                            sx={{
                                width: '10px',
                                cursor: 'col-resize',
                                padding: '4px 0 0',
                                borderTop: '1px solid #ddd',
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 100,
                            }}
                        />
                    }
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #ddd' }}>
                        <Typography variant="h6">{selectedNode?.label}</Typography>
                        <IconButton onClick={() => setIsDrawerOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Divider />
                    <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
                        <Typography variant="body1" gutterBottom>
                            {aiDescriptions[selectedNode?.id] || 'Loading description...'}
                        </Typography>
                        <Typography variant="h6" gutterBottom>
                            Code:
                        </Typography>
                        <Box sx={{ height: 300, mb: 2 }}>
                            <CodeMirror
                                value={editedCode}
                                height="100%"
                                extensions={[javascript()]}
                                onChange={(value) => setEditedCode(value)}
                            />
                        </Box>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleGenerateUnitTest}
                            sx={{ mb: 2 }}
                        >
                            Generate Unit Test
                        </Button>
                        {unitTest && (
                            <>
                                <Typography variant="h6" gutterBottom>
                                    Generated Unit Test:
                                </Typography>
                                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', mb: 2 }}>
                                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {unitTest}
                                    </Typography>
                                </Paper>
                            </>
                        )}
                    </Box>
                </ResizableBox>
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
};

export default Analyzer;
