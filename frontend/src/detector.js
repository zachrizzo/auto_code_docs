import * as Parser from 'web-tree-sitter';
let parsers = {};

export async function initializeParser() {
    await Parser.init({
        locateFile(scriptName, scriptDirectory) {
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
        methodToFunctionRelationships: {}
    };

    function analyzeMethodBody(methodNode, className, results) {
        const functionCalls = methodNode.text.match(/\b(add|subtract|multiply|divide|random)\b/g) || [];
        const methodName = methodNode.childForFieldName('name')?.text || methodNode.parent?.childForFieldName('name')?.text;

        if (className && methodName) {
            functionCalls.forEach(call => {
                if (!results.methodToFunctionRelationships[className]) {
                    results.methodToFunctionRelationships[className] = {};
                }
                if (!results.methodToFunctionRelationships[className][methodName]) {
                    results.methodToFunctionRelationships[className][methodName] = [];
                }
                results.methodToFunctionRelationships[className][methodName].push(call);
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
                if (moduleName) {
                    results.imports[moduleName] = true;
                }
            } else if (type === 'export_statement') {
                const declaration = node.childForFieldName('declaration');
                if (declaration) {
                    const exportedName = declaration.childForFieldName('name')?.text;
                    if (exportedName) {
                        results.exports[exportedName] = true;
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

    return results;
}
