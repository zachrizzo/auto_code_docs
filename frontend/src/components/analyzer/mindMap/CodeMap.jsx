// src/components/analyzer/mindMap/CodeMap.jsx
import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ElkNode from './nodes/ElkNode';
import CustomEdge from './edges/CustomEdge';
import BidirectionalEdge from './edges/BidirectionalEdge';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';

const nodeTypes = {
    elk: ElkNode,
};

const edgeTypes = {
    custom: CustomEdge,
    bidirectional: BidirectionalEdge,
};

function CodeFlowChart({ data, focusNodeId }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { setCenter, getNode } = useReactFlow();

    const generateFlowElements = useCallback(() => {
        try {
            // Directly use nodes and edges from data
            const processedNodes = data.nodes || [];
            const processedEdges = data.edges || [];

            setNodes(processedNodes);
            setEdges(processedEdges);
        } catch (error) {
            console.error('Error generating flow elements:', error);
        }
        setIsLoading(false);
    }, [data, setNodes, setEdges]);

    useEffect(() => {
        if (data && (data.nodes || data.edges)) {
            generateFlowElements();
        }
    }, [data, generateFlowElements]);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    useEffect(() => {
        if (focusNodeId) {
            const node = getNode(focusNodeId);
            if (node && node.position) {
                const x = node.position.x;
                const y = node.position.y;
                const zoom = 1.5;
                setCenter(x, y, { zoom, duration: 500 });
            }
        }
    }, [focusNodeId, getNode, setCenter]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Paper elevation={3} sx={{ height: '100%', width: '100%', position: 'relative' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                minZoom={0.5}
                maxZoom={2}
                attributionPosition="top-right"
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
            <Box position="absolute" top={10} left={10} zIndex={1000}>
                <Typography variant="h6" component="div">
                    Code Flow Chart
                </Typography>
            </Box>
        </Paper>
    );
}

export default CodeFlowChart;
