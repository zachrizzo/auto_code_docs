const PORT = 8001;

export async function getAIDescription(nodeId, code) {
    const response = await fetch(`http://127.0.0.1:${PORT}/generate-docs`, {
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
    const response = await fetch(`http://127.0.0.1:${PORT}/get-ast`, {
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
    const response = await fetch(`http://127.0.0.1:${PORT}/generate-unit-test`, {
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
    const response = await fetch(`http://127.0.0.1:${PORT}/get-embeddings`, {
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


export async function downLoadMissingAiModels(models, onProgress) {
    const response = await fetch(`http://127.0.0.1:${PORT}/install-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download models: ${errorText}`);
    }

    // Handle the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
            const chunk = decoder.decode(value);
            // Process the chunk (e.g., display progress)
            const lines = chunk.split('\n\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const message = line.substring(6).trim();
                    onProgress(message);
                }
            }
        }
    }

    return true;
}

export async function checkMissingAiModels(models) {
    const PORT = 8001; // Ensure PORT is defined or replace with actual port number

    try {
        const response = await fetch(`http://127.0.0.1:${PORT}/check-models`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ models }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to check models: ${errorText}`);
        }

        const data = await response.json();
        return data; // Expected response: { missing_models: [...] }
    } catch (error) {
        throw new Error(`Error during model check: ${error.message}`);
    }
}





export async function compareFirestoreDocs(collectionName, selectedServiceAccount) {
    const response = await fetch(`http://127.0.0.1:${PORT}/compare-documents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            collection_name: collectionName,
            service_account: selectedServiceAccount,
            schema: null, // We will handle schema in frontend
        }),
    });
    if (!response.ok) {
        throw new Error('Failed to fetch discrepancies');
    }

    const data = await response.json();

    return data;
}
