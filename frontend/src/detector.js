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
        relationships: {},
        imports: {},
    };

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
                    results.relationships[className] = [];
                }
            } else if (type === 'method_definition' || type === 'function_declaration') {
                const functionName = node.childForFieldName('name')?.text;
                if (functionName) {
                    currentName = functionName;
                    const functionInfo = {
                        name: functionName,
                        code: node.text,
                    };
                    if (parentName && results.classes.find(c => c.name === parentName)) {
                        results.classes.find(c => c.name === parentName).methods.push(functionInfo);
                    } else {
                        results.functions.push(functionInfo);
                    }
                    if (parentName && results.relationships[parentName]) {
                        results.relationships[parentName].push(functionName);
                    }
                }
            } else if (type === 'import_statement') {
                const importSource = node.childForFieldName('source')?.text?.replace(/['"]/g, '');
                const importSpecifiers = node.childForFieldName('specifiers');
                if (importSource && importSpecifiers) {
                    results.imports[importSource] = [];
                    importSpecifiers.children.forEach(specifier => {
                        if (specifier.type === 'import_specifier') {
                            const importedName = specifier.childForFieldName('name')?.text;
                            if (importedName) {
                                results.imports[importSource].push(importedName);
                            }
                        }
                    });
                }
            }

            if (cursor.gotoFirstChild()) {
                traverse(cursor, currentName || parentName);
                cursor.gotoParent();
            }
        } while (cursor.gotoNextSibling());
    }

    traverse(cursor);

    return results;
}
