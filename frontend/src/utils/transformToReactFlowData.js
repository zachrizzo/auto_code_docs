import ELK from 'elkjs/lib/elk.bundled.js';


// function arrangeNodesBasedOnRelationships(nodes, edges) {
//     const levelMap = new Map();
//     const nodeMap = new Map(nodes.map(node => [node.id, node]));
//     const nodePadding = 20;

//     // Helper function to get or create a level
//     function getLevel(depth) {
//         if (!levelMap.has(depth)) {
//             levelMap.set(depth, []);
//         }
//         return levelMap.get(depth);
//     }

//     // Depth-first search to assign levels
//     function dfs(nodeId, depth = 0) {
//         const node = nodeMap.get(nodeId);
//         if (node.level !== undefined) return;

//         node.level = depth;
//         getLevel(depth).push(node);

//         const children = edges.filter(edge => edge.source === nodeId).map(edge => edge.target);
//         children.forEach(childId => dfs(childId, depth + 1));
//     }

//     // Start DFS from root nodes (nodes with no incoming edges)
//     const rootNodes = nodes.filter(node => !edges.some(edge => edge.target === node.id));
//     rootNodes.forEach(node => dfs(node.id));

//     // Position nodes
//     const horizontalSpacing = 200;
//     const verticalSpacing = 250;

//     levelMap.forEach((nodesInLevel, level) => {
//         const levelWidth = (nodesInLevel.length - 1) * horizontalSpacing;
//         nodesInLevel.forEach((node, index) => {
//             node.position = {
//                 x: (index * horizontalSpacing) - (levelWidth / 2),
//                 y: level * verticalSpacing
//             };
//         });
//     });

//     // Edge avoidance mechanism
//     function checkAndAvoidEdgeOverlap() {

//         nodes.forEach(node => {
//             const nodeBoundingBox = {
//                 x1: node.position.x - nodePadding,
//                 y1: node.position.y - nodePadding,
//                 x2: node.position.x + nodePadding,
//                 y2: node.position.y + nodePadding,
//             };

//             edges.forEach(edge => {
//                 const sourceNode = nodeMap.get(edge.source);
//                 const targetNode = nodeMap.get(edge.target);

//                 if (!sourceNode || !targetNode) return;

//                 const edgeLine = {
//                     x1: sourceNode.position.x,
//                     y1: sourceNode.position.y,
//                     x2: targetNode.position.x,
//                     y2: targetNode.position.y,
//                 };

//                 if (isNodeOverlappingEdge(nodeBoundingBox, edgeLine)) {
//                     // Adjust node position to avoid overlap
//                     node.position.x += horizontalSpacing / 2;
//                     node.position.y += verticalSpacing / 2;
//                 }
//             });
//         });
//     }

//     // Function to check if a node overlaps with an edge
//     function isNodeOverlappingEdge(nodeBox, edgeLine) {
//         // Check if any of the node box corners are close to the edge line
//         return (
//             isPointNearLine(nodeBox.x1, nodeBox.y1, edgeLine) ||
//             isPointNearLine(nodeBox.x2, nodeBox.y2, edgeLine) ||
//             isPointNearLine(nodeBox.x1, nodeBox.y2, edgeLine) ||
//             isPointNearLine(nodeBox.x2, nodeBox.y1, edgeLine)
//         );
//     }

//     // Helper function to check if a point is near a line
//     function isPointNearLine(x, y, line) {
//         const distance = Math.abs(
//             (line.y2 - line.y1) * x -
//             (line.x2 - line.x1) * y +
//             line.x2 * line.y1 -
//             line.y2 * line.x1
//         ) / Math.sqrt(
//             Math.pow(line.y2 - line.y1, 2) + Math.pow(line.x2 - line.x1, 2)
//         );
//         return distance < nodePadding;
//     }

//     // Run the edge overlap check and adjustment
//     checkAndAvoidEdgeOverlap();

//     return nodes;
// }

// // function arrangeNodesBasedOnRelationships(nodes, edges) {
// //     const nodeArray = Array.isArray(nodes) ? nodes : Object.values(nodes);
// //     const nodeMap = new Map(nodeArray.map(node => [node.id, node]));

// //     // Group nodes by file
// //     const fileGroups = {};
// //     nodeArray.forEach(node => {
// //         if (node.id.startsWith('file-')) {
// //             fileGroups[node.id] = [node];
// //         }
// //     });

