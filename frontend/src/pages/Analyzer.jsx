// Analyzer.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    IconButton,
    Button,
    Typography,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Tooltip,
    CircularProgress,
    useTheme,
    Drawer,
} from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    ClearAll as ClearAllIcon,
    SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import BorderedTreeView from '../components/analyzer/TreeDocumentation';
import CodeFlowChart from '../components/analyzer/mindMap/CodeMap';
import { getAIDescription } from '../api/CodeDocumentation';

const { ipcRenderer } = window.electronAPI;

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
    const theme = useTheme();

    const handleAnalyze = useCallback(async () => {
        if (!watchingDir) {
            alert('Please select a directory to analyze.');
            return;
        }

        setIsLoading(true);

        try {
            const { analysisResults, graphData } = await ipcRenderer.invoke('analyze-directory', watchingDir);

            // Deserialize the received strings back to objects
            const parsedAnalysisResults = JSON.parse(analysisResults);
            const parsedGraphData = JSON.parse(graphData);

            console.log('Analysis Results:', parsedAnalysisResults);
            console.log('Graph Data:', parsedGraphData);
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
    };

    const handleNodeClick = useCallback(
        async (nodeId) => {
            setSelectedNode(nodeId);

            if (!results || !results.nodes || !results.edges) {
                console.error('Results data is not properly loaded.');
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'Failed to load descriptions.' }));
                return;
            }

            // Fetch node data
            const nodeData = results.nodes.find((node) => node.id === nodeId);

            if (!nodeData) {
                console.error(`Node data not found for nodeId: ${nodeId}`);
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'Node data not found.' }));
                return;
            }

            if (!aiDescriptions[nodeId]) {
                try {
                    const description = await getAIDescription(nodeData.data.label, nodeData.data.code || '');
                    setAIDescriptions((prev) => ({ ...prev, [nodeId]: description }));
                } catch (error) {
                    console.error('Error fetching AI description:', error);
                    setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'Failed to generate description.' }));
                }
            }
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
            console.log(`File changed: ${filePath}`);
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

        // Search for node
        const matchingNode = results.nodes?.find((node) =>
            node.data.label.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (matchingNode) {
            setFocusNodeId(matchingNode.id);
        } else {
            alert('Node not found');
        }
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
            <Box sx={{ flexGrow: 1 }}>
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
                    <Box sx={{ height: '100%', p: 2 }}>
                        {viewMode === 'map' ? (
                            <CodeFlowChart
                                data={results}
                                onNodeClick={handleNodeClick}
                                focusNodeId={focusNodeId}
                            />
                        ) : (
                            <Paper sx={{ height: '100%', overflowY: 'auto' }}>
                                <BorderedTreeView data={results} onNodeClick={handleNodeClick} />
                            </Paper>
                        )}
                    </Box>
                )}
            </Box>

            {/* Details Drawer */}
            <Drawer
                anchor="right"
                open={Boolean(selectedNode)}
                onClose={() => setSelectedNode(null)}
            >
                <Box sx={{ width: 350, p: 2 }}>
                    {selectedNode ? (
                        <>
                            <Typography variant="h6" gutterBottom>
                                Details for: {selectedNode}
                            </Typography>
                            <Typography variant="body1">
                                {aiDescriptions[selectedNode] || 'Loading description...'}
                            </Typography>
                        </>
                    ) : (
                        <Typography variant="body1" color="textSecondary">
                            Select a node to see details.
                        </Typography>
                    )}
                </Box>
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
