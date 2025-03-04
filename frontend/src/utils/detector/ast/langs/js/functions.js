// langs/js/functions.js

class JavaScriptFunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId, startPosition, endPosition, nodeType) {
        const functionName = this.getFunctionName(node);

        // Determine if the function is anonymous
        const isAnonymous = !functionName || functionName.includes('anonymous');

        console.log('functionName:', functionName);
        console.log('isAnonymous:', isAnonymous);

        // Skip anonymous functions if the option is disabled
        if (isAnonymous && !this.astAnalyzer.includeAnonymousFunctions) {
            // Traverse the function body with the same parentId
            this.traverseFunctionBody(node, parentPath, parentId);
            return null;
        }

        let name = functionName || `anonymous_${this.astAnalyzer.getUniqueId(node.text)}`;

        if (this.shouldProcessFunction(name)) {
            const path = `${parentPath}${name}`;
            const id = this.astAnalyzer.addDeclaration(
                name,
                this.getFunctionType(node),
                path,
                node.text,
                startPosition,
                endPosition,
                nodeType
            );

            if (id) {
                if (parentId) {
                    this.addFunctionRelationship(id, parentId);
                }

                this.astAnalyzer.processedFunctions.add(name);

                // Traverse the function body to detect nested functions and function calls
                this.traverseFunctionBody(node, path, id);

                return id;
            }
        }
        return null;
    }

    extractFunctionName(node) {
        let functionName = node.childForFieldName('name')?.text;

        if (!functionName && node.parent && node.parent.type === 'pair') {
            functionName = node.parent.childForFieldName('key')?.text;
        }

        if (!functionName && (node.type === 'arrow_function_ex' || node.type === 'function')) {
            const parent = node.parent;
            if (parent.type === 'variable_declarator' || parent.type === 'type_annotation') {
                functionName = parent.childForFieldName('name')?.text;
            }
        }

        return functionName;
    }

    getFunctionName(node) {
        let name = this.extractFunctionName(node);
        if (!name) {
            name = this.getNameFromParent(node);
        }
        return name || null; // Changed 'anonymous' to null
    }

    getNameFromParent(node) {
        const parent = node.parent;
        if (parent) {
            if (parent.type === 'pair') {
                return parent.childForFieldName('key')?.text;
            }
            if (['variable_declarator', 'type_annotation'].includes(parent.type)) {
                return parent.childForFieldName('name')?.text;
            }
        }
        return null;
    }

    shouldProcessFunction(name) {
        return !this.astAnalyzer.importedModules.has(name) &&
            !this.astAnalyzer.processedFunctions.has(name) &&
            this.astAnalyzer.isInWatchedDir(this.astAnalyzer.currentFile);
    }

    getFunctionType(node) {
        return node.type === 'method_definition' ? 'method' : 'function';
    }

    addFunctionRelationship(id, parentId) {
        if (parentId && this.astAnalyzer.results.allDeclarations[parentId]) {
            this.addDirectRelationship(parentId, id);
        }
    }

    addDirectRelationship(parentId, childId) {
        this.astAnalyzer.results.directRelationships[parentId] = this.astAnalyzer.results.directRelationships[parentId] || [];
        this.astAnalyzer.results.directRelationships[parentId].push(childId);
    }

    traverseFunctionBody(node, path, functionId) {
        const bodyNode = node.childForFieldName('body');
        if (bodyNode) {
            const cursor = bodyNode.walk();
            if (cursor.gotoFirstChild()) {
                do {
                    const childNode = cursor.currentNode;
                    if (this.astAnalyzer.isFunctionNode(childNode.type)) {
                        this.handleNode(childNode, path, functionId);
                    } else if (this.astAnalyzer.isCalledNode(childNode.type)) {
                        this.astAnalyzer.addFunctionCallRelationship(childNode);
                    } else {
                        // Recursively traverse other nodes
                        if (childNode.namedChildCount > 0) {
                            // Ensure we are not traversing tokens or keywords
                            if (!['identifier', 'string', 'number', 'keyword'].includes(childNode.type)) {
                                this.traverseFunctionBody(childNode, path, functionId);
                            }
                        }
                    }
                } while (cursor.gotoNextSibling());
            }
        }
    }
}

export default JavaScriptFunctionHandler;