// //     // Assign nodes to their respective file groups
// //     edges.forEach(edge => {
// //         const sourceNode = nodeMap.get(edge.source);
// //         const targetNode = nodeMap.get(edge.target);
// //         if (sourceNode && targetNode) {
// //             const fileNode = sourceNode.id.startsWith('file-') ? sourceNode : targetNode;
// //             const otherNode = sourceNode.id.startsWith('file-') ? targetNode : sourceNode;
// //             if (fileGroups[fileNode.id] && !fileGroups[fileNode.id].includes(otherNode)) {
// //                 fileGroups[fileNode.id].push(otherNode);
// //             }
// //         }
// //     });

// //     const levelHeight = 200;
// //     const nodeWidth = 150;
// //     const nodeHeight = 40;
// //     const horizontalSpacing = 50;

// //     let globalYOffset = 0;

// //     Object.entries(fileGroups).forEach(([fileId, groupNodes]) => {
// //         const fileNode = groupNodes[0];
// //         const relatedNodes = groupNodes.slice(1);

// //         // Position file node
// //         fileNode.position = { x: 0, y: globalYOffset };

// //         // Position related nodes in a grid layout
// //         const cols = Math.ceil(Math.sqrt(relatedNodes.length));
// //         const rows = Math.ceil(relatedNodes.length / cols);

// //         relatedNodes.forEach((node, index) => {
// //             const row = Math.floor(index / cols);
// //             const col = index % cols;
// //             node.position = {
// //                 x: (col - (cols - 1) / 2) * (nodeWidth + horizontalSpacing),
// //                 y: globalYOffset + levelHeight + row * (nodeHeight + 20)
// //             };
// //         });

// //         globalYOffset += levelHeight + rows * (nodeHeight + 20) + 100; // Extra space between file groups
// //     });

// //     // Edge routing
// //     function routeEdges() {
// //         edges.forEach(edge => {
// //             const source = nodeMap.get(edge.source);
// //             const target = nodeMap.get(edge.target);
// //             if (source && target && source.position && target.position) {
// //                 const midX = (source.position.x + target.position.x) / 2;
// //                 const midY = (source.position.y + target.position.y) / 2;

// //                 const controlPoint1 = {
// //                     x: midX,
// //                     y: source.position.y + (target.position.y - source.position.y) / 4
// //                 };

// //                 const controlPoint2 = {
// //                     x: midX,
// //                     y: target.position.y - (target.position.y - source.position.y) / 4
// //                 };

// //                 edge.controlPoints = [controlPoint1, controlPoint2];
// //             }
// //         });
// //     }

// //     routeEdges();

// //     return { nodes: nodeArray, edges };
// // }

const elk = new ELK();


const layoutOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.spacing.nodeNode': '90',  // Increased from 40
    'elk.layered.spacing.nodeNodeBetweenLayers': '200',  // Added this option
    'elk.edgeRouting': 'ORTHOGONAL',  // Changed from default to reduce edge crossings
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',  // Changed from SIMPLE for better placement
    'elk.layered.spacing.edgeNodeBetweenLayers': '80',  // Increased from 40
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',  // Added to maintain a logical order
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',  // Added to reduce crossings
    'elk.layered.layering.strategy': 'LONGEST_PATH',  // Added to reduce edge length
};

