import React, { useEffect, useState, useCallback } from "react";
import { Button, Container, Select, MenuItem, Typography, Box } from '@mui/material';
import BorderedTreeView from '../components/analyzer/TreeDocumentation.js';
import CodeFlowChart from '../components/analyzer/mindMap/CodeMap.jsx';
import { getAIDescription } from "../api/CodeDocumentation.js";

const { ipcRenderer } = window.electronAPI;

const Analyzer = () => {
    const [results, setResults] = useState({});
    const [aiDescriptions, setAIDescriptions] = useState({});
    const [selectedNode, setSelectedNode] = useState(null);
    const [watchingDir, setWatchingDir] = useState('/Users/zachrizzo/programing/auto_code_docs_app/testCode/languageTest');
    const [viewMode, setViewMode] = useState('map');


    const handleAnalyze = useCallback(async () => {
        if (!watchingDir) {
            alert('Please select a directory to analyze.');
            return;
        }

        try {
            const { analysisResults, graphData } = await ipcRenderer.invoke('analyze-directory', watchingDir);

            // Deserialize the received strings back to objects
            const parsedAnalysisResults = JSON.parse(analysisResults);
            const parsedGraphData = JSON.parse(graphData);

            console.log("Analysis Results:", parsedAnalysisResults);
            console.log("Graph Data:", parsedGraphData);
            setResults(parsedGraphData);
        } catch (error) {
            console.error("Renderer: Error during analysis:", error);
            alert("An error occurred during analysis. Please check the console for details.");
        }
    }, [watchingDir]);





    const clear = () => {
        setAIDescriptions({});
        setResults({});
    };

    const handleNodeClick = useCallback(async (nodeId) => {
        setSelectedNode(nodeId);

        if (!results || !Object.keys(results).length) {
            console.error("Results data is not properly loaded.");
            setAIDescriptions((prev) => ({ ...prev, [nodeId]: "Failed to load descriptions." }));
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
            setAIDescriptions((prev) => ({ ...prev, [nodeId]: "File data not found." }));
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
            setAIDescriptions((prev) => ({ ...prev, [nodeId]: "Node data not found." }));
            return;
        }

        if (!aiDescriptions[nodeId]) {
            try {
                const description = await getAIDescription(nodeData.name, nodeData.code);
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: description }));
            } catch (error) {
                console.error("Error fetching AI description:", error);
                setAIDescriptions((prev) => ({ ...prev, [nodeId]: "Failed to generate description." }));
            }
        }
    }, [aiDescriptions, results]);

    const handleSelectDirectory = async () => {
        const selectedDir = await ipcRenderer.invoke('select-directory');
        if (selectedDir) {
            setWatchingDir(selectedDir);
            clear();
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

    return (
        <Container>
            <Typography variant="h2">Code Analyzer</Typography>
            <Button variant="contained" color="primary" onClick={handleSelectDirectory}>
                Select Directory to Watch
            </Button>
            {watchingDir && (
                <Typography variant="body1" sx={{ my: 2 }}>
                    Watching directory: {watchingDir}
                </Typography>
            )}

            <Button variant="contained" color="primary" onClick={handleAnalyze}>
                Analyze
            </Button>
            <Button variant="contained" color="primary" onClick={clear} sx={{ ml: 2 }}>
                Clear Docs
            </Button>
            <Button
                variant="contained"
                color="secondary"
                onClick={() => setViewMode(viewMode === 'map' ? 'tree' : 'map')}
                sx={{ ml: 2 }}
            >
                Toggle to {viewMode === 'map' ? 'Tree View' : 'Map View'}
            </Button>
            <Box mt={4}>
                <Typography variant="h4">Code {viewMode === 'map' ? 'Flow Chart' : 'Tree View'}</Typography>
                {viewMode === 'map' ? (
                    <CodeFlowChart data={results} onNodeClick={handleNodeClick} />
                ) : (
                    <BorderedTreeView data={results} onNodeClick={handleNodeClick} />
                )}
            </Box>
            {
                selectedNode && (
                    <Box mt={4}>
                        <Typography variant="h5">{selectedNode}</Typography>
                        <Typography variant="body1">
                            {aiDescriptions[selectedNode] || "Loading description..."}
                        </Typography>
                    </Box>
                )
            }
        </Container>
    );
};

export default Analyzer;
