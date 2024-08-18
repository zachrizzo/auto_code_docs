import React, { useCallback, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { transformToReactFlowData } from '../../utils/transformToReactFlowData'; // Import the transformation utility

function CodeFlowChart({ data, onNodeClick }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const generateFlowElements = useCallback(() => {
        const { nodes, edges } = transformToReactFlowData(data);
        setNodes(nodes);
        setEdges(edges);
    }, [data]);

    useEffect(() => {
        generateFlowElements();
    }, [generateFlowElements]);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div style={{ height: '700px', width: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => onNodeClick(node.id)}
                fitView
                attributionPosition="top-right"
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
}

export default CodeFlowChart;
