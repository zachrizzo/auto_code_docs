// src/utils/transformToReactFlowData.js
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const layoutOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.spacing.nodeNode': '90',
    'elk.layered.spacing.nodeNodeBetweenLayers': '200',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.spacing.edgeNodeBetweenLayers': '80',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.layering.strategy': 'LONGEST_PATH',
    'elk.spacing.component': '100',
    'elk.layered.nodePlacement.gap': '50',
    'elk.layered.considerSelfLoops': 'true',
};

function getFileName(path) {
    return path.split('/').pop();
}

export async function transformToReactFlowData(
    parsedData,
    maxNodes = 1000,
    maxEdges = 5000,
    relationshipOrder,
    progressCallback,


) {
    if (
        !parsedData ||
        typeof parsedData !== 'object' ||
        Object.keys(parsedData).length === 0
    ) {
        console.error('Invalid or empty parsed data:', parsedData);
        return { nodes: [], edges: [] };
    }

    const nodeSet = new Set();
    const nodeMap = new Map();
    const nodes = [];
    const edges = [];
    const queue = Object.entries(parsedData);
    const chunkSize = 100;

    while (
        queue.length > 0 &&
        nodes.length < maxNodes &&
        edges.length < maxEdges
    ) {
        const chunk = queue.splice(0, chunkSize);
        await processChunk(
            chunk,
            nodes,
            edges,
            nodeSet,
            nodeMap,
            maxNodes,
            maxEdges,
            relationshipOrder
        );
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (progressCallback) {
            progressCallback({
                phase: 'processing',
                nodesProcessed: nodes.length,
                edgesProcessed: edges.length,
            });
        }
    }

    console.log(`Processed ${nodes.length} nodes and ${edges.length} edges`);

    // Proceed to layout the entire graph
    try {
        const graph = createElkGraph(nodes, edges);
        console.log('Starting ELK layout');
        const layoutedGraph = await elk.layout(graph);
        console.log('ELK layout complete');

        const layoutedNodes = layoutedGraph.children.map((n) => {
            const originalNode = nodes.find(node => node.id === n.id);
            if (!originalNode) {
                console.warn(`Node with ID ${n.id} not found in nodes array.`);
                return null;
            }
            return {
                ...originalNode,
                position: { x: n.x || 0, y: n.y || 0 }, // Ensure x and y are numbers
                // Optionally, store width and height if needed
            };
        }).filter(Boolean); // Remove any null entries

        console.log(`Layouted ${layoutedNodes.length} nodes`);

        return { nodes: layoutedNodes, edges };
    } catch (error) {
        console.error('ELK layout error:', error);
        return { nodes, edges };
    }
}

async function processChunk(
    chunk,
    nodes,
    edges,
    nodeSet,
    nodeMap,
    maxNodes,
    maxEdges,
    relationshipOrder
) {
    for (const [fileName, fileData] of chunk) {
        if (nodes.length >= maxNodes || edges.length >= maxEdges) break;

        const fileNodeId = `file-${getFileName(fileName)}`;
        if (!nodeSet.has(fileNodeId)) {
            nodes.push(
                createNode(
                    fileNodeId,
                    getFileName(fileName),
                    '',
                    fileName,
                    null,
                    null
                )
            );
            nodeSet.add(fileNodeId);
            nodeMap.set(fileNodeId, nodes.length - 1);
        }

        for (const [id, declaration] of Object.entries(fileData.allDeclarations || {})) {
            if (nodes.length >= maxNodes) break;
            if (!nodeSet.has(id)) {
                nodes.push(
                    createNode(
                        id,
                        declaration.name,
                        declaration.code || '',
                        fileName,
                        declaration.startPosition,
                        declaration.endPosition
                    )
                );
                nodeSet.add(id);
                nodeMap.set(id, nodes.length - 1);
            }
        }

        processEdges(fileData, fileNodeId, edges, nodeSet, maxEdges, relationshipOrder);
    }
}

