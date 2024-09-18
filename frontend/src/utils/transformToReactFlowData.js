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

function getFileName(path) {
    return path.split('/').pop();
}

export async function transformToReactFlowData(parsedData, maxNodes = 1000, maxEdges = 5000, progressCallback) {
    if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
        console.error('Invalid or empty parsed data:', parsedData);
        return { nodes: [], edges: [] };
    }

    const nodeSet = new Set();
    const nodeMap = new Map();
    const nodes = [];
    const edges = [];
    const queue = Object.entries(parsedData);
    const chunkSize = 100;

    while (queue.length > 0 && nodes.length < maxNodes && edges.length < maxEdges) {
        const chunk = queue.splice(0, chunkSize);
        await processChunk(chunk, nodes, edges, nodeSet, nodeMap, maxNodes, maxEdges);
        await new Promise(resolve => setTimeout(resolve, 0));

        if (progressCallback) {
            progressCallback({
                phase: 'processing',
                nodesProcessed: nodes.length,
                edgesProcessed: edges.length
            });
        }
    }

    console.log(`Processed ${nodes.length} nodes and ${edges.length} edges`);

    // Process in smaller batches for layout
    const batchSize = 200;
    const layoutedNodes = [];
    let batchCount = 0;

    for (let i = 0; i < nodes.length; i += batchSize) {
        const nodeBatch = nodes.slice(i, i + batchSize);
        const edgeBatch = edges.filter(e =>
            nodeBatch.some(n => n.id === e.source) && nodeBatch.some(n => n.id === e.target)
        );

        console.log(`Laying out batch ${++batchCount}: ${nodeBatch.length} nodes, ${edgeBatch.length} edges`);

        const graph = createElkGraph(nodeBatch, edgeBatch);
        const layoutedGraph = await elk.layout(graph);
        layoutedNodes.push(...applyLayout(nodeBatch, layoutedGraph));

        await new Promise(resolve => setTimeout(resolve, 0));

        if (progressCallback) {
            progressCallback({
                phase: 'layout',
                nodesLayouted: layoutedNodes.length,
                totalNodes: nodes.length
            });
        }
    }

    console.log(`Layout complete for ${layoutedNodes.length} nodes`);
    return { nodes: layoutedNodes, edges };
}

async function processChunk(chunk, nodes, edges, nodeSet, nodeMap, maxNodes, maxEdges) {
    for (const [fileName, fileData] of chunk) {
        if (nodes.length >= maxNodes || edges.length >= maxEdges) break;

        const fileNodeId = `file-${getFileName(fileName)}`;
        if (!nodeSet.has(fileNodeId)) {
            nodes.push(createNode(fileNodeId, getFileName(fileName)));
            nodeSet.add(fileNodeId);
            nodeMap.set(fileNodeId, nodes.length - 1);
        }

        for (const [id, declaration] of Object.entries(fileData.allDeclarations || {})) {
            if (nodes.length >= maxNodes) break;
            if (!nodeSet.has(id)) {
                nodes.push(createNode(id, declaration.name, declaration.code || ''));
                nodeSet.add(id);
                nodeMap.set(id, nodes.length - 1);
            }
        }

        processEdges(fileData, fileNodeId, edges, nodeSet, maxEdges);
    }
}

function processEdges(fileData, fileNodeId, edges, nodeSet, maxEdges) {
    const addEdge = (source, target, type) => {
        if (edges.length < maxEdges && nodeSet.has(source) && nodeSet.has(target)) {
            safeAddEdge(source, target, { type }, edges, nodeSet);
        }
    };

    (fileData.rootFunctionIds || []).forEach(id => addEdge(fileNodeId, id, 'declaration'));

    Object.entries(fileData.directRelationships || {}).forEach(([sourceId, targetIds]) => {
        if (Array.isArray(targetIds)) {
            targetIds.forEach(targetId => addEdge(sourceId, targetId, 'declaration'));
        }
    });

    Object.entries(fileData.functionCallRelationships || {}).forEach(([callerFunctionId, calledFunctionIds]) => {
        if (Array.isArray(calledFunctionIds)) {
            calledFunctionIds.forEach(calledFunctionId => {
                const type = fileData.functionCallRelationships[calledFunctionId]?.includes(callerFunctionId)
                    ? 'codependent'
                    : 'call';
                addEdge(callerFunctionId, calledFunctionId, type);
            });
        }
    });

    Object.entries(fileData.crossFileRelationships || {}).forEach(([sourceId, relationships]) => {
        if (Array.isArray(relationships)) {
            relationships.forEach(targetId => addEdge(sourceId, targetId, 'crossFileCall'));
        }
    });
}

function createNode(id, label, code) {
    const isDuplicate = /\(\d+\)$/.test(label); // Check if label ends with (number)
    return {
        id,
        data: {
            label,
            code,
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

function applyLayout(nodes, layoutedGraph) {
    return nodes.map((node, index) => ({
        ...node,
        position: getNodePosition(layoutedGraph, node.id, index),
    }));
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

function getNodePosition(layoutedGraph, nodeId, index) {
    const layoutedNode = layoutedGraph.children[index];
    return layoutedNode ? { x: layoutedNode.x, y: layoutedNode.y } : { x: 0, y: 0 };
}
