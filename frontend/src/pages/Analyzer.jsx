// Analyzer.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    AppBar,
    Toolbar,
    IconButton,
    Button,
    Container,
    Typography,
    Box,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputBase,
    Paper,
    Tooltip,
    Grid,
    useTheme,
    CircularProgress,
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

            if (!results || !Object.keys(results).length) {
                console.error('Results data is not properly loaded.');
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'Failed to load descriptions.' }));
                return;
            }

            let fileName, entityName, nodeData;

            // Check if this is a file node
            if (nodeId.startsWith('file-')) {
                fileName = nodeId.substring(5); // Remove 'file-' prefix
                entityName = 'file';
            } else {
                // This is a declaration node
                // Find the file that contains this declaration
                for (const [file, fileData] of Object.entries(results)) {
                    if (fileData.allDeclarations && fileData.allDeclarations[nodeId]) {
                        fileName = file;
                        entityName = fileData.allDeclarations[nodeId].name;
                        break;
                    }
                }
            }

            if (!fileName || !results[fileName]) {
                console.error(`File not found for nodeId: ${nodeId}`);
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'File data not found.' }));
                return;
            }

            const fileResults = results[fileName];

            if (entityName === 'file') {
                nodeData = { name: fileName, code: fileResults.code || '' };
            } else {
                nodeData = fileResults.allDeclarations[nodeId];
            }

            if (!nodeData) {
                console.error(`Node data not found for nodeId: ${nodeId}`);
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: 'Node data not found.' }));
                return;
            }

            if (!aiDescriptions[nodeId]) {
                try {
                    const description = await getAIDescription(nodeData.name, nodeData.code);
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

    const filteredResults = searchQuery
        ? Object.fromEntries(
            Object.entries(results).filter(([key]) =>
                key.toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
        : results;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* AppBar with toolbar */}
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Code Analyzer
                    </Typography>
                    <Tooltip title="Select Directory">
                        <IconButton color="inherit" onClick={() => setIsDirectoryDialogOpen(true)}>
                            <FolderOpenIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Analyze">
                        <IconButton color="inherit" onClick={handleAnalyze} disabled={!watchingDir || isLoading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Clear Results">
                        <IconButton color="inherit" onClick={clear}>
                            <ClearAllIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Toggle View">
                        <IconButton color="inherit" onClick={() => setViewMode(viewMode === 'map' ? 'tree' : 'map')}>
                            <SwapHorizIcon />
                        </IconButton>
                    </Tooltip>
                    <Paper
                        component="form"
                        sx={{ ml: 2, p: '2px 4px', display: 'flex', alignItems: 'center', width: 250 }}
                    >
                        <InputBase
                            sx={{ ml: 1, flex: 1 }}
                            placeholder="Search code..."
                            inputProps={{ 'aria-label': 'search code' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
                            <SearchIcon />
                        </IconButton>
                    </Paper>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Grid container sx={{ flexGrow: 1 }}>
                {/* Left Panel: Graph or Tree View */}
                <Grid item xs={12} md={8} sx={{ height: '100%', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', p: 2 }}>
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
                        ) : viewMode === 'map' ? (
                            <CodeFlowChart data={filteredResults} onNodeClick={handleNodeClick} />
                        ) : (
                            <Paper sx={{ height: '100%', overflowY: 'auto' }}>
                                <BorderedTreeView data={filteredResults} onNodeClick={handleNodeClick} />
                            </Paper>
                        )}
                    </Box>
                </Grid>

                {/* Right Panel: Selected Node Details */}
                <Grid item xs={12} md={4} sx={{ height: '100%', borderLeft: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
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
                </Grid>
            </Grid>

            {/* Directory Selection Dialog */}
            <Dialog open={isDirectoryDialogOpen} onClose={() => setIsDirectoryDialogOpen(false)}>
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
