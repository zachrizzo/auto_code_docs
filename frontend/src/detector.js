import * as Parser from 'web-tree-sitter';
let parsers = {};
let globalResults = {}; // To store parsed results for all files

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


    const results = {
        fileName,
        classes: [],
        functions: [],
        directRelationships: {},
        indirectRelationships: {},
        imports: {},
        exports: {},
        methodToFunctionRelationships: []  // Initialize as an empty array
    };

    function analyzeMethodBody(methodNode, className, results) {
        const functionCalls = methodNode.text.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g) || [];
        const methodName = methodNode.childForFieldName('name')?.text || methodNode.parent?.childForFieldName('name')?.text;

        if (className && methodName) {
            if (!results.methodToFunctionRelationships) {
                results.methodToFunctionRelationships = [];
            }

            functionCalls.forEach(call => {
                const callName = call.trim().slice(0, -1); // Remove the opening parenthesis
                results.methodToFunctionRelationships.push({
                    class: className,
                    method: methodName,
                    calledFunction: callName
                });
            });
        }
    }

    function traverse(cursor, parentName = null) {
        do {
            const node = cursor.currentNode;
            const type = node.type;

            let currentName = null;

            if (type === 'class_declaration' || type === 'class') {
                const className = node.childForFieldName('name')?.text;
                if (className) {
                    currentName = className;
                    results.classes.push({
                        name: className,
                        code: node.text,
                        methods: [],
                    });
                    results.directRelationships[className] = [];
                    results.indirectRelationships[className] = [];
                }
            } else if (type === 'method_definition' || type === 'function_declaration' || type === 'function') {
                const functionName = node.childForFieldName('name')?.text || node.parent?.childForFieldName('name')?.text;
                if (functionName) {
                    currentName = functionName;
                    const functionInfo = {
                        name: functionName,
                        code: node.text,
                    };
                    if (parentName && results.classes.find(c => c.name === parentName)) {
                        results.classes.find(c => c.name === parentName).methods.push(functionInfo);
                        results.directRelationships[parentName] = results.directRelationships[parentName] || [];
                        results.directRelationships[parentName].push(functionName);
                        analyzeMethodBody(node, parentName, results);
                    } else {
                        results.functions.push(functionInfo);
                        analyzeMethodBody(node, null, results);
                    }
                    results.indirectRelationships[functionName] = [];
                }
            } else if (type === 'variable_declarator') {
                const variableName = node.childForFieldName('name')?.text;
                const initNode = node.childForFieldName('value');

                if (initNode && (initNode.type === 'arrow_function' || initNode.type === 'function')) {
                    const functionInfo = {
                        name: variableName,
                        code: node.text,
                    };
                    currentName = variableName;

                    if (parentName && results.classes.find(c => c.name === parentName)) {
                        results.classes.find(c => c.name === parentName).methods.push(functionInfo);
                        results.directRelationships[parentName] = results.directRelationships[parentName] || [];
                        results.directRelationships[parentName].push(variableName);
                        analyzeMethodBody(initNode, parentName, results);
                    } else {
                        results.functions.push(functionInfo);
                        analyzeMethodBody(initNode, null, results);
                    }
                    results.indirectRelationships[variableName] = [];
                }
            } else if (type === 'call_expression') {
                const callee = node.childForFieldName('function')?.text;
                if (callee && parentName) {
                    results.indirectRelationships[parentName] = results.indirectRelationships[parentName] || [];
                    if (!results.indirectRelationships[parentName].includes(callee)) {
                        if (!['push', 'pop', 'shift', 'unshift'].includes(callee)) {
                            results.indirectRelationships[parentName].push(callee);
                        }
                    }
                    const parentClass = results.classes.find(c => c.methods.some(m => m.name === parentName));
                    if (parentClass) {
                        results.indirectRelationships[parentClass.name] = results.indirectRelationships[parentClass.name] || [];
                        if (!results.indirectRelationships[parentClass.name].includes(callee)) {
                            results.indirectRelationships[parentClass.name].push(callee);
                        }
                    }
                }
            } else if (type === 'new_expression') {
                const className = node.childForFieldName('constructor')?.text;
                if (className && parentName) {
                    results.indirectRelationships[parentName] = results.indirectRelationships[parentName] || [];
                    if (!results.indirectRelationships[parentName].includes(className)) {
                        results.indirectRelationships[parentName].push(className);
                    }
                }
            } else if (type === 'require') {
                const moduleName = node.childForFieldName('name')?.text;
                const importName = node.parent?.childForFieldName('name')?.text; // Get the variable the module is assigned to
                if (moduleName && importName) {
                    results.imports[importName] = moduleName;
                }
            } else if (type === 'import_statement') {
                const importSpecifiers = node.namedChildren.filter(child => child.type === 'import_specifier');
                importSpecifiers.forEach(specifier => {
                    const importedName = specifier.childForFieldName('name')?.text;
                    const localName = specifier.childForFieldName('alias')?.text || importedName;
                    if (importedName) {
                        results.imports[localName] = importedName;
                    }
                });
            } else if (type === 'export_statement') {
                const declaration = node.childForFieldName('declaration');
                if (declaration) {
                    const exportedName = declaration.childForFieldName('name')?.text;
                    if (exportedName) {
                        results.exports[exportedName] = true;
                    }
                } else {
                    // Handle default exports
                    const defaultExport = node.childForFieldName('value');
                    if (defaultExport) {
                        results.exports['default'] = true;
                    }
                }
            }

            if (cursor.gotoFirstChild()) {
                traverse(cursor, currentName || parentName);
                cursor.gotoParent();
            }
        } while (cursor.gotoNextSibling());
    }

    traverse(cursor);

    if (Object.keys(results.exports).length === 0) {
        delete results.exports;
    }

    globalResults[fileName] = results; // Store the results globally

    return results;
}

export function resolveCrossFileDependencies() {
    const resolvedResults = JSON.parse(JSON.stringify(globalResults)); // Clone the global results

    // First pass: identify all exports
    const allExports = {};
    for (const [fileName, fileResults] of Object.entries(resolvedResults)) {
        if (fileResults.exports) {
            for (const exportName of Object.keys(fileResults.exports)) {
                allExports[exportName] = fileName;
            }
        }
    }

    // Second pass: resolve cross-file relationships
    for (const [fileName, fileResults] of Object.entries(resolvedResults)) {
        fileResults.crossFileRelationships = {};

        // Check all functions and methods for calls to exported functions
        const checkForCalls = (entity, entityName, entityType) => {
            const calls = entity.code.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g) || [];
            calls.forEach(call => {
                const callName = call.trim().slice(0, -1); // Remove the opening parenthesis
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
        fileResults.functions.forEach(func => {
            checkForCalls(func, func.name, 'functions');
        });

        // Check methods in classes
        fileResults.classes.forEach(cls => {
            cls.methods.forEach(method => {
                checkForCalls(method, method.name, `classes.${cls.name}.methods`);
            });
        });

        // Also check indirect relationships
        for (const [funcName, calls] of Object.entries(fileResults.indirectRelationships)) {
            calls.forEach(call => {
                if (allExports[call] && allExports[call] !== fileName) {
                    if (!fileResults.crossFileRelationships.indirectRelationships) {
                        fileResults.crossFileRelationships.indirectRelationships = {};
                    }
                    if (!fileResults.crossFileRelationships.indirectRelationships[funcName]) {
                        fileResults.crossFileRelationships.indirectRelationships[funcName] = {};
                    }
                    fileResults.crossFileRelationships.indirectRelationships[funcName][call] = allExports[call];
                }
            });
        }
    }

    return resolvedResults;
}
