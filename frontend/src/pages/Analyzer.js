import React, { useEffect, useState, useCallback } from "react";
import { Button, Container, Select, MenuItem, Typography, Box } from '@mui/material';
import BorderedTreeView from '../components/analyzer/TreeDocumentation';
import CodeFlowChart from '../components/analyzer/mindMap/mindMap';
import { getAIDescription } from "../api/CodeDocumentation";
import { detectClassesAndFunctions, resolveCrossFileDependencies } from '../detector';
import { transformToReactFlowData } from '../utils/transformToReactFlowData'; // Import the transformation utility
const { ipcRenderer } = require('electron');
const fs = window.require('fs');
const path = window.require('path');

const Analyzer = () => {
    const [language, setLanguage] = useState('javascript');
    const [results, setResults] = useState({});
    const [aiDescriptions, setAIDescriptions] = useState({});
    const [selectedNode, setSelectedNode] = useState(null);
    const [watchingDir, setWatchingDir] = useState(null);
    const [viewMode, setViewMode] = useState('map');

    const handleAnalyze = useCallback(async () => {
        if (!watchingDir) {
            alert('Please select a directory to analyze.');
            return;
        }

        let aggregatedResults = {};

        const analyzeFile = async (filePath) => {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            const analysisResults = await detectClassesAndFunctions(language, fileContent, fileName);

            console.log(`Analysis results for ${fileName}:`, analysisResults);

            // Use filePath as the key to avoid overwriting
            aggregatedResults[filePath] = analysisResults;
        };

        const walkDirectory = (dir) => {
            const files = fs.readdirSync(dir);

            files.forEach((file) => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    walkDirectory(filePath);
                } else if (file.endsWith('.js') || file.endsWith('.py')) {
                    analyzeFile(filePath);
                }
            });
        };

        await walkDirectory(watchingDir);

        console.log("Aggregated Results Before Dependency Resolution:", aggregatedResults);

        // Resolve cross-file dependencies
        const resolvedResults = resolveCrossFileDependencies(aggregatedResults);

        console.log("Aggregated Results After Dependency Resolution:", resolvedResults);

        setResults(resolvedResults);
    }, [language, watchingDir]);


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
            <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
                sx={{ my: 10 }}
            >
                <MenuItem value="javascript">JavaScript</MenuItem>
                <MenuItem value="python">Python</MenuItem>
            </Select>
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
