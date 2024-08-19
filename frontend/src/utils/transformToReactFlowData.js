import ELK from 'elkjs/lib/elk.bundled.js';


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
    const nodeSet = new Set();

    if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
        console.error('Invalid or empty parsed data:', parsedData);
        return { nodes, edges };
    }

    // First pass: Create all nodes
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
                id: `${sourceId}-${targetId}${options.isIndirect ? '-indirect' : ''}${options.isCrossFile ? '-crossfile' : ''}`,
                source: sourceId,
                sourceHandle: sourceHandle,
                target: targetId,
                targetHandle: targetHandle,
                animated: options.isIndirect || options.isCrossFile,
                style: options.isIndirect ? { stroke: '#f6ab6c' } :
                    options.isCrossFile ? { stroke: '#ff0000' } : {},
                type: 'default'
            });
        } else {
            console.warn(`Skipping edge creation: node not found. Source: ${sourceId}, Target: ${targetId}`);
        }
    };

    // Second pass: Create all edges
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        const fileNodeId = `file-${fileName}`;
        const directRelationships = fileData.directRelationships || {};
        const indirectRelationships = fileData.indirectRelationships || {};
        const rootFunctionIds = fileData.rootFunctionIds || [];

        for (const id of rootFunctionIds) {

            safeAddEdge(fileNodeId, id);

        }


        // Add direct relationships
        for (const [sourceId, targetIds] of Object.entries(directRelationships)) {
            targetIds.forEach(targetId => safeAddEdge(sourceId, targetId));
        }

        // Add indirect relationships
        for (const [sourceId, targetIds] of Object.entries(indirectRelationships)) {
            targetIds.forEach(targetId => safeAddEdge(sourceId, targetId, { isIndirect: true }));
        }

        // Add cross-file relationships
        if (fileData.crossFileRelationships) {
            for (const [entityType, entities] of Object.entries(fileData.crossFileRelationships)) {
                for (const [sourceId, targetIds] of Object.entries(entities)) {
                    targetIds.forEach(targetId => safeAddEdge(sourceId, targetId, { isCrossFile: true }));
                }
            }
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
            position: layoutedNode ? { x: layoutedNode.x, y: layoutedNode.y } : { x: 0, y: 0 },
        };
    });

    console.log('Layouted Nodes:', layoutedNodes);

    return { nodes: layoutedNodes, edges: edges };
}
