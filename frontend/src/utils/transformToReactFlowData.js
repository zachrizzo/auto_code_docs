export function transformToReactFlowData(parsedData) {
    const nodes = [];
    const edges = [];

    if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
        console.error('Invalid or empty parsed data:', parsedData);
        return { nodes, edges };
    }

    // Iterate over each file in the parsed data
    for (const [fileName, fileData] of Object.entries(parsedData)) {
        if (!fileData || typeof fileData !== 'object') {
            console.error('Invalid file data for:', fileName);
            continue;
        }

        const allDeclarations = fileData.allDeclarations || {};
        const directRelationships = fileData.directRelationships || {};
        const indirectRelationships = fileData.indirectRelationships || {};

        // Create nodes for each declaration
        for (const [id, declaration] of Object.entries(allDeclarations)) {
            nodes.push({
                id: id,
                data: { label: declaration.name },
                position: { x: Math.random() * 400, y: Math.random() * 400 }
            });
        }

        // Helper function to add edges
        const addEdges = (sourceId, targetIds, isIndirect = false) => {
            targetIds.forEach(targetId => {
                if (targetId && targetId !== "undefined") {
                    edges.push({
                        id: `${sourceId}-${targetId}${isIndirect ? '-indirect' : ''}`,
                        source: sourceId,
                        target: targetId,
                        animated: isIndirect,
                        style: isIndirect ? { stroke: '#f6ab6c' } : {}
                    });
                }
            });
        };

        // Create edges for direct relationships
        for (const [sourceId, targetIds] of Object.entries(directRelationships)) {
            addEdges(sourceId, targetIds);
        }

        // Create edges for indirect relationships
        for (const [sourceId, targetIds] of Object.entries(indirectRelationships)) {
            addEdges(sourceId, targetIds, true);
        }
    }

    return { nodes, edges };
}
