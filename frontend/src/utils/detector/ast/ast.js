
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
        this.currentFunctionName = null;
        this.currentFunctionId = null;
        this.functionNameToId = new Map();
        this.functionCallsMap = {};

        this.functionHandler = new FunctionHandler(this);

        // Retrieve node types from the language configuration
        this.functionTypes = langs[language]?.functions || [];
        this.classTypes = langs[language]?.classes || [];
        this.otherTypes = langs[language]?.other || [];

        this.initializeResults();
    }

    initializeResults() {
        this.results.methods = this.results.methods || [];
        this.results.functions = this.results.functions || [];
        this.results.classes = this.results.classes || [];
        this.results.directRelationships = this.results.directRelationships || {};
        this.results.rootFunctionIds = this.results.rootFunctionIds || [];
        this.results.functionCalls = this.results.functionCalls || {};
        this.results.functionCallRelationships = this.results.functionCallRelationships || {};
        this.results.allDeclarations = this.results.allDeclarations || {};
    }



    isInWatchedDir(filePath) {
        const relativePath = path.relative(this.watchedDir, filePath);
        return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    }

    getUniqueId(code) {
        let hashedId = crypto.createHash('sha256').update(code).digest('hex');

        return hashedId
    }

    isFunctionNode(nodeType) {
        console.log('nodeType:', nodeType, this.functionTypes, this.functionTypes.includes(nodeType));

        return this.functionTypes.includes(nodeType);
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

    traverse(cursor, parentPath = '', parentId = null) {
        do {
            const node = cursor.currentNode;
            if (!node) return;

            const nodeType = node.type;
            const nodeCode = node.text;
            const currentNodeId = this.getUniqueId(nodeCode); // Assuming getNodeId is a method to get a unique ID for the node

            if (nodeType === 'program') {
                // Traverse the children of the program node
                if (cursor.gotoFirstChild()) {
                    // Recursively traverse all children nodes
                    this.traverse(cursor, parentPath, null);
                    cursor.gotoParent(); // Return to the parent node after traversing children
                }
            } else if (this.isFunctionNode(nodeType)) {
                // Handle function nodes (including arrow functions and other types)
                this.functionHandler.handleNode(node, parentPath, parentId);

                // Recursively traverse function node's children
                if (cursor.gotoFirstChild()) {
                    this.traverse(cursor, `${parentPath}${nodeType}-`, currentNodeId);
                    cursor.gotoParent(); // Return to the parent node after traversing children
                }
            } else {
                // For non-program and non-function nodes, continue traversing children
                if (cursor.gotoFirstChild()) {
                    this.traverse(cursor, `${parentPath}${nodeType}-`, currentNodeId);
                    cursor.gotoParent(); // Return to the parent node after traversing children
                }
            }

        } while (cursor.gotoNextSibling()); // Continue with the next sibling node

        this.finalizeRelationships();
    }









    extractFunctionName(node) {
        if (node.type === 'arrow_function') {
            return this.findArrowFunctionName(node);
        }
        return node.childForFieldName('name')?.text ||
            (node.parent?.type === 'variable_declarator' ? node.parent.childForFieldName('name')?.text : null);
    }

    findArrowFunctionName(node) {
        if (node.parent && node.parent.type === 'variable_declarator') {
            const varNameNode = node.parent.childForFieldName('name');
            return varNameNode ? varNameNode.text : 'anonymous';
        }
        if (node.parent && node.parent.type === 'assignment_expression') {
            const leftNode = node.parent.childForFieldName('left');
            return leftNode ? leftNode.text : 'anonymous';
        }
        return 'anonymous';
    }

    traverseChildren(node, parentPath, parentId) {
        const children = node.namedChildren || node.children;

        if (children && typeof children[Symbol.iterator] === 'function') {
            for (let child of children) {
                // Check if the child is an arrow function or other function type
                if (child.type === 'arrow_function' ||
                    child.type === 'function_expression' ||
                    child.type === 'function_declaration' ||
                    child.type === 'jsx_expression') {

                    // Handle the arrow function node here
                    console.log(`Found function type: ${child.type} at path: ${parentPath}`);
                }

                // Continue traversing deeper into the node's children
                this.traverse(child, `${parentPath}${node.type}-`, parentId);
            }
        }
    }


    finalizeRelationships() {
        if (this.results.functionCalls) {
            for (const [key, value] of Object.entries(this.results.functionCalls)) {
                this.results.functionCalls[key] = Array.from(value);
            }
        }

        if (this.results.functionCallRelationships) {
            for (const [key, value] of Object.entries(this.results.functionCallRelationships)) {
                if (!Array.isArray(value)) {
                    this.results.functionCallRelationships[key] = Array.from(value);
                }
            }
        }
    }




    processFunctionCall(node) {
        const calleeNode = node.childForFieldName('function');
        if (calleeNode) {
            const calleeName = calleeNode.text;
            const callerId = this.currentClassId || this.functionNameToId.get(this.currentFunctionName);
            const calleeId = this.functionNameToId.get(calleeName);

            if (callerId && calleeId && callerId !== calleeId) {
                this.results.functionCallRelationships[callerId] = this.results.functionCallRelationships[callerId] || [];
                this.results.functionCallRelationships[callerId].push(calleeId);

                this.results.directRelationships[callerId] = this.results.directRelationships[callerId] || [];
                this.results.directRelationships[callerId].push(calleeId);
            }
        }
    }


    analyzeMethodBody(node, id) {
        // Implement method body analysis logic here if needed
    }
}

export default ASTDetectionHandler;
