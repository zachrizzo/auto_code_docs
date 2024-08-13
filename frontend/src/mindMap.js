import React, { useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function CodeFlowChart({ data, onNodeClick }) {
    const fileNodeColor = '#FFA500';
    const classNodeColor = '#4CAF50';
    const functionNodeColor = '#2196F3';
    const methodNodeColor = '#9C27B0';

    const initialNodes = [];
    const initialEdges = [];

    Object.entries(data).forEach(([fileName, fileData], fileIndex) => {
        initialNodes.push({
            id: fileName,
            data: { label: fileName },
            position: { x: fileIndex * 1200, y: 0 },
            style: { backgroundColor: fileNodeColor, color: '#fff', width: 180 },
        });

        // Create class nodes
        (fileData.classes || []).forEach((classObj, classIndex) => {
            const classId = `${fileName}-${classObj.name}`;
            initialNodes.push({
                id: classId,
                data: { label: classObj.name },
                position: { x: fileIndex * 1200, y: 300 + classIndex * 750 },
                style: { backgroundColor: classNodeColor, color: '#fff', width: 150 },
            });
            initialEdges.push({
                id: `${fileName}-${classId}`,
                source: fileName,
                target: classId,
                type: 'smoothstep',
            });

            // Create method nodes
            (classObj.methods || []).forEach((method, methodIndex) => {
                const methodId = `${classId}-${method.name}`;
                initialNodes.push({
                    id: methodId,
                    data: { label: method.name },
                    position: { x: fileIndex * 1200 + (methodIndex % 2) * 450, y: 600 + classIndex * 750 + Math.floor(methodIndex / 2) * 240 },
                    style: { backgroundColor: methodNodeColor, color: '#fff', width: 120 },
                });
                initialEdges.push({
                    id: `${classId}-${methodId}`,
                    source: classId,
                    target: methodId,
                    type: 'smoothstep',
                });
            });
        });

        // Create function nodes
        (fileData.functions || []).forEach((func, funcIndex) => {
            const funcId = `${fileName}-${func.name}`;
            initialNodes.push({
                id: funcId,
                data: { label: func.name },
                position: { x: fileIndex * 1200 + (funcIndex % 2) * 450, y: 1050 + Math.floor(funcIndex / 2) * 240 },
                style: { backgroundColor: functionNodeColor, color: '#fff', width: 120 },
            });
            initialEdges.push({
                id: `${fileName}-${funcId}`,
                source: fileName,
                target: funcId,
                type: 'smoothstep',
            });
        });

        // Create edges for imports
        Object.entries(fileData.imports || {}).forEach(([importSource, importedNames]) => {
            importedNames.forEach(importedName => {
                const targetId = initialNodes.find(n => n.data.label === importedName)?.id;
                if (targetId) {
                    initialEdges.push({
                        id: `${fileName}-import-${importedName}`,
                        source: fileName,
                        target: targetId,
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#FF0000' },
                    });
                }
            });
        });
    });

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const nodeClassName = (node) => node.type;

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
                <MiniMap
                    nodeStrokeColor={(n) => {
                        if (n.style?.backgroundColor) return n.style.backgroundColor;
                        return '#000';
                    }}
                    nodeColor={(n) => {
                        return n.style?.backgroundColor || '#fff';
                    }}
                    nodeClassName={nodeClassName}
                />
            </ReactFlow>
        </div>
    );
}

export default CodeFlowChart;
