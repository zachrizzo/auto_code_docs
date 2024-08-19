import * as Parser from 'web-tree-sitter';

let parsers = {};
let globalResults = {}; // To store parsed results for all files
let globalDeclarations = {}; // Global storage for all declarations across files, indexed by name
let currentAnalysisId = 0;

// Function to generate unique IDs
function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}

export async function initializeParser() {
    await Parser.init({
        locateFile(scriptName) {
            return scriptName;
        },
    });

    const JavaScript = await Parser.Language.load('dist/tree-sitter-javascript.wasm');
    parsers.javascript = JavaScript;
}

export async function detectClassesAndFunctions(language, code, fileName) {
    if (!parsers[language]) {
        await initializeParser();
    }

    const parser = new Parser();
    parser.setLanguage(parsers[language]);

    const tree = parser.parse(code);
    const cursor = tree.walk();

    const processedFunctions = new Set();

    currentAnalysisId++; // Increment for each new analysis

    const results = {
        fileName,
        classes: [],
        functions: [],
        directRelationships: {},
        indirectRelationships: {},
        crossFileRelationships: {},
        allDeclarations: {},
        recursiveRelationships: [],
        analysisId: currentAnalysisId,
        rootFunctionIds: []  // New array to store root-level function IDs
    };

    function addDeclaration(name, type, path, code) {
        const id = generateUniqueId();
        const declaration = {
            id,
            name,
            type,
            path,
            code,
            analysisId: currentAnalysisId
        };
        results.allDeclarations[id] = declaration;
        globalDeclarations[name] = declaration;
        console.log('Declaration added:', declaration);
        return id;
    }

    function analyzeMethodBody(methodNode, parentId, results, depth = 0) {
        if (!methodNode || !methodNode.text) {
            return;
        }

        const functionCalls = methodNode.text.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g) || [];
        functionCalls.forEach(call => {
            const callName = call.trim().slice(0, -1);
            const calledId = Object.keys(results.allDeclarations).find(id => results.allDeclarations[id].name === callName);
            if (calledId && calledId !== parentId) {
                results.indirectRelationships[parentId] = results.indirectRelationships[parentId] || [];
                if (!results.indirectRelationships[parentId].includes(calledId)) {
                    results.indirectRelationships[parentId].push(calledId);

                    if (depth < 3) {
                        const calledFunction = results.allDeclarations[calledId];
                        if (calledFunction && calledFunction.code) {
                            analyzeMethodBody(calledFunction, calledId, results, depth + 1);
                        }
                    }
                }
            }
        });
    }

    function traverse(cursor, parentPath = '', parentId = null, currentFunctionId = null) {
        do {
            const node = cursor.currentNode;
            const type = node.type;

            if (
                type === 'function_declaration' ||
                type === 'function' ||
                type === 'arrow_function' ||
                type === 'generator_function' ||
                type === 'async_function'
            ) {
                let functionName = node.childForFieldName('name')?.text;
                if (!functionName && (type === 'arrow_function' || type === 'function')) {
                    const parent = node.parent;
                    if (parent.type === 'variable_declarator') {
                        functionName = parent.childForFieldName('name')?.text;
                    }
                }
                if (functionName && !processedFunctions.has(functionName)) {
                    const path = `${parentPath}${functionName}`;
                    const id = addDeclaration(functionName, 'function', path, node.text);
                    if (id) {
                        results.functions.push({ id, parentFunctionId: currentFunctionId });
                        results.directRelationships[id] = [];
                        results.indirectRelationships[id] = [];

                        // If this function is at the root level (no parent function or class)
                        if (!currentFunctionId && !parentId) {
                            results.rootFunctionIds.push(id);
                        }

                        if (currentFunctionId) {
                            results.directRelationships[currentFunctionId].push(id);
                        } else if (parentId) {
                            results.directRelationships[parentId].push(id);
                        }
                        analyzeMethodBody(node, id, results);
                        processedFunctions.add(functionName);

                        if (cursor.gotoFirstChild()) {
                            traverse(cursor, `${path}-`, parentId, id);
                            cursor.gotoParent();
                        }
                    }
                }

            } else if (cursor.gotoFirstChild()) {
                traverse(cursor, `${parentPath}${node.type}-`, parentId, currentFunctionId);
                cursor.gotoParent();
            }
        } while (cursor.gotoNextSibling());
    }


    traverse(cursor);

    // Update globalResults
    if (!globalResults[fileName]) {
        globalResults[fileName] = {};
    }

    // Remove old declarations and relationships
    for (const key in globalResults[fileName]) {
        if (Array.isArray(globalResults[fileName][key])) {
            globalResults[fileName][key] = globalResults[fileName][key].filter(item => item.analysisId === currentAnalysisId);
        } else if (typeof globalResults[fileName][key] === 'object') {
            for (const subKey in globalResults[fileName][key]) {
                if (globalResults[fileName][key][subKey].analysisId !== currentAnalysisId) {
                    delete globalResults[fileName][key][subKey];
                }
            }
        }
    }

    // Merge new results
    Object.assign(globalResults[fileName], results);

    // Clean up old global declarations
    for (const [name, declaration] of Object.entries(globalDeclarations)) {
        if (declaration.analysisId !== currentAnalysisId) {
            delete globalDeclarations[name];
        }
    }

    return results;
}
export function resolveCrossFileDependencies() {
    const resolvedResults = JSON.parse(JSON.stringify(globalResults));

    // Create a global map of all functions
    const allFunctions = new Map();
    for (const [fileName, fileResults] of Object.entries(resolvedResults)) {
        fileResults.functions?.forEach(func => {
            const declaration = fileResults.allDeclarations[func.id];
            if (declaration) {
                allFunctions.set(declaration.name, { id: declaration.id, fileName });
            }
        });
        // Include class methods as well
        fileResults.classes?.forEach(cls => {
            const classDeclaration = fileResults.allDeclarations[cls.id];
            if (classDeclaration) {
                Object.values(fileResults.allDeclarations)
                    .filter(decl => decl.path && decl.path.startsWith(`${classDeclaration.path}-`) && decl.type === 'function')
                    .forEach(method => {
                        allFunctions.set(method.name, { id: method.id, fileName });
                    });
            }
        });
    }

    // Resolve cross-file relationships
    for (const [fileName, fileResults] of Object.entries(resolvedResults)) {
        fileResults.crossFileRelationships = {};

        const checkForCalls = (entity, entityId, entityType) => {
            if (!entity || !entity.code) return;
            const calls = entity.code.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g) || [];
            calls.forEach(call => {
                const callName = call.trim().slice(0, -1);
                const calledFunction = allFunctions.get(callName);
                if (calledFunction && calledFunction.fileName !== fileName) {
                    if (!fileResults.crossFileRelationships[entityType]) {
                        fileResults.crossFileRelationships[entityType] = {};
                    }
                    if (!fileResults.crossFileRelationships[entityType][entityId]) {
                        fileResults.crossFileRelationships[entityType][entityId] = [];
                    }
                    if (!fileResults.crossFileRelationships[entityType][entityId].includes(calledFunction.id)) {
                        fileResults.crossFileRelationships[entityType][entityId].push(calledFunction.id);
                    }
                }
            });
        };

        // Check functions
        fileResults.functions?.forEach(func => {
            const funcDeclaration = fileResults.allDeclarations[func.id];
            if (funcDeclaration) {
                checkForCalls(funcDeclaration, funcDeclaration.id, 'functions');
            }
        });

        // Check classes and their methods
        fileResults.classes?.forEach(cls => {
            const classDeclaration = fileResults.allDeclarations[cls.id];
            if (classDeclaration) {
                Object.values(fileResults.allDeclarations)
                    .filter(decl => decl.path && decl.path.startsWith(`${classDeclaration.path}-`) && decl.type === 'function')
                    .forEach(method => {
                        checkForCalls(method, method.id, `classes.${classDeclaration.name}.methods`);
                    });
            }
        });

        // Check indirect relationships
        if (fileResults.indirectRelationships) {
            Object.entries(fileResults.indirectRelationships).forEach(([funcId, calls]) => {
                const funcDeclaration = fileResults.allDeclarations[funcId];
                if (funcDeclaration) {
                    calls.forEach(callId => {
                        const callDeclaration = fileResults.allDeclarations[callId];
                        if (callDeclaration) {
                            const calledFunction = allFunctions.get(callDeclaration.name);
                            if (calledFunction && calledFunction.fileName !== fileName) {
                                if (!fileResults.crossFileRelationships.indirectRelationships) {
                                    fileResults.crossFileRelationships.indirectRelationships = {};
                                }
                                if (!fileResults.crossFileRelationships.indirectRelationships[funcId]) {
                                    fileResults.crossFileRelationships.indirectRelationships[funcId] = [];
                                }
                                if (!fileResults.crossFileRelationships.indirectRelationships[funcId].includes(calledFunction.id)) {
                                    fileResults.crossFileRelationships.indirectRelationships[funcId].push(calledFunction.id);
                                }
                            }
                        }
                    });
                }
            });
        }
    }

    return resolvedResults;
}
