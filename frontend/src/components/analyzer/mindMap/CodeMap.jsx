// CodeFlowChart.jsx
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

function CodeFlowChart({ data, onNodeClick, focusNodeId }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(true);

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
    }, [data]);

    useEffect(() => {
        if (data && (data.nodes || data.edges)) {
            generateFlowElements();
        }
    }, [data, generateFlowElements]);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

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
                onNodeClick={(_, node) => onNodeClick(node.id)}
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
                {/* Use the FlowUpdater component here */}
                <FlowUpdater focusNodeId={focusNodeId} />
            </ReactFlow>
            <Box position="absolute" top={10} left={10} zIndex={1000}>
                <Typography variant="h6" component="div">
                    Code Flow Chart
                </Typography>
            </Box>
        </Paper>
    );
}

function FlowUpdater({ focusNodeId }) {
    const { setCenter, getNode } = useReactFlow();

    useEffect(() => {
        if (focusNodeId) {
            const node = getNode(focusNodeId);
            if (node && node.position) {
                const x = node.position.x + (node.width || 0) / 2;
                const y = node.position.y + (node.height || 0) / 2;
                const zoom = 1.5;
                setCenter(x, y, { zoom, duration: 500 });
            }
        }
    }, [focusNodeId, getNode, setCenter]);

    return null;
}

export default CodeFlowChart;
