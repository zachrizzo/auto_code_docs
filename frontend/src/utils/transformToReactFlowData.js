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

function detectConnectedComponents(nodes, edges) {
    const nodeIds = nodes.map((node) => node.id);
    const adjacencyList = new Map();
    const visited = new Set();
    const components = [];

    // Initialize adjacency list
    nodeIds.forEach((id) => {
        adjacencyList.set(id, []);
    });

    // Build adjacency list
    edges.forEach((edge) => {
        adjacencyList.get(edge.source).push(edge.target);
        adjacencyList.get(edge.target).push(edge.source);
    });

    // Function to perform DFS and collect nodes and edges in a component
    function dfs(nodeId, componentNodes, componentEdges) {
        visited.add(nodeId);
        componentNodes.push(nodeId);

        adjacencyList.get(nodeId).forEach((neighborId) => {
            const edgeId = `${nodeId}-${neighborId}`;
            const reverseEdgeId = `${neighborId}-${nodeId}`;

            if (!componentEdges.has(edgeId) && !componentEdges.has(reverseEdgeId)) {
                componentEdges.add(edgeId);
            }

            if (!visited.has(neighborId)) {
                dfs(neighborId, componentNodes, componentEdges);
            }
        });
    }

    // Find connected components
    nodeIds.forEach((nodeId) => {
        if (!visited.has(nodeId)) {
            const componentNodes = [];
            const componentEdges = new Set();

            dfs(nodeId, componentNodes, componentEdges);

            components.push({
                nodes: componentNodes,
                edges: Array.from(componentEdges),
            });
        }
    });

    return components;
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

    // Detect connected components
    const components = detectConnectedComponents(nodes, edges);

    console.log(`Detected ${components.length} connected components`);

    // Layout each component
    const layoutedNodes = [];
    let cumulativeOffset = { x: 0, y: 0 };
    const componentsPerRow = 5; // Adjust as needed
    let rowHeight = 0;
    let componentIndex = 0;

    for (const component of components) {
        componentIndex++;

        // Get nodes and edges for the component
        const componentNodes = nodes.filter((node) => component.nodes.includes(node.id));
        const componentEdges = edges.filter((edge) =>
            component.edges.includes(`${edge.source}-${edge.target}`) ||
            component.edges.includes(`${edge.target}-${edge.source}`)
        );

        console.log(
            `Laying out component ${componentIndex}: ${componentNodes.length} nodes, ${componentEdges.length} edges`
        );

        const graph = createElkGraph(componentNodes, componentEdges);

        try {
            const layoutedGraph = await elk.layout(graph);
            const { nodes: positionedNodes, width, height } = applyLayoutWithOffset(
                componentNodes,
                layoutedGraph,
                cumulativeOffset
            );

            layoutedNodes.push(...positionedNodes);

            // Update cumulative offset
            cumulativeOffset.x += width + 100; // Adjust spacing as needed
            rowHeight = Math.max(rowHeight, height);

            // Move to next row after specified number of components per row
            if (componentIndex % componentsPerRow === 0) {
                cumulativeOffset.x = 0;
                cumulativeOffset.y += rowHeight + 100; // Adjust spacing as needed
                rowHeight = 0;
            }

            // Update progress
            if (progressCallback) {
                progressCallback({
                    phase: 'layout',
                    nodesLayouted: layoutedNodes.length,
                    totalNodes: nodes.length,
                });
            }
        } catch (error) {
            console.error(`ELK layout error for component ${componentIndex}:`, error);
        }
    }

    console.log(
        `Layout complete for ${layoutedNodes.length} nodes with cumulative offsets`
    );

    // No need to adjust edges here; edges between components are already in the edges array
    return { nodes: layoutedNodes, edges };
}

async function processChunk(chunk, nodes, edges, nodeSet, nodeMap, maxNodes, maxEdges) {
    for (const [fileName, fileData] of chunk) {
        if (nodes.length >= maxNodes || edges.length >= maxEdges) break;

        const fileNodeId = `file-${getFileName(fileName)}`;
        if (!nodeSet.has(fileNodeId)) {
            nodes.push(
                createNode(fileNodeId, getFileName(fileName), '', fileName, null, null)
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

        processEdges(fileData, fileNodeId, edges, nodeSet, maxEdges);
    }
}

function processEdges(fileData, fileNodeId, edges, nodeSet, maxEdges) {
    const addEdge = (source, target, type) => {
        if (edges.length < maxEdges && nodeSet.has(source) && nodeSet.has(target)) {
            safeAddEdge(source, target, { type }, edges, nodeSet);
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
                const type = fileData.functionCallRelationships[calledFunctionId]?.includes(callerFunctionId)
                    ? 'codependent'
                    : 'call';
                addEdge(callerFunctionId, calledFunctionId, type);
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
            sourceHandles: ['a', 'b', 'c'].map((suffix) => ({
                id: `${id}-s-${suffix}`,
            })),
            targetHandles: ['a', 'b', 'c'].map((suffix) => ({
                id: `${id}-t-${suffix}`,
            })),
        },
        type: 'elk',
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
            animated:
                options.type === 'call' || options.type === 'crossFileCall',
            style: {
                stroke: getEdgeColor(options.type),
                strokeWidth: 2,
            },
            type: options.type, // Use the edge type directly
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

function applyLayoutWithOffset(nodes, layoutedGraph, offset) {
    const layoutMap = new Map();
    layoutedGraph.children.forEach((n) => {
        layoutMap.set(n.id, { x: n.x, y: n.y });
    });

    let maxWidth = 0;
    let maxHeight = 0;

    const positionedNodes = nodes.map((node) => {
        const layoutedNode = layoutMap.get(node.id);
        if (!layoutedNode) {
            console.warn(`Node ${node.id} not found in layoutedGraph`);
            return node;
        }

        const position = {
            x: layoutedNode.x + offset.x,
            y: layoutedNode.y + offset.y,
        };

        maxWidth = Math.max(maxWidth, layoutedNode.x + 300); // Adjust node width as needed
        maxHeight = Math.max(maxHeight, layoutedNode.y + 80); // Adjust node height as needed

        return {
            ...node,
            position,
        };
    });

    return { nodes: positionedNodes, width: maxWidth, height: maxHeight };
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
            return '#FFFFFFFF'; // Blue for declaration or others
    }
}

function createElkGraph(nodes, edges) {
    return {
        id: 'root',
        layoutOptions,
        children: nodes.map((n) => ({
            id: n.id,
            width: 300, // Or use actual node width if available
            height: 80, // Or use actual node height if available
            properties: { 'org.eclipse.elk.portConstraints': 'FREE' },
        })),
        edges: edges.map((e) => ({
            id: e.id,
            sources: [e.source],
            targets: [e.target],
        })),
    };
}
