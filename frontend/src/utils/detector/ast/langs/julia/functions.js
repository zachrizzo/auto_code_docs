class FunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId) {
        const functionName = this.getFunctionName(node);
        const functionType = this.getFunctionType(node);

        if (functionName && this.shouldProcessFunction(functionName)) {
            const path = `${parentPath}${functionName}`;
            const id = this.astAnalyzer.addDeclaration(functionName, functionType, path, node.text);

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
        console.log(`Extracting function name from node type: ${node.type}`);

        if (node.type === 'function_definition') {
            const signatureNode = node.namedChildren.find(child => child.type === 'signature');
            if (signatureNode) {
                const callExpressionNode = signatureNode.namedChildren.find(child => child.type === 'call_expression');
                if (callExpressionNode) {
                    const identifierNode = callExpressionNode.namedChildren.find(child => child.type === 'identifier');
                    if (identifierNode) {
                        return identifierNode.text;
                    }
                }
            }
        } else if (node.type === 'assignment') {
            const leftSide = node.namedChildren[0]; // The left side of the assignment
            if (leftSide.type === 'call_expression') {
                // This is likely a short-form function definition
                const identifierNode = leftSide.namedChildren.find(child => child.type === 'identifier');
                if (identifierNode) {
                    return identifierNode.text;
                }
            } else if (leftSide.type === 'identifier') {
                // This is a regular assignment, which we'll treat as a function if the right side is a function
                const rightSide = node.namedChildren[1];
                if (rightSide && (rightSide.type === 'function_definition' || rightSide.type === 'lambda')) {
                    return leftSide.text;
                }
            }
        }

        console.log('Function name not found');
        return null;
    }

    getFunctionName(node) {
        console.log(`Getting function name for node:`, JSON.stringify(node, null, 2));

        let name = this.extractFunctionName(node);
        console.log(`Extracted name: ${name}`);

        if (!name) {
            name = this.getNameFromParent(node);
            console.log(`Name from parent: ${name}`);
        }

        return name || 'anonymous';
    }

    getNameFromParent(node) {
        const parent = node.parent;
        if (parent) {
            if (parent.type === 'assignment') {
                return parent.childForFieldName('left')?.text;
            }
            if (parent.type === 'macro_definition') {
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
                    }
                } while (cursor.gotoNextSibling());
            }
        }
    }
}

export default FunctionHandler;
