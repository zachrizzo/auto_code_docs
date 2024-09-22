class FunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId, nodeType) {
        const functionName = this.getFunctionName(node);
        const startPosition = node.startPosition;
        const endPosition = node.endPosition;

        if (functionName && functionName !== 'anonymous' && this.shouldProcessFunction(functionName)) {
            const path = `${parentPath}${functionName}`;
            const id = this.astAnalyzer.addDeclaration(
                functionName,
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

                this.astAnalyzer.processedFunctions.add(functionName);

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

        if (!functionName && (node.type === 'lambda' || node.type === 'function_definition')) {
            const parent = node.parent;
            if (parent.type === 'assignment') {
                functionName = parent.childForFieldName('left')?.text;
            }
        }

        return functionName;
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
            if (parent.type === 'pair') {
                return parent.childForFieldName('key')?.text;
            }
            if (parent.type === 'assignment') {
                return parent.childForFieldName('left')?.text;
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
        if (node.type === 'async_function_definition') {
            return 'async_function';
        }
        if (node.type === 'lambda') {
            return 'lambda_function';
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
        const bodyNode = node.childForFieldName('body');
        if (bodyNode) {
            const cursor = bodyNode.walk();
            if (cursor.gotoFirstChild()) {
                do {
                    const childNode = cursor.currentNode;
                    if (this.astAnalyzer.isFunctionNode(childNode.type)) {
                        this.handleNode(childNode, path, functionId, childNode.type);
                    }
                } while (cursor.gotoNextSibling());
            }
        }
    }

}

export default FunctionHandler;
