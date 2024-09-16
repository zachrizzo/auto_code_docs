

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
            'function_definition',  // Represents a function definition
            'lambda',               // Represents a lambda function
            'async_function_definition', // Represents an async function
            'function'
        ],
        classes: [
            'class_definition' // Represents a class definition
        ],
        call: [
            'call',
        ],
        other: [
            'import_statement',        // Represents an import statement
            'import_from_statement',   // Represents a from-import statement
            'call',                    // Represents a function call
            'if_statement',            // Represents an if statement
            'for_statement',           // Represents a for loop
        ]
    },
    javascript: {
        functions: [
            'function_declaration',   // Function declaration
            'function_expression',    // Function expression
            'arrow_function',         // Arrow function
            'method_definition',      // Method in a class or object
            'function'
        ],
        classes: [
            'class_declaration', // Class declaration
            'class_expression'   // Class expression
        ],
        call: [
            'call_expression',
            'jsx_element',
            'jsx_self_closing_element'
        ],
        other: [
            'call_expression',       // Represents a function call
            'import_statement',      // Represents an import statement
            'export_default_declaration', // Represents an export default
            'export_named_declaration',   // Represents a named export
        ]
    },
    java: {
        functions: [
            'method_declaration',      // Method declaration in a class
            'constructor_declaration',  // Constructor declaration in a class
            'function'
        ],
        classes: [
            'class_declaration',       // Class declaration
            'interface_declaration'    // Interface declaration
        ],
        call: [
            'method_invocation',
        ],
        other: [
            'import_declaration',      // Import statement
            'package_declaration',     // Package statement
            'method_invocation',       // Method call
        ]
    },
    ruby: {
        functions: [
            'method',   // Represents a method definition
            'lambda',   // Represents a lambda function
            'function'
        ],
        classes: [
            'class',    // Represents a class definition
            'module'    // Represents a module definition
        ],
        call: [
            'call',
        ],
        other: [
            'call',     // Represents a function call
            'require',  // Require statement
            'if',       // If statement
            'while',    // While loop
        ]
    },
    julia: {
        functions: [
            'function_definition',   // Function definitions
            'assignment',            // Short-form function definitions
        ],
        classes: [
            'struct_definition',     // Struct definitions
            'abstract_definition',   // Abstract type definitions
            'primitive_definition',  // Primitive type definitions
        ],
        call: [
            'call_expression',       // Function calls
        ],
        other: [
            'module_definition',     // Module definitions
            'macro_definition',      // Macro definitions
            'return_statement',      // Return statements
            'where_expression',      // Where clauses
            'where_clause',          // Where clauses in function signatures
            'binary_expression',     // Binary operations
            'unary_typed_expression', // Type annotations
            'typed_expression',      // Type annotations
            'field_expression',      // Accessing fields (e.g., object.field)
            'string_literal',        // String literals
            'integer_literal',       // Integer literals
            'identifier',            // Variable and function names
            'operator',              // Operators
            'argument_list',         // Function arguments
            'signature',             // Function signatures
            'type_clause',           // Type clauses (e.g., <:)
            'type_parameter_list',   // Type parameters
            'parametrized_type_expression', // Parameterized types
            'splat_expression',      // Splat expressions (...)
            'tuple_expression',      // Tuple expressions
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

        this.globalFunctionNameToId = globalFunctionNameToId; // Add this line

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

    addRootLevelRelationship(nodeId) {
        if (!this.results.rootFunctionIds.includes(nodeId)) {
            this.results.rootFunctionIds.push(nodeId);
        }
    }

    addDeclaration(name, type, path, code) {
        if (!this.isInWatchedDir(this.currentFile) || this.importedModules.has(name)) {
            return null;
        }

        const id = this.getUniqueId(code);

        if (this.isFunctionNode(type)) {
            if (!this.globalFunctionNameToId[name]) {
                this.globalFunctionNameToId[name] = [];
            }
            this.globalFunctionNameToId[name].push(id);
        }

        const declaration = {
            id,
            name,
            type,
            path,
            code,
            analysisId: this.currentAnalysisId,
            file: this.currentFile
        };

        this.results.allDeclarations[id] = declaration;
        return id;
    }

    addFunctionCallRelationship(node) {
        const callerNodeId = this.parentStack[this.parentStack.length - 1] || 'root';
        const calledFunctionName = this.getCalledFunctionName(node);

        if (calledFunctionName) {
            // Get the ID(s) of the called function from global declarations
            const calledFunctionIds = this.globalFunctionNameToId[calledFunctionName] || [];

            // If the declaration isn't found, defer the resolution
            if (calledFunctionIds.length === 0) {
                if (!this.results.deferredFunctionCalls) {
                    this.results.deferredFunctionCalls = [];
                }
                this.results.deferredFunctionCalls.push({ callerNodeId, calledFunctionName });
            } else {
                // Record the relationship immediately if declarations are known
                this.recordFunctionCall(callerNodeId, calledFunctionIds);
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
            console.log('type', nodeType)
            const nodeCode = node.text;

            const currentNodeId = this.getUniqueId(nodeCode);

            const isFunction = this.isFunctionNode(nodeType);
            const isClass = this.isClassNode(nodeType);
            const isCalledNode = this.isCalledNode(nodeType);

            if (nodeType === 'program') {
                if (cursor.gotoFirstChild()) {
                    this.traverseAndDetect(cursor, parentPath, null, true);
                    cursor.gotoParent();
                }
            } else if (isFunction || isClass) {
                if (isFunction) this.functionHandler.handleNode(node, parentPath, this.parentStack[this.parentStack.length - 1]);
                if (isClass) this.classHandler.handleNode(node, parentPath, this.parentStack[this.parentStack.length - 1]);

                this.parentStack.push(currentNodeId);

                if (isRootLevel) {
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
                    this.traverseAndDetect(cursor, `${parentPath}${nodeType}-`, this.parentStack[this.parentStack.length - 1], isRootLevel);
                    cursor.gotoParent();
                }
            } else {
                if (cursor.gotoFirstChild()) {
                    this.traverseAndDetect(cursor, `${parentPath}${nodeType}-`, this.parentStack[this.parentStack.length - 1], isRootLevel);
                    cursor.gotoParent();
                }
            }

        } while (cursor.gotoNextSibling());
    }

    getCalledFunctionName(node) {
        if (this.isCalledNode(node.type)) {
            const firstChild = node.namedChildren[0];
            if (firstChild) {
                if (firstChild.type === 'identifier') {
                    // Simple function call
                    return firstChild.text;
                } else if (firstChild.type === 'field_expression') {
                    // Method call or namespaced function call
                    const objectName = firstChild.namedChildren[0]?.text;
                    const methodName = firstChild.namedChildren[1]?.text;
                    if (objectName && methodName) {
                        return `${objectName}.${methodName}`;
                    }
                } else if (firstChild.type.includes('function')) {
                    // Anonymous function call
                    return 'anonymous';
                }
            }

            // If we couldn't identify the function name from the first child,
            // try to find an identifier among the node's children
            for (let i = 0; i < node.namedChildCount; i++) {
                let child = node.namedChild(i);
                if (child.type === 'identifier') {
                    return child.text;
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

const _default = ASTDetectionHandler;
export { _default as default };