function processEdges(fileData, fileNodeId, edges, nodeSet, maxEdges, relationshipOrder) {
    const addEdge = (source, target, type) => {
        if (edges.length < maxEdges && nodeSet.has(source) && nodeSet.has(target)) {
            // For call and crossFileCall, we'll reverse the source and target
            if (relationshipOrder && (type === 'call' || type === 'crossFileCall')) {
                safeAddEdge(target, source, { type }, edges, nodeSet);
            } else {
                safeAddEdge(source, target, { type }, edges, nodeSet);
            }
        }
    };

    (fileData.rootFunctionIds || []).forEach((id) => addEdge(fileNodeId, id, 'declaration'));

    Object.entries(fileData.directRelationships || {}).forEach(([sourceId, targetIds]) => {
        if (Array.isArray(targetIds)) {
            targetIds.forEach((targetId) => addEdge(sourceId, targetId, 'declaration'));
        }
    });

    Object.entries(fileData.functionCallRelationships || {}).forEach(([callerFunctionId, calledFunctionIds]) => {
        if (Array.isArray(calledFunctionIds)) {
            calledFunctionIds.forEach((calledFunctionId) => {
                addEdge(callerFunctionId, calledFunctionId, 'call');
            });
        }
    });

    Object.entries(fileData.crossFileRelationships || {}).forEach(([sourceId, relationships]) => {
        if (Array.isArray(relationships)) {
            relationships.forEach((targetId) => addEdge(sourceId, targetId, 'crossFileCall'));
        }
    });
}

function createNode(id, label, code, filePath, startPosition, endPosition) {
    const isDuplicate = /\(\d+\)$/.test(label); // Check if label ends with (number)
    return {
        id,
        data: {
            label,
            code,
            filePath: filePath || '',
            startPosition,
            endPosition,
            // Remove sourceHandles and targetHandles as nodes now have single handles
        },
        type: 'elk', // Ensure this matches nodeTypes in React Flow
        position: { x: 0, y: 0 }, // Initial position, to be updated by layout
        style: isDuplicate
            ? {
                backgroundColor: 'red',
                color: 'white',
            }
            : {},
    };
}

function safeAddEdge(sourceId, targetId, options, edges, nodeSet) {
    if (nodeSet.has(sourceId) && nodeSet.has(targetId)) {
        const edgeId = `${sourceId}-${targetId}${options.type ? `-${options.type}` : ''}`;

        // Prevent duplicate edges
        if (edges.some((edge) => edge.id === edgeId)) {
            return;
        }

        edges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            animated: options.type === 'call' || options.type === 'crossFileCall',
            style: {
                stroke: getEdgeColor(options.type),
                strokeWidth: 2,
            },
            type: options.type, // Custom edge type
            data: { label: options.type },
            markerEnd:
                options.type === 'codependent'
                    ? 'url(#bidirectionalArrowEnd)'
                    : 'url(#arrowclosed)',
            markerStart:
                options.type === 'codependent'
                    ? 'url(#bidirectionalArrowStart)'
                    : undefined,
        });
    } else {
        console.warn(
            `Skipping edge creation: node not found. Source: ${sourceId}, Target: ${targetId}`
        );
    }
}

function getEdgeColor(type) {
    switch (type) {
        case 'call':
            return '#FFFF00'; // Yellow
        case 'crossFileCall':
            return '#ff0000'; // Red
        case 'codependent':
            return '#00FF00'; // Green
        default:
            return '#FFFFFFFF'; // Black
    }
}

function createElkGraph(nodes, edges) {
    return {
        id: 'root',
        layoutOptions,
        children: nodes.map((n) => ({
            id: n.id,
            width: 300, // Adjust as needed or make dynamic
            height: 80, // Adjust as needed or make dynamic
            properties: { 'org.eclipse.elk.portConstraints': 'FREE' }, // Changed to 'FREE' for simplicity
        })),
        edges: edges.map((e) => ({
            id: e.id,
            sources: [e.source], // Changed from e.sourceHandle
            targets: [e.target], // Changed from e.targetHandle
        })),
    };
}