export async function transformToReactFlowData(parsedData) {
    const nodes = [];
    const edges = [];

    if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
        console.error('Invalid or empty parsed data:', parsedData);
        return { nodes, edges };
    }

    for (const [fileName, fileData] of Object.entries(parsedData)) {
        if (!fileData || typeof fileData !== 'object') {
            console.error('Invalid file data for:', fileName);
            continue;
        }

        const fileNodeId = `file-${fileName}`;
        nodes.push({
            id: fileNodeId,
            data: {
                label: fileName,
                sourceHandles: [
                    { id: `${fileNodeId}-s-a` },
                    { id: `${fileNodeId}-s-b` },
                    { id: `${fileNodeId}-s-c` }
                ],
                targetHandles: [
                    { id: `${fileNodeId}-t-a` },
                    { id: `${fileNodeId}-t-b` },
                    { id: `${fileNodeId}-t-c` }
                ]
            },
            type: 'elk',
            position: { x: 0, y: 0 }
        });

        const allDeclarations = fileData.allDeclarations || {};
        const directRelationships = fileData.directRelationships || {};
        const indirectRelationships = fileData.indirectRelationships || {};

        for (const [id, declaration] of Object.entries(allDeclarations)) {
            const fileNodeId = `file-${fileName}`;
            nodes.push({
                id: fileNodeId,
                data: {
                    label: fileName,
                    sourceHandles: [
                        { id: `${fileNodeId}-s-a` },
                        { id: `${fileNodeId}-s-b` },
                        { id: `${fileNodeId}-s-c` }
                    ],
                    targetHandles: [
                        { id: `${fileNodeId}-t-a` },
                        { id: `${fileNodeId}-t-b` },
                        { id: `${fileNodeId}-t-c` }
                    ]
                },
                type: 'elk',
                position: { x: 0, y: 0 }
            });


            edges.push({
                id: `${fileNodeId}-${id}`,
                source: fileNodeId,
                sourceHandle: `${fileNodeId}-s-a`,
                target: id,
                targetHandle: `${id}-t-a`,
                type: 'bezier'
            });
        }

        const addEdges = (sourceId, targetIds, isIndirect = false) => {
            targetIds.forEach((targetId, index) => {
                if (targetId && targetId !== "undefined") {
                    const sourceHandle = `${sourceId}-s-${String.fromCharCode(97 + (index % 3))}`;
                    const targetHandle = `${targetId}-t-${String.fromCharCode(97 + (index % 3))}`;
                    edges.push({
                        id: `${sourceId}-${targetId}${isIndirect ? '-indirect' : ''}`,
                        source: sourceId,
                        sourceHandle: sourceHandle,
                        target: targetId,
                        targetHandle: targetHandle,
                        animated: isIndirect,
                        style: isIndirect ? { stroke: '#f6ab6c' } : {},
                        type: 'bezier'
                    });
                }
            });
        };

        const addCrossFileEdges = (fileNodeId, crossFileRelationships) => {
            for (const [entityType, entities] of Object.entries(crossFileRelationships)) {
                for (const [sourceId, targets] of Object.entries(entities)) {
                    for (const [targetId, targetFile] of Object.entries(targets)) {
                        const sourceNode = nodes.find(n => n.id === sourceId);
                        const targetFileNode = nodes.find(n => n.id === `file-${targetFile}`);
                        if (sourceNode && targetFileNode) {
                            edges.push({
                                id: `${sourceId}-${targetFileNode.id}-crossfile`,
                                source: sourceId,
                                sourceHandle: `${sourceId}-s-a`,
                                target: targetFileNode.id,
                                targetHandle: `${targetFileNode.id}-t-a`,
                                type: 'bezier',
                                animated: true,
                                style: { stroke: '#ff0000' } // Red color for cross-file relationships
                            });
                        } else {
                            console.warn(`Could not find nodes for cross-file edge: ${sourceId} -> ${targetFile}`);
                        }
                    }
                }
            }
        };

        for (const [sourceId, targetIds] of Object.entries(directRelationships)) {
            addEdges(sourceId, targetIds);
        }

        for (const [sourceId, targetIds] of Object.entries(indirectRelationships)) {
            addEdges(sourceId, targetIds, true);
        }

        // Add cross-file relationship edges
        if (fileData.crossFileRelationships) {
            addCrossFileEdges(fileNodeId, fileData.crossFileRelationships);
        }

    }

    const graph = {
        id: 'root',
        layoutOptions: layoutOptions,
        children: nodes.map((n) => ({
            id: n.id,
            width: 200,
            height: 80,
            properties: {
                'org.eclipse.elk.portConstraints': 'FIXED_SIDE',
            },
            ports: [
                ...(n.data.targetHandles || []).map((t) => ({
                    id: t.id,
                    properties: { side: 'WEST' },
                })),
                ...(n.data.sourceHandles || []).map((s) => ({
                    id: s.id,
                    properties: { side: 'EAST' },
                })),
            ],
        })),
        edges: edges.map((e) => ({
            id: e.id,
            sources: [e.sourceHandle],
            targets: [e.targetHandle],
        })),
    };

    const layoutedGraph = await elk.layout(graph);


    const layoutedNodes = nodes.map((node) => {
        const layoutedNode = layoutedGraph.children.find((n) => n.id === node.id);
        return {
            ...node,
            position: { x: layoutedNode.x, y: layoutedNode.y },
        };
    });

    console.log('Layouted Nodes:', layoutedNodes);


    return { nodes: layoutedNodes, edges: edges };
}
