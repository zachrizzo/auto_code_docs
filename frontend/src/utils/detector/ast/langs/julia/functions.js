// juliafunctions.js

class FunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId) {
        const functionName = this.getFunctionName(node);
        const functionType = this.getFunctionType(node);

        if (functionName && this.shouldProcessFunction(functionName)) {
            const path = `${parentPath}${functionName}`;
            // Pass node as an argument
            const id = this.astAnalyzer.addDeclaration(functionName, functionType, path, node.text, node);

            if (id) {
                if (parentId) {
                    this.addFunctionRelationship(id, parentId);
                }

                this.astAnalyzer.processedFunctions.add(functionName);

                // Handle function body
                this.traverseFunctionBody(node, path, id);

                return id;
            }
        }
        return null;
    }

    extractFunctionName(node) {
        if (node.type === 'function_definition') {
            const signatureNode = node.childForFieldName('signature');
            if (signatureNode) {
                const identifierNode = signatureNode.namedChildren.find(child => child.type === 'identifier');
                if (identifierNode) {
                    return identifierNode.text;
                }
            }
        } else if (node.type === 'assignment') {
            const leftSide = node.childForFieldName('left');
            if (leftSide.type === 'identifier') {
                return leftSide.text;
            } else if (leftSide.type === 'call_expression') {
                const identifierNode = leftSide.namedChildren.find(child => child.type === 'identifier');
                if (identifierNode) {
                    return identifierNode.text;
                }
            }
        }
        return null;
    }

    getFunctionName(node) {
        let name = this.extractFunctionName(node);
        if (!name) {
            name = this.getNameFromParent(node);
        }
        return name || 'anonymous';
    }

    getNameFromParent(node) {
        const parent = node.parent;
        if (parent) {
            if (parent.type === 'assignment') {
                return parent.childForFieldName('left')?.text;
            } else if (parent.type === 'macro_definition') {
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
        if (node.type === 'function_definition') {
            const signatureNode = node.childForFieldName('signature');
            if (signatureNode && signatureNode.childForFieldName('where_clause')) {
                return 'parametric_function';
            }
            return 'function';
        }
        if (node.type === 'assignment') {
            const rightSide = node.childForFieldName('right');
            if (rightSide && rightSide.type === 'function_definition') {
                return 'anonymous_function';
            }
            return 'short_function';
        }
        if (node.type === 'macro_definition') {
            return 'macro';
        }
        return 'function';
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
        const bodyNode = node.childForFieldName('body') || node.childForFieldName('right');
        if (bodyNode) {
            const cursor = bodyNode.walk();
            if (cursor.gotoFirstChild()) {
                do {
                    const childNode = cursor.currentNode;
                    if (this.astAnalyzer.isFunctionNode(childNode.type)) {
                        this.handleNode(childNode, path, functionId);
                    } else if (this.astAnalyzer.isCalledNode(childNode.type)) {
                        this.astAnalyzer.addFunctionCallRelationship(childNode);
                    }
                    // Recursively traverse all child nodes
                    if (childNode.namedChildCount > 0) {
                        this.traverseFunctionBody(childNode, path, functionId);
                    }
                } while (cursor.gotoNextSibling());
                cursor.gotoParent();
            }
        }
    }

    getCalledFunctionName(node) {
        if (this.astAnalyzer.isCalledNode(node.type)) {
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
}

export default FunctionHandler;
