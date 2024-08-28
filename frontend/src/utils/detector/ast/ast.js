
import crypto from 'crypto';
import path from 'path';
import * as Parser from 'web-tree-sitter';
import FunctionHandler from './functions';

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
    constructor(parser, results, processedFunctions, currentAnalysisId, watchedDir, currentFile, language = 'js') {
        this.parser = parser;
        this.results = results;
        this.processedFunctions = processedFunctions || new Set();
        this.currentAnalysisId = currentAnalysisId;
        this.watchedDir = watchedDir;
        this.currentFile = currentFile;
        this.importedModules = new Set();
        this.currentClassId = null;
        this.currentFunctionId = null;
        this.functionNameToId = new Map();

        this.functionHandler = new FunctionHandler(this);

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
        let hashedId = crypto.createHash('sha256').update(code).digest('hex');
        return hashedId;
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
        do {
            const node = cursor.currentNode;
            if (!node) return;

            const nodeType = node.type;
            const nodeCode = node.text;
            const currentNodeId = this.getUniqueId(nodeCode);

            if (nodeType === 'program') {
                // Traverse the children of the program node
                if (cursor.gotoFirstChild()) {
                    this.traverse(cursor, parentPath, null, true);
                    cursor.gotoParent();
                }
            } else if (this.isFunctionNode(nodeType)) {
                this.functionHandler.handleNode(node, parentPath, parentId);

                // Only add function as root-level if it's not nested (isRootLevel is true)
                if (isRootLevel) {
                    this.addRootLevelRelationship(currentNodeId);
                }

                // Traverse function node's children
                if (cursor.gotoFirstChild()) {
                    this.traverse(cursor, `${parentPath}${nodeType}-`, currentNodeId, false);
                    cursor.gotoParent();
                }
            } else if (this.isClassNode(nodeType)) {
                // Handle class nodes logic if needed

                // Traverse class node's children
                if (cursor.gotoFirstChild()) {
                    this.traverse(cursor, `${parentPath}${nodeType}-`, currentNodeId, false);
                    cursor.gotoParent();
                }
            } else {
                // For other nodes, continue traversing
                if (cursor.gotoFirstChild()) {
                    this.traverse(cursor, `${parentPath}${nodeType}-`, currentNodeId, isRootLevel);
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
