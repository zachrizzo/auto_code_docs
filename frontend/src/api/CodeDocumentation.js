export async function getAIDescription(nodeId, code) {
    const response = await fetch('http://127.0.0.1:8000/generate-docs', {
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

export async function getAST(code) {
    const response = await fetch('http://127.0.0.1:8000/get-ast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
    });

    if (response.ok) {
        const data = await response.json();
        return data.ast;
    }

    return null;

}

export async function generateUnitTest(code) {
    const response = await fetch('http://127.0.0.1:8000/generate-unit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
    });

    if (response.ok) {
        const data = await response.json();
        return data.unit_test;
    }

    return null;

}

export async function getEmbeddings(text) {
    const response = await fetch('http://127.0.0.1:8000/get-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
    });

    if (response.ok) {
        const data = await response.json();
        return data.embeddings;
    } else {
        return [];
    }
}
