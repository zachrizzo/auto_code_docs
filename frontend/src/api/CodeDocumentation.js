export async function getAIDescription(nodeId, code) {
    const response = await fetch('http://localhost:8000/generate-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ function_code: code }),
    });

    if (response.ok) {
        const data = await response.json();
        return data.documentation;
    } else {
        return `Failed to generate documentation for ${nodeId}.`;
    }
}
