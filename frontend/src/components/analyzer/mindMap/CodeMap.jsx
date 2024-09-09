// CodeFlowChart.js
import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ElkNode from './nodes/ElkNode.jsx';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import CustomEdge from './edges/CustomEdge.jsx';
import BidirectionalEdge from './edges/BidirectionalEdge.js';

const nodeTypes = {
    elk: ElkNode,
};
const edgeTypes = {
    custom: CustomEdge,
    bidirectional: BidirectionalEdge,
};

const BidirectionalArrowDefs = () => (
    <svg>
        <defs>
            <marker
                id="bidirectionalArrowEnd"
                viewBox="-10 -10 20 20"
                refX="15"
                refY="0"
                markerWidth="12"
                markerHeight="12"
                orient="auto"
            >
                <path d="M-10,-10 L0,0 L-10,10" fill="#00FF00" />
            </marker>
            <marker
                id="bidirectionalArrowStart"
                viewBox="-10 -10 20 20"
                refX="-15"
                refY="0"
                markerWidth="12"
                markerHeight="12"
                orient="auto"
            >
                <path d="M10,-10 L0,0 L10,10" fill="#00FF00" />
            </marker>
        </defs>
    </svg>
);

function CodeFlowChart({ data, onNodeClick }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(true);

    const generateFlowElements = useCallback(async () => {
        setIsLoading(true);
        try {
            // Process your data prop here
            const processedNodes = data.nodes.map(node => ({
                id: node.id,
                type: 'elk',
                position: node.position || { x: 0, y: 0 },
                data: { label: node.data.label, ...node.data }
            }));

            const processedEdges = data.edges.map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: 'custom',
                animated: edge.animated,
                style: edge.style,
                data: edge.data
            }));

            setNodes(processedNodes);
            setEdges(processedEdges);
        } catch (error) {
            console.error("Error generating flow elements:", error);
        }
        setIsLoading(false);
    }, [data]);

    useEffect(() => {
        generateFlowElements();
    }, [generateFlowElements]);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="700px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Paper elevation={3} sx={{ height: '700px', width: '100%' }}>
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
                attributionPosition="top-right"
            >
                <Background />
                <Controls />
                <MiniMap />
                <BidirectionalArrowDefs />
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
