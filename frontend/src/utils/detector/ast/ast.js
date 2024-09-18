// ast.js

import { createHash } from 'crypto';
import { relative, isAbsolute } from 'path';
import JavaScriptFunctionHandler from './langs/js/functions';
import PythonFunctionHandler from './langs/python/functions';
import JuliaFunctionHandler from './langs/julia/functions';
import JavaFunctionHandler from './langs/java/functions';

import ClassHandler from './classes';

const langs = {
    python: {
        functions: [
            'function_definition',
            'lambda',
            'async_function_definition',
            'function'
        ],
        classes: [
            'class_definition'
        ],
        call: [
            'call',
        ],
        other: [
            'import_statement',
            'import_from_statement',
            'call',
            'if_statement',
            'for_statement',
        ]
    },
    javascript: {
        functions: [
            'function_declaration',
            'function_expression',
            'arrow_function',
            'method_definition',
            'function'
        ],
        classes: [
            'class_declaration',
            'class_expression'
        ],
        call: [
            'call_expression',
            'jsx_element',
            'jsx_self_closing_element'
        ],
        other: [
            'call_expression',
            'import_statement',
            'export_default_declaration',
            'export_named_declaration',
        ]
    },
    java: {
        functions: [
            'method_declaration',
            'constructor_declaration',
            'function'
        ],
        classes: [
            'class_declaration',
            'interface_declaration'
        ],
        call: [
            'method_invocation',
        ],
        other: [
            'import_declaration',
            'package_declaration',
            'method_invocation',
        ]
    },
    ruby: {
        functions: [
            'method',
            'lambda',
            'function'
        ],
        classes: [
            'class',
            'module'
        ],
        call: [
            'call',
        ],
        other: [
            'call',
            'require',
            'if',
            'while',
        ]
    },
    julia: {
        functions: [
            'function_definition',
            'assignment',
        ],
        classes: [
            'struct_definition',
            'abstract_definition',
            'primitive_definition',
        ],
        call: [
            'call_expression',
        ],
        other: [
            'module_definition',
            'macro_definition',
            'return_statement',
            'where_expression',
            'where_clause',
            'binary_expression',
            'unary_typed_expression',
            'typed_expression',
            'field_expression',
            'string_literal',
            'integer_literal',
            'identifier',
            'operator',
            'argument_list',
            'signature',
            'type_clause',
            'type_parameter_list',
            'parametrized_type_expression',
            'splat_expression',
            'tuple_expression',
        ]
    },
}

class ASTDetectionHandler {
    constructor(parser, results, processedFunctions, processedClasses, currentAnalysisId, watchedDir, currentFile, language = 'python', globalFunctionNameToId) {
        this.parser = parser;
        this.results = results;
        this.processedFunctions = processedFunctions || new Set();
        this.processedClasses = processedClasses || new Set();
        this.currentAnalysisId = currentAnalysisId;
        this.watchedDir = watchedDir;
        this.currentFile = currentFile;
        this.importedModules = new Set();

        this.globalFunctionNameToId = globalFunctionNameToId;

        this.currentClassId = null;
        this.currentFunctionId = null;
        this.parentNodeId = null;

        this.parentStack = [];

        this.results.functionCallRelationships = this.results.functionCallRelationships || {};

        this.functionHandler = this.createFunctionHandler(language)
        this.classHandler = new ClassHandler(this);

        // Retrieve node types from the language configuration
        this.functionTypes = langs[language]?.functions || [];
        this.classTypes = langs[language]?.classes || [];
        this.calledFunction = langs[language]?.call || []
        this.otherTypes = langs[language]?.other || [];

        this.initializeResults();

        this.functionNameCounts = {}; // Map of function names to counts
        this.codeHashToFunctionIds = {}; // Map of code hashes to function IDs
        this.duplicateCounts = {}; // For handling duplicates
    }

    initializeResults() {
        this.results.directRelationships = this.results.directRelationships || {};
        this.results.rootFunctionIds = this.results.rootFunctionIds || [];
        this.results.functionCallRelationships = this.results.functionCallRelationships || {};
        this.results.allDeclarations = this.results.allDeclarations || {};
        this.results.allCalledFunctions = this.results.allCalledFunctions || {};
    }

    createFunctionHandler(language) {
        switch (language) {
            case 'javascript':
                return new JavaScriptFunctionHandler(this);
            case 'julia':
                return new JuliaFunctionHandler(this);
            case 'java':
                return new JavaFunctionHandler(this);
            case 'python':
                return new PythonFunctionHandler(this);
            default:
                return new JavaScriptFunctionHandler(this); // Default handler
        }
    }

    isInWatchedDir(filePath) {
        const relativePath = relative(this.watchedDir, filePath);
        return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
    }

    getUniqueId(code) {
        return createHash('sha256').update(code).digest('hex');
    }

    isFunctionNode(nodeType) {
        return this.functionTypes.includes(nodeType);
    }

    isClassNode(nodeType) {
        return this.classTypes.includes(nodeType);
    }

    isCalledNode(nodeType) {
        return this.calledFunction.includes(nodeType);
    }

    addRootLevelRelationship(id) {
        if (!this.results.rootFunctionIds.includes(id)) {
            this.results.rootFunctionIds.push(id);
        }
    }

