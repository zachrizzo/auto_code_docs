import React, { useCallback, useEffect, useState } from 'react';
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
    const globalNodeColor = '#FF0000';
    const directRelationshipColor = '#000000';
    const indirectRelationshipColor = '#888888';

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const generateFlowElements = useCallback(() => {
        const initialNodes = [];
        const initialEdges = [];
        const grid = {};
        const gridSize = 50; // Size of each grid cell
        const nodeWidth = 180;
        const nodeHeight = 100;

        function occupyGrid(x, y, width, height) {
            for (let i = x; i < x + width; i += gridSize) {
                for (let j = y; j < y + height; j += gridSize) {
                    grid[`${Math.floor(i / gridSize)},${Math.floor(j / gridSize)}`] = true;
                }
            }
        }

        function findFreePosition(startX, startY) {
            let x = startX;
            let y = startY;
            while (true) {
                const key = `${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`;
                if (!grid[key]) {
                    occupyGrid(x, y, nodeWidth, nodeHeight);
                    return { x, y };
                }
                x += gridSize;
                if (x > 2000) { // Arbitrary limit, adjust as needed
                    x = 0;
                    y += gridSize;
                }
            }
        }

        function createNode(id, label, type, startX, startY) {
            const { x, y } = findFreePosition(startX, startY);
            return {
                id,
                data: { label },
                position: { x, y },
                style: { backgroundColor: getColorForType(type), color: '#fff', width: nodeWidth },
            };
        }

        function getColorForType(type) {
            switch (type) {
                case 'file': return fileNodeColor;
                case 'class': return classNodeColor;
                case 'function': return functionNodeColor;
                case 'method': return methodNodeColor;
                case 'global': return globalNodeColor;
                default: return '#000000';
            }
        }

        Object.entries(data).forEach(([fileName, fileData], fileIndex) => {
            const fileId = fileName;
            const fileNode = createNode(fileId, fileName, 'file', 0, fileIndex * 200);
            initialNodes.push(fileNode);

            let startX = fileNode.position.x + nodeWidth + gridSize;
            let startY = fileNode.position.y;

            // Create class nodes
            (fileData.classes || []).forEach((classObj) => {
                const classId = `${fileId}-${classObj.name}`;
                const classNode = createNode(classId, classObj.name, 'class', startX, startY);
                initialNodes.push(classNode);
                initialEdges.push({ id: `${fileId}-${classId}`, source: fileId, target: classId, type: 'bezier' });

                startY = classNode.position.y + nodeHeight + gridSize;

                // Create method nodes
                (classObj.methods || []).forEach((method) => {
                    const methodId = `${classId}-${method.name}`;
                    const methodNode = createNode(methodId, method.name, 'method', startX + nodeWidth + gridSize, startY);
                    initialNodes.push(methodNode);
                    initialEdges.push({ id: `${classId}-${methodId}`, source: classId, target: methodId, type: 'bezier' });
                    startY = methodNode.position.y + nodeHeight + gridSize;
                });
            });

            // Create function nodes
            (fileData.functions || []).forEach((func) => {
                const funcId = `${fileId}-${func.name}`;
                const funcNode = createNode(funcId, func.name, 'function', startX, startY);
                initialNodes.push(funcNode);
                initialEdges.push({ id: `${fileId}-${funcId}`, source: fileId, target: funcId, type: 'bezier' });
                startY = funcNode.position.y + nodeHeight + gridSize;
            });

            // Create edges for relationships (direct and indirect)
            ['directRelationships', 'indirectRelationships'].forEach((relationType) => {
                Object.entries(fileData[relationType] || {}).forEach(([source, targets]) => {
                    targets.forEach(target => {
                        const sourceId = `${fileId}-${source}`;
                        let targetId = `${fileId}-${target}`;

                        // Handle special cases
                        if (target === 'this.history.push') {
                            targetId = sourceId;
                        } else if (target === 'Error' || target === 'console.log') {
                            if (!initialNodes.some(node => node.id === targetId)) {
                                const globalNode = createNode(targetId, target, 'global', startX + 2 * (nodeWidth + gridSize), startY);
                                initialNodes.push(globalNode);
                                startY = globalNode.position.y + nodeHeight + gridSize;
                            }
                        }

                        if (sourceId && targetId) {
                            initialEdges.push({
                                id: `${sourceId}-${relationType}-${targetId}`,
                                source: sourceId,
                                target: targetId,
                                type: 'bezier',
                                animated: relationType === 'indirectRelationships',
                                style: { stroke: relationType === 'directRelationships' ? directRelationshipColor : indirectRelationshipColor },
                            });
                        }
                    });
                });
            });
        });

        setNodes(initialNodes);
        setEdges(initialEdges);
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
