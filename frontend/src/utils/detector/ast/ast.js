
import crypto from 'crypto';
import path from 'path';
import * as Parser from 'web-tree-sitter';
import FunctionHandler from './functions';
import ClassHandler from './classes';

const langs = {
    python: {
        functions: [
            'function_definition',  // Represents a function definition
            'lambda',               // Represents a lambda function
            'async_function_definition', // Represents an async function
        ],
        classes: [
            'class_definition' // Represents a class definition
        ],
        other: [
            'import_statement',        // Represents an import statement
            'import_from_statement',   // Represents a from-import statement
            'call',                    // Represents a function call
            'if_statement',            // Represents an if statement
            'for_statement',           // Represents a for loop
        ]
    },
    js: {
        functions: [
            'function_declaration',   // Function declaration
            'function_expression',    // Function expression
            'arrow_function',         // Arrow function
            'method_definition',      // Method in a class or object
            'method_definition',      // Class method (Tree-sitter uses the same node type for method definitions)
            'method_definition',      // Private class method (Private methods are also method definitions)
            'method_definition',      // Method in an object literal
        ],
        classes: [
            'class_declaration', // Class declaration
            'class_expression'   // Class expression
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
            'constructor_declaration'  // Constructor declaration in a class
        ],
        classes: [
            'class_declaration',       // Class declaration
            'interface_declaration'    // Interface declaration
        ],
        other: [
            'import_declaration',      // Import statement
            'package_declaration',     // Package statement
        ]
    },
    ruby: {
        functions: [
            'method',   // Represents a method definition
            'lambda',   // Represents a lambda function
        ],
        classes: [
            'class',    // Represents a class definition
            'module'    // Represents a module definition
        ],
        other: [
            'require',  // Require statement
            'if',       // If statement
            'while',    // While loop
        ]
    },
    // Add more languages as needed
};
class ASTDetectionHandler {
    constructor(parser, results, processedFunctions, processedClasses, currentAnalysisId, watchedDir, currentFile, language = 'js') {
        this.parser = parser;
        this.results = results;
        this.processedFunctions = processedFunctions || new Set();
        this.processedClasses = processedClasses || new Set();
        this.currentAnalysisId = currentAnalysisId;
        this.watchedDir = watchedDir;
        this.currentFile = currentFile;
        this.importedModules = new Set();
        this.currentClassId = null;
        this.currentFunctionId = null;
        this.functionNameToId = new Map();
        this.parentNodeId = null;
        this.parentStack = [];

        this.functionHandler = new FunctionHandler(this);
        this.classHandler = new ClassHandler(this);

        // Retrieve node types from the language configuration
        this.functionTypes = langs[language]?.functions || [];
        this.classTypes = langs[language]?.classes || [];
        this.otherTypes = langs[language]?.other || [];

        this.initializeResults();
    }

    initializeResults() {
        this.results.directRelationships = this.results.directRelationships || {};
        this.results.rootFunctionIds = this.results.rootFunctionIds || [];
        this.results.functionCallRelationships = this.results.functionCallRelationships || {};
        this.results.allDeclarations = this.results.allDeclarations || {};
    }

    isInWatchedDir(filePath) {
        const relativePath = path.relative(this.watchedDir, filePath);
        return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    }

    getUniqueId(code) {
        return crypto.createHash('sha256').update(code).digest('hex');
    }

    isFunctionNode(nodeType) {
        return this.functionTypes.includes(nodeType);
    }

    isClassNode(nodeType) {
        return this.classTypes.includes(nodeType);
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

        if (type === 'function' || type === 'method' || type === 'arrow_function') {
            this.functionNameToId.set(name, id);
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

    traverse(cursor, parentPath = '', parentId = null, isRootLevel = true) {
        // Initialize the stack to manage parent IDs




        do {
            const node = cursor.currentNode;
            if (!node) return;

            const nodeType = node.type;
            const nodeCode = node.text;
            const currentNodeId = this.getUniqueId(nodeCode);

            const isFunction = this.isFunctionNode(nodeType);
            const isClass = this.isClassNode(nodeType);

            // Handle 'program' node type
            if (nodeType === 'program') {
                if (cursor.gotoFirstChild()) {
                    this.traverse(cursor, parentPath, null, true);
                    cursor.gotoParent();
                }
            } else if (isFunction || isClass) {
                // Handle function and class nodes
                if (isFunction) this.functionHandler.handleNode(node, parentPath, this.parentStack[this.parentStack.length - 1]);

                if (isClass) this.classHandler.handleNode(node, parentPath, this.parentStack[this.parentStack.length - 1]);

                // Update parentNodeId to current node's ID for child nodes
                this.parentStack.push(currentNodeId);

                if (isRootLevel) {
                    this.addRootLevelRelationship(currentNodeId);
                }

                if (cursor.gotoFirstChild()) {
                    // Traverse child nodes with updated parentNodeId
                    this.traverse(cursor, `${parentPath}${nodeType}-`, currentNodeId, false);
                    cursor.gotoParent();
                }

                // Pop the parent ID from the stack when backtracking
                this.parentStack.pop();

            } else {
                // Handle other node types
                if (cursor.gotoFirstChild()) {
                    // Traverse child nodes, keeping the parentId from the stack
                    this.traverse(cursor, `${parentPath}${nodeType}-`, this.parentStack[this.parentStack.length - 1], isRootLevel);
                    cursor.gotoParent();
                }
            }

        } while (cursor.gotoNextSibling());

        this.finalizeRelationships();
    }


    finalizeRelationships() {
        if (this.results.functionCallRelationships) {
            for (const [key, value] of Object.entries(this.results.functionCallRelationships)) {
                this.results.functionCallRelationships[key] = Array.from(value);
            }
        }
    }
}

export default ASTDetectionHandler;
