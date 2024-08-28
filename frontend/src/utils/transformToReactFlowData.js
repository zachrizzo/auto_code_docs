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
};

export async function transformToReactFlowData(parsedData) {
    const nodes = [];
    const edges = [];
    const nodeSet = new Set();

    if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
        console.error('Invalid or empty parsed data:', parsedData);
        return { nodes, edges };
    }

    const getFileName = (path) => {
        const parts = path.split('/');
        return parts[parts.length - 1];
    };

    // Create nodes
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        if (!fileData || typeof fileData !== 'object') {
            console.error('Invalid file data for:', fileName);
            continue;
        }

        const fileNodeId = `file-${getFileName(fileName)}`;
        nodes.push(createNode(fileNodeId, getFileName(fileName)));
        nodeSet.add(fileNodeId);

        const allDeclarations = fileData.allDeclarations || {};
        for (const [id, declaration] of Object.entries(allDeclarations)) {
            nodes.push(createNode(id, declaration.name));
            nodeSet.add(id);
        }
    }

    // Create edges
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        const fileNodeId = `file-${getFileName(fileName)}`;

        // Add edges from file to root functions and classes
        (fileData.rootFunctionIds || []).forEach(id =>
            safeAddEdge(fileNodeId, id, { type: 'declaration' }, edges, nodeSet));

        // Add this new section to connect file nodes to class nodes
        (fileData.classes || []).forEach(classData => {
            if (classData.id) {
                safeAddEdge(fileNodeId, classData.id, { type: 'declaration' }, edges, nodeSet);
            }
        });

        // Add direct relationships
        for (const [sourceId, targetIds] of Object.entries(fileData.directRelationships || {})) {
            if (Array.isArray(targetIds)) {
                targetIds.forEach(targetId =>
                    safeAddEdge(sourceId, targetId, { type: 'declaration' }, edges, nodeSet));
            }
        }

        // Add edges for methods to their parent class
        (fileData.methods || []).forEach(method => {
            if (method.parentClassId) {
                safeAddEdge(method.parentClassId, method.id, { type: 'declaration' }, edges, nodeSet);
            }
        });


        // Add edges for function calls
        for (const [calledFunctionId, callerIds] of Object.entries(fileData.functionCallRelationships || {})) {
            if (Array.isArray(callerIds)) {
                callerIds.forEach(callerId => {
                    if (callerId !== 'top-level') {
                        safeAddEdge(calledFunctionId, callerId, { type: 'call' }, edges, nodeSet);
                    }
                });
            }
        }

        // Add cross-file relationships (flipped)
        for (const [entityType, entities] of Object.entries(fileData.crossFileRelationships || {})) {
            for (const [sourceId, targetIds] of Object.entries(entities)) {
                if (Array.isArray(targetIds)) {
                    targetIds.forEach(targetId =>
                        safeAddEdge(targetId, sourceId, { type: 'crossFileCall' }, edges, nodeSet));
                }
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

function createNode(id, label) {
    return {
        id,
        data: {
            label,
            sourceHandles: ['a', 'b', 'c'].map(suffix => ({ id: `${id}-s-${suffix}` })),
            targetHandles: ['a', 'b', 'c'].map(suffix => ({ id: `${id}-t-${suffix}` })),
        },
        type: 'elk',
        position: { x: 0, y: 0 },
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
                strokeDasharray: (options.type === 'call' || options.type === 'crossFileCall') ? '5,5' : 'none',
            },
            type: 'default',
        });
    } else {
        console.warn(`Skipping edge creation: node not found. Source: ${sourceId}, Target: ${targetId}`);
    }
}

function getEdgeColor(type) {
    switch (type) {
        case 'call': return '#ff0000';
        case 'crossFileCall': return '#FBFF00';
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