    addDeclaration(name, type, path, code) {
        if (!this.isInWatchedDir(this.currentFile) || this.importedModules.has(name)) {
            return null;
        }

        // Generate a unique ID for the function based on its code content
        const codeHash = this.getUniqueId(code);
        const id = `${codeHash}-${this.currentFile}-${name}`;

        // Check for duplicates without modifying ID
        let isDuplicate = false;
        if (this.results.allDeclarations[id]) {
            isDuplicate = true;
            // Optionally, you can append a count to the display name
            const duplicateCount = (this.duplicateCounts[name] || 1) + 1;
            this.duplicateCounts[name] = duplicateCount;
            name = `${name} (${duplicateCount})`; // Update display name
        }

        const declaration = {
            id,
            name, // Use updated name for display
            type,
            path,
            code,
            analysisId: this.currentAnalysisId,
            file: this.currentFile
        };

        this.results.allDeclarations[id] = declaration;

        // **Update globalFunctionNameToId**
        if (!this.globalFunctionNameToId[name]) {
            this.globalFunctionNameToId[name] = [];
        }
        this.globalFunctionNameToId[name].push(id);

        return id;
    }

    addFunctionCallRelationship(node) {
        const callerNodeId = this.parentStack[this.parentStack.length - 1] || 'root';
        const calledFunctionName = this.getCalledFunctionName(node);

        if (calledFunctionName) {
            // Get the ID(s) of the called function from global declarations
            const calledFunctionIds = this.globalFunctionNameToId[calledFunctionName] || [];
            if (calledFunctionIds.length > 0) {
                // Record the relationship immediately if declarations are known
                this.recordFunctionCall(callerNodeId, calledFunctionIds);
            } else {
                // If the declaration isn't found, defer the resolution
                if (!this.results.deferredFunctionCalls) {
                    this.results.deferredFunctionCalls = [];
                }
                this.results.deferredFunctionCalls.push({ callerNodeId, calledFunctionName });
            }
        }
    }

    recordFunctionCall(callerNodeId, calledFunctionIds) {
        if (!this.results.functionCallRelationships[callerNodeId]) {
            this.results.functionCallRelationships[callerNodeId] = new Set();
        }
        calledFunctionIds.forEach(id => {
            this.results.functionCallRelationships[callerNodeId].add(id);
        });

        // Record in allCalledFunctions
        calledFunctionIds.forEach(id => {
            if (!this.results.allCalledFunctions[id]) {
                this.results.allCalledFunctions[id] = new Set();
            }
            this.results.allCalledFunctions[id].add(callerNodeId);
        });
    }

    getChildNodes = (cursor, parentPath = '', parentId = null, isRootLevel = true) => {
        if (cursor.gotoFirstChild()) {
            this.traverse(cursor, parentPath, parentId, isRootLevel);
            cursor.gotoParent();
        }
    }

    traverseAndDetect(cursor, parentPath = '', parentId = null, isRootLevel = true) {
        do {
            const node = cursor.currentNode;
            if (!node) return;

            const nodeType = node.type;
            const nodeCode = node.text;

            // **Updated to use the ID returned from handleNode**
            let currentNodeId = null;

            const isFunction = this.isFunctionNode(nodeType);
            const isClass = this.isClassNode(nodeType);
            const isCalledNode = this.isCalledNode(nodeType);

            if (nodeType === 'program') {
                if (cursor.gotoFirstChild()) {
                    this.traverseAndDetect(cursor, parentPath, null, true);
                    cursor.gotoParent();
                }
            } else if (isFunction || isClass) {
                if (isFunction) {
                    const functionId = this.functionHandler.handleNode(node, parentPath, this.parentStack[this.parentStack.length - 1]);
                    currentNodeId = functionId;
                    this.parentStack.push(functionId);
                }
                if (isClass) {
                    const classId = this.classHandler.handleNode(node, parentPath, this.parentStack[this.parentStack.length - 1]);
                    currentNodeId = classId;
                    this.parentStack.push(classId);
                }

                if (isRootLevel && currentNodeId) {
                    this.addRootLevelRelationship(currentNodeId);
                }

                if (cursor.gotoFirstChild()) {
                    this.traverseAndDetect(cursor, `${parentPath}${nodeType}-`, currentNodeId, false);
                    cursor.gotoParent();
                }

                this.parentStack.pop();
            } else if (isCalledNode) {
                this.addFunctionCallRelationship(node);

                if (cursor.gotoFirstChild()) {
                    this.traverseAndDetect(cursor, `${parentPath}${nodeType}-`, parentId, isRootLevel);
                    cursor.gotoParent();
                }
            } else {
                if (cursor.gotoFirstChild()) {
                    this.traverseAndDetect(cursor, `${parentPath}${nodeType}-`, parentId, isRootLevel);
                    cursor.gotoParent();
                }
            }

        } while (cursor.gotoNextSibling());
    }

    getCalledFunctionName(node) {
        if (this.isCalledNode(node.type)) {
            let functionNode = node.childForFieldName('function') || node.namedChildren[0];

            if (functionNode) {
                if (functionNode.type === 'identifier') {
                    // Simple function call
                    return functionNode.text;
                } else if (['member_expression', 'attribute', 'field_expression'].includes(functionNode.type)) {
                    // Handle object method calls (e.g., object.method())
                    let objectNode = functionNode.childForFieldName('object');
                    let propertyNode = functionNode.childForFieldName('property');
                    if (objectNode && propertyNode) {
                        return `${objectNode.text}.${propertyNode.text}`;
                    }
                } else if (functionNode.type.includes('function')) {
                    // Anonymous function call
                    return `anonymous_${this.getUniqueId(functionNode.text)}`;
                }
            }
        }
        return null;
    }

    finalizeRelationships() {
        // Convert Sets to Arrays in functionCallRelationships
        for (const [callerId, calledFunctionIds] of Object.entries(this.results.functionCallRelationships)) {
            this.results.functionCallRelationships[callerId] = Array.from(calledFunctionIds);
        }

        // Convert Sets to Arrays in allCalledFunctions
        for (const [functionId, callerIds] of Object.entries(this.results.allCalledFunctions)) {
            this.results.allCalledFunctions[functionId] = Array.from(callerIds);
        }
    }
}

export default ASTDetectionHandler;
