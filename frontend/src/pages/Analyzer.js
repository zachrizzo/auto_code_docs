import React, { useEffect, useState, useCallback } from "react";
import { Button, Container, Select, MenuItem, Typography, Box } from '@mui/material';
import { getAIDescription } from "../api/CodeDocumentation";
import { detectClassesAndFunctions } from '../detector';
import CodeFlowChart from '../mindMap';
const { ipcRenderer } = require('electron');
const fs = window.require('fs');
const path = window.require('path');

const Analyzer = () => {
    const [language, setLanguage] = useState('javascript');
    const [results, setResults] = useState({});

    const [aiDescriptions, setAIDescriptions] = useState({});
    const [selectedNode, setSelectedNode] = useState(null);
    const [watchingDir, setWatchingDir] = useState(null);

    const handleAnalyze = async () => {
        if (!watchingDir) {
            alert('Please select a directory to analyze.');
            return;
        }

        let aggregatedResults = {};

        const analyzeFile = async (filePath) => {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            const analysisResults = await detectClassesAndFunctions(language, fileContent, fileName);
            aggregatedResults[fileName] = analysisResults;
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
        setResults(aggregatedResults);

        console.log("Aggregated Results:", aggregatedResults); // Debugging: Log results
    };

    const clear = () => {
        setAIDescriptions({});
        setResults({
            classes: [],
            functions: [],
            classNames: [],
            functionNames: [],
            relationships: {},
        });
    };

    const handleNodeClick = useCallback(async (nodeId) => {
        setSelectedNode(nodeId);

        if (!results || !Object.keys(results).length) {
            console.error("Results data is not properly loaded.");
            setAIDescriptions((prev) => ({ ...prev, [nodeId]: "Failed to load descriptions." }));
            return;
        }

        // Split the nodeId into file name and function/method name
        const [fileName, entityName] = nodeId.split('-');

        if (!results[fileName]) {
            console.error(`File ${fileName} not found in results.`);
            setAIDescriptions((prev) => ({ ...prev, [nodeId]: "File data not found." }));
            return;
        }

        const fileResults = results[fileName];
        let nodeData = null;

        // Search for the entity in functions
        nodeData = fileResults.functions.find(func => func.name === entityName);

        if (!nodeData) {
            console.error(`Node data not found for nodeId: ${nodeId}`);
            setAIDescriptions((prev) => ({ ...prev, [nodeId]: "Node data not found." }));
            return;
        }

        if (!aiDescriptions[nodeId]) {
            try {
                const description = await getAIDescription(entityName, nodeData.code);
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
            clear(); // Clear previous analysis results
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
            <Box mt={4}>
                <Typography variant="h4">Code Flow Chart</Typography>
                <CodeFlowChart data={results} onNodeClick={handleNodeClick} />
            </Box>
            {selectedNode && (
                <Box mt={4}>
                    <Typography variant="h5">{selectedNode}</Typography>
                    <Typography variant="body1">
                        {aiDescriptions[selectedNode] || "Loading description..."}
                    </Typography>
                </Box>
            )}
        </Container>
    );
}

export default Analyzer;
