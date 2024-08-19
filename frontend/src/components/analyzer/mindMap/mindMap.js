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
import { transformToReactFlowData } from '../../../utils/transformToReactFlowData';
import ElkNode from './nodes/ElkNode';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import CustomEdge from './edges/CustomEdge';

const nodeTypes = {
    elk: ElkNode,
};
const edgeTypes = {
    custom: CustomEdge,
};

function CodeFlowChart({ data, onNodeClick }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(true);

    const generateFlowElements = useCallback(async () => {
        setIsLoading(true);
        try {
            const { nodes, edges } = await transformToReactFlowData(data);
            setNodes(nodes);
            setEdges(edges);
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

                fitView
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
