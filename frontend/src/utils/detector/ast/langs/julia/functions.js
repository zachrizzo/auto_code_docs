// langs/julia/functions.js

class JuliaFunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId, startPosition, endPosition, nodeType) {
        const functionName = this.getFunctionName(node);
        const functionType = this.getFunctionType(node);

        // Handle anonymous functions
        let name = functionName;
        if (!name) {
            name = `anonymous_${this.astAnalyzer.getUniqueId(node.text)}`;
        }

        if (this.shouldProcessFunction(name)) {
            const path = `${parentPath}${name}`;
            const id = this.astAnalyzer.addDeclaration(
                name,
                functionType,
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

                // Handle function body
                this.traverseFunctionBody(node, path, id);

                return id;
            }
        }
        return null;
    }

    extractFunctionName(node) {
        if (node.type === 'function_definition') {

            const thirdChild = node.namedChild(0); // 2nd child node
            if (thirdChild) {
                const secondChild = thirdChild.namedChild(0); // 1st child of 2nd child
                if (secondChild) {
                    const firstChild = secondChild.namedChild(0); // 1st child of 1st child of 2nd child
                    if (firstChild) {
                        const functionName = firstChild.text
                        return functionName

                    }
                }
            }
        } else if (node.type === 'assignment') {
            const leftSide = node.childForFieldName('left');
            if (leftSide) {
                if (leftSide.type === 'identifier') {
                    return leftSide.text;
                } else if (leftSide.type === 'call_expression') {
                    const identifierNode = leftSide.namedChildren.find(child => child.type === 'identifier');
                    if (identifierNode) {
                        return identifierNode.text;
                    }
                }
            }
        } else if (node.type === 'macro_definition') {
            const nameNode = node.childForFieldName('name');
            if (nameNode && nameNode.type === 'identifier') {
                return `@${nameNode.text}`; // Macros are prefixed with '@'
            }
        }
        return null;
    }

    getFunctionName(node) {
        const name = this.extractFunctionName(node);
        return name || null;
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
                return 'function';
            } else if (rightSide && rightSide.type === 'binary_expression') {
                return 'short_function';
            }
            return 'assignment';
        }
        if (node.type === 'macro_definition') {
            return 'macro';
        }
        if (node.type === 'operator_definition') {
            return 'operator_definition';
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
                    // Recursively traverse child nodes
                    if (childNode.namedChildCount > 0) {
                        if (!['identifier', 'string', 'number', 'keyword', 'operator'].includes(childNode.type)) {
                            this.traverseFunctionBody(childNode, path, functionId);
                        }
                    }
                } while (cursor.gotoNextSibling());
            }
        }
    }

    getCalledFunctionName(node) {
        if (this.astAnalyzer.isCalledNode(node.type)) {
            const functionNode = node.childForFieldName('function') || node.namedChildren[0];

            if (functionNode) {
                if (functionNode.type === 'identifier') {
                    // Simple function call
                    return functionNode.text;
                } else if (functionNode.type === 'field_expression') {
                    // Method call or module function call
                    const objectNode = functionNode.childForFieldName('value');
                    const propertyNode = functionNode.childForFieldName('name');
                    if (objectNode && propertyNode) {
                        return `${objectNode.text}.${propertyNode.text}`;
                    }
                } else if (functionNode.type === 'macro_expression') {
                    // Macro call
                    return functionNode.text;
                }
            }
        }
        return null;
    }
}

export default JuliaFunctionHandler;
