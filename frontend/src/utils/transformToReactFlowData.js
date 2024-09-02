import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

// Configuration for the layout
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
};

export async function transformToReactFlowData(parsedData) {
    const nodes = [];
    const edges = [];
    const nodeSet = new Set();

    // Validating parsedData
    if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
        console.error('Invalid or empty parsed data:', parsedData);
        return { nodes, edges };
    }

    const getFileName = (path) => {
        const parts = path.split('/');
        return parts[parts.length - 1];
    };

    // Node creation
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        const fileNodeId = `file-${getFileName(fileName)}`;
        nodes.push(createNode(fileNodeId, getFileName(fileName)));
        nodeSet.add(fileNodeId);

        const allDeclarations = fileData.allDeclarations || {};
        for (const [id, declaration] of Object.entries(allDeclarations)) {
            const nodeLabel = declaration.name + (id.toLowerCase().includes('copy') ? ' (Duplicate)' : '');
            nodes.push(createNode(id, nodeLabel));
            nodeSet.add(id);
        }
    }

    // Edge creation
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        const fileNodeId = `file-${getFileName(fileName)}`;
        (fileData.rootFunctionIds || []).forEach(id =>
            safeAddEdge(fileNodeId, id, { type: 'declaration' }, edges, nodeSet));

        for (const [sourceId, targetIds] of Object.entries(fileData.directRelationships || {})) {
            if (Array.isArray(targetIds)) {
                targetIds.forEach(targetId =>
                    safeAddEdge(sourceId, targetId, { type: 'declaration' }, edges, nodeSet));
            }
        }

        const functionCallRelationships = fileData.functionCallRelationships || {};
        for (const [callerFunctionId, calledFunctionIds] of Object.entries(functionCallRelationships)) {
            if (Array.isArray(calledFunctionIds)) {
                calledFunctionIds.forEach(calledFunctionId => {
                    if (functionCallRelationships[calledFunctionId]?.includes(callerFunctionId)) {
                        safeAddEdge(callerFunctionId, calledFunctionId, { type: 'codependent' }, edges, nodeSet);
                    } else {
                        safeAddEdge(callerFunctionId, calledFunctionId, { type: 'call' }, edges, nodeSet);
                    }
                });
            }
        }
    }

    // Cross-file relationships
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        for (const [sourceId, relationships] of Object.entries(fileData.crossFileRelationships || {})) {
            if (Array.isArray(relationships)) {
                relationships.forEach(targetId => {
                    safeAddEdge(sourceId, targetId, { type: 'crossFileCall' }, edges, nodeSet);
                });
            }
        }
    }

    const graph = createElkGraph(nodes, edges);
    const layoutedGraph = await elk.layout(graph);

    const layoutedNodes = nodes.map(node => ({
        ...node,
        position: getNodePosition(layoutedGraph, node.id),
    }));

    console.log('Layouted Nodes:', layoutedNodes);

    return { nodes: layoutedNodes, edges };
}

// Helper functions
function createNode(id, label) {
    const isDuplicate = id.toLowerCase().includes('copy');
    return {
        id,
        data: {
            label,
            sourceHandles: ['a', 'b', 'c'].map(suffix => ({ id: `${id}-s-${suffix}` })),
            targetHandles: ['a', 'b', 'c'].map(suffix => ({ id: `${id}-t-${suffix}` })),
        },
        type: 'elk',
        position: { x: 0, y: 0 },
        style: isDuplicate ? {
            backgroundColor: 'red',
            color: 'white'
        } : {},
    };
}

function safeAddEdge(sourceId, targetId, options, edges, nodeSet) {
    if (nodeSet.has(sourceId) && nodeSet.has(targetId)) {
        const sourceHandle = `${sourceId}-s-${String.fromCharCode(97 + (edges.length % 3))}`;
        const targetHandle = `${targetId}-t-${String.fromCharCode(97 + (edges.length % 3))}`;
        edges.push({
            id: `${sourceId}-${targetId}${options.type ? `-${options.type}` : ''}`,
            source: sourceId,
            sourceHandle,
            target: targetId,
            targetHandle,
            animated: options.type === 'call' || options.type === 'crossFileCall',
            style: {
                stroke: getEdgeColor(options.type),
                strokeWidth: 2,
            },
            type: options.type === 'codependent' ? 'bidirectional' : 'custom',
            data: { label: options.type },
            markerEnd: options.type === 'codependent' ? 'url(#bidirectionalArrowEnd)' : undefined,
            markerStart: options.type === 'codependent' ? 'url(#bidirectionalArrowStart)' : undefined,
        });
    } else {
        console.warn(`Skipping edge creation: node not found. Source: ${sourceId}, Target: ${targetId}`);
    }
}

function getEdgeColor(type) {
    switch (type) {
        case 'call': return '#FFFF00';
        case 'crossFileCall': return '#ff0000';
        case 'codependent': return '#00FF00';
        default: return '#FFFFFF';
    }
}

function createElkGraph(nodes, edges) {
    return {
        id: 'root',
        layoutOptions,
        children: nodes.map(n => ({
            id: n.id,
            width: 300,
            height: 80,
            properties: { 'org.eclipse.elk.portConstraints': 'FIXED_SIDE' },
            ports: [
                ...n.data.targetHandles.map(t => ({ id: t.id, properties: { side: 'WEST' } })),
                ...n.data.sourceHandles.map(s => ({ id: s.id, properties: { side: 'EAST' } })),
            ],
        })),
        edges: edges.map(e => ({
            id: e.id,
            sources: [e.sourceHandle],
            targets: [e.targetHandle],
        })),
    };
}

function getNodePosition(layoutedGraph, nodeId) {
    const layoutedNode = layoutedGraph.children.find(n => n.id === nodeId);
    return layoutedNode ? { x: layoutedNode.x, y: layoutedNode.y } : { x: 0, y: 0 };
}
