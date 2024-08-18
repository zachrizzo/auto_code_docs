export function transformToReactFlowData(parsedData) {
    const nodes = [];
    const edges = [];

    if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
        console.error('Invalid or empty parsed data:', parsedData);
        return { nodes, edges };
    }

    // Extract the file name (assuming there's only one file)
    const fileName = Object.keys(parsedData)[0];
    const fileData = parsedData[fileName];

    if (!fileData || typeof fileData !== 'object') {
        console.error('Invalid file data for:', fileName);
        return { nodes, edges };
    }

    const allDeclarations = fileData.allDeclarations || {};
    const directRelationships = fileData.directRelationships || {};
    const indirectRelationships = fileData.indirectRelationships || {};

    console.log("Processing declarations:", allDeclarations);
    console.log("Processing direct relationships:", directRelationships);
    console.log("Processing indirect relationships:", indirectRelationships);

    // Create nodes
    for (const [id, declaration] of Object.entries(allDeclarations)) {
        console.log("Creating node for:", declaration.name);
        nodes.push({
            id: id,
            data: { label: declaration.name },
            position: { x: Math.random() * 400, y: Math.random() * 400 }
        });
    }

    // Create edges for direct relationships
    for (const [sourceId, targetIds] of Object.entries(directRelationships)) {
        console.log("Creating edges for source:", sourceId, "with targets:", targetIds);
        targetIds.forEach(targetId => {
            if (targetId && targetId !== "undefined") {
                edges.push({
                    id: `${sourceId}-${targetId}`,
                    source: sourceId,
                    target: targetId,
                });
            }
        });
    }

    // Create edges for indirect relationships (optional)
    for (const [sourceId, targetIds] of Object.entries(indirectRelationships)) {
        console.log("Creating indirect edges for source:", sourceId, "with targets:", targetIds);
        targetIds.forEach(targetId => {
            if (targetId && targetId !== "undefined") {
                edges.push({
                    id: `${sourceId}-${targetId}-indirect`,
                    source: sourceId,
                    target: targetId,
                    animated: true,
                    style: { stroke: '#f6ab6c' }
                });
            }
        });
    }

    console.log("Generated nodes:", nodes);
    console.log("Generated edges:", edges);

    return { nodes, edges };
}
