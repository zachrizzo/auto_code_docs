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
        analysisId: currentAnalysisId
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

            if (type === 'class_declaration' || type === 'class' || type === 'class_expression') {
                const className = node.childForFieldName('name')?.text;
                if (className) {
                    const path = `${parentPath}${className}`;
                    const id = addDeclaration(className, 'class', path, node.text);
                    if (id) {
                        results.classes.push({ id });
                        results.directRelationships[id] = [];
                        results.indirectRelationships[id] = [];
                        if (parentId) {
                            results.directRelationships[parentId].push(id);
                        }
                        if (cursor.gotoFirstChild()) {
                            traverse(cursor, `${path}-`, id, currentFunctionId);
                            cursor.gotoParent();
                        }
                    }
                }
            } else if (
                type === 'function_declaration' ||
                type === 'method_definition' ||
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

    const allExports = {};
    for (const [fileName, fileResults] of Object.entries(resolvedResults)) {
        if (fileResults.exports) {
            for (const exportName of Object.keys(fileResults.exports)) {
                allExports[exportName] = fileName;
            }
        }
    }

    for (const [fileName, fileResults] of Object.entries(resolvedResults)) {
        fileResults.crossFileRelationships = {};

        const checkForCalls = (entity, entityName, entityType) => {
            if (!entity || !entity.code) return;
            const calls = entity.code.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g) || [];
            calls.forEach(call => {
                const callName = call.trim().slice(0, -1);
                if (allExports[callName] && allExports[callName] !== fileName) {
                    if (!fileResults.crossFileRelationships[entityType]) {
                        fileResults.crossFileRelationships[entityType] = {};
                    }
                    if (!fileResults.crossFileRelationships[entityType][entityName]) {
                        fileResults.crossFileRelationships[entityType][entityName] = {};
                    }
                    fileResults.crossFileRelationships[entityType][entityName][callName] = allExports[callName];
                }
            });
        };

        // Check functions
        if (Array.isArray(fileResults.functions)) {
            fileResults.functions.forEach(func => {
                if (func && func.id) {
                    const funcDeclaration = fileResults.allDeclarations[func.id];
                    if (funcDeclaration && funcDeclaration.name) {
                        checkForCalls(funcDeclaration, funcDeclaration.name, 'functions');
                    }
                }
            });
        }

        // Check classes
        if (Array.isArray(fileResults.classes)) {
            fileResults.classes.forEach(cls => {
                if (cls && cls.id) {
                    const classDeclaration = fileResults.allDeclarations[cls.id];
                    if (classDeclaration && classDeclaration.name) {
                        Object.values(fileResults.allDeclarations)
                            .filter(decl => decl && decl.path && classDeclaration.path &&
                                decl.path.startsWith(`${classDeclaration.path}-`) &&
                                decl.type === 'function')
                            .forEach(method => {
                                if (method && method.name) {
                                    checkForCalls(method, method.name, `classes.${classDeclaration.name}.methods`);
                                }
                            });
                    }
                }
            });
        }

        // Check indirect relationships
        if (fileResults.indirectRelationships) {
            Object.entries(fileResults.indirectRelationships).forEach(([funcId, calls]) => {
                const funcDeclaration = fileResults.allDeclarations[funcId];
                if (funcDeclaration && funcDeclaration.name) {
                    calls.forEach(callId => {
                        const callDeclaration = fileResults.allDeclarations[callId];
                        if (callDeclaration && callDeclaration.name &&
                            allExports[callDeclaration.name] &&
                            allExports[callDeclaration.name] !== fileName) {
                            if (!fileResults.crossFileRelationships.indirectRelationships) {
                                fileResults.crossFileRelationships.indirectRelationships = {};
                            }
                            if (!fileResults.crossFileRelationships.indirectRelationships[funcDeclaration.name]) {
                                fileResults.crossFileRelationships.indirectRelationships[funcDeclaration.name] = {};
                            }
                            fileResults.crossFileRelationships.indirectRelationships[funcDeclaration.name][callDeclaration.name] = allExports[callDeclaration.name];
                        }
                    });
                }
            });
        }
    }

    return resolvedResults;
}
