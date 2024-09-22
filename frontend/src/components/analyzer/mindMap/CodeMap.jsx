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
import ElkNode from '../mindMap/nodes/ElkNode';
import {
    DeclarationEdge,
    CallEdge,
    CrossFileCallEdge,
    CodependentEdge,
} from '../mindMap/edges/CustomEdges'; // Import custom edges
import { Box, CircularProgress, Paper } from '@mui/material';

const nodeTypes = {
    elk: ElkNode,
};

const edgeTypes = {
    declaration: DeclarationEdge,
    call: CallEdge,
    crossFileCall: CrossFileCallEdge,
    codependent: CodependentEdge,
    // Add more custom edge types if needed
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
        } else {
            setIsLoading(false);
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
                // Avoid using node.width and node.height directly as they might be undefined
                const x = node.position.x || 0;
                const y = node.position.y || 0;
                const zoom = 1.5;
                setCenter(x, y, { zoom, duration: 500 });
            }
        }
    }, [focusNodeId, getNode, setCenter]);

    if (isLoading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Paper
            elevation={3}
            sx={{ height: '100%', width: '100%', position: 'relative' }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                minZoom={0.1}
                maxZoom={4}
                attributionPosition="top-right"
            >
                <Background />
                <Controls />
                <MiniMap nodeStrokeColor={(n) => {
                    if (n.style?.backgroundColor) return n.style.backgroundColor;
                    return '#eee';
                }} />
                {/* Define arrow markers */}
                <defs>
                    <marker
                        id="arrowclosed"
                        viewBox="0 -5 10 10"
                        refX="10"
                        refY="0"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                    >
                        <path d="M0,-5L10,0L0,5" fill="#000" />
                    </marker>
                    <marker
                        id="bidirectionalArrowEnd"
                        viewBox="0 -5 10 10"
                        refX="10"
                        refY="0"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                    >
                        <path d="M0,-5L10,0L0,5" fill="#000" />
                    </marker>
                    <marker
                        id="bidirectionalArrowStart"
                        viewBox="10 -5 10 10"
                        refX="0"
                        refY="0"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                    >
                        <path d="M10,-5L0,0L10,5" fill="#000" />
                    </marker>
                </defs>

            </ReactFlow>
        </Paper>
    );
}

export default CodeFlowChart;
