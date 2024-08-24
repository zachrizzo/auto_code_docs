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

    // Function to get the file name from a path
    const getFileName = (path) => {
        const parts = path.split('/');
        return parts[parts.length - 1];
    };

    // First pass: Create all nodes
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        if (!fileData || typeof fileData !== 'object') {
            console.error('Invalid file data for:', fileName);
            continue;
        }

        const fileNodeId = `file-${getFileName(fileName)}`;
        nodes.push({
            id: fileNodeId,
            data: {
                label: getFileName(fileName),
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
        nodeSet.add(fileNodeId);

        const allDeclarations = fileData.allDeclarations || {};
        for (const [id, declaration] of Object.entries(allDeclarations)) {
            nodes.push({
                id: id,
                data: {
                    label: declaration.name,
                    sourceHandles: [
                        { id: `${id}-s-a` },
                        { id: `${id}-s-b` },
                        { id: `${id}-s-c` }
                    ],
                    targetHandles: [
                        { id: `${id}-t-a` },
                        { id: `${id}-t-b` },
                        { id: `${id}-t-c` }
                    ]
                },
                type: 'elk',
                position: { x: 0, y: 0 }
            });
            nodeSet.add(id);
        }
    }

    // Function to safely add edges
    const safeAddEdge = (sourceId, targetId, options = {}) => {
        if (nodeSet.has(sourceId) && nodeSet.has(targetId)) {
            const sourceHandle = `${sourceId}-s-${String.fromCharCode(97 + (edges.length % 3))}`;
            const targetHandle = `${targetId}-t-${String.fromCharCode(97 + (edges.length % 3))}`;
            edges.push({
                id: `${sourceId}-${targetId}${options.type ? `-${options.type}` : ''}`,
                source: sourceId,
                sourceHandle: sourceHandle,
                target: targetId,
                targetHandle: targetHandle,
                animated: options.type === 'call' || options.type === 'crossFileCall',
                style: {
                    stroke: options.type === 'call' ? '#ff0000' :
                        options.type === 'crossFileCall' ? '#FBFF00' : '#FFFFFF',
                    strokeWidth: 2,
                    strokeDasharray: (options.type === 'call' || options.type === 'crossFileCall') ? '5,5' : 'none',
                },
                type: 'default'
            });
        } else {
            console.warn(`Skipping edge creation: node not found. Source: ${sourceId}, Target: ${targetId}`);
        }
    };

    // Second pass: Create all edges
    // Second pass: Create all edges
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        const fileNodeId = `file-${getFileName(fileName)}`;
        const directRelationships = fileData.directRelationships || {};
        const rootFunctionIds = fileData.rootFunctionIds || [];

        // Add edges from file to root functions
        for (const id of rootFunctionIds) {
            safeAddEdge(fileNodeId, id, { type: 'declaration' });
        }

        // Add direct relationships (function declarations)
        for (const [sourceId, targetIds] of Object.entries(directRelationships)) {
            if (Array.isArray(targetIds)) {
                targetIds.forEach(targetId => safeAddEdge(sourceId, targetId, { type: 'declaration' }));
            }
        }

        // Add edges for methods to their parent class
        if (fileData.methods) {
            fileData.methods.forEach(method => {
                if (method.parentClassId) {
                    safeAddEdge(method.parentClassId, method.id, { type: 'declaration' });
                }
            });
        }

        // Add edges for function calls within the same file
        if (fileData.functionCalls) {
            for (const [calledFunctionId, callerIds] of Object.entries(fileData.functionCalls)) {
                if (Array.isArray(callerIds)) {
                    callerIds.forEach(callerId => {
                        if (callerId !== 'top-level') {
                            safeAddEdge(callerId, calledFunctionId, { type: 'call' });
                        }
                    });
                }
            }
        }

        // Add cross-file relationships
        if (fileData.crossFileRelationships) {
            for (const [entityType, entities] of Object.entries(fileData.crossFileRelationships)) {
                for (const [sourceId, targetIds] of Object.entries(entities)) {
                    if (Array.isArray(targetIds)) {
                        targetIds.forEach(targetId => safeAddEdge(sourceId, targetId, { type: 'crossFileCall' }));
                    }
                }
            }
        }
    }

    const graph = {
        id: 'root',
        layoutOptions: layoutOptions,
        children: nodes.map((n) => ({
            id: n.id,
            width: 300,
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
            position: layoutedNode ? { x: layoutedNode.x, y: layoutedNode.y } : { x: 0, y: 0 },
        };
    });

    console.log('Layouted Nodes:', layoutedNodes);

    return { nodes: layoutedNodes, edges: edges };
}
