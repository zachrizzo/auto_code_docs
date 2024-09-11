class FunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId) {
        const functionName = this.getFunctionName(node);

        // Handle anonymous functions and name them later if needed
        if (functionName && functionName !== 'anonymous' && this.shouldProcessFunction(functionName)) {
            const path = `${parentPath}${functionName}`;
            const id = this.astAnalyzer.addDeclaration(functionName, this.getFunctionType(node), path, node.text);

            if (id) {
                if (parentId) {
                    this.addFunctionRelationship(id, parentId);
                }

                this.astAnalyzer.processedFunctions.add(functionName);

                return id;
            }
        }
        return null;
    }

    extractFunctionName(node) {
        let functionName = node.childForFieldName('name')?.text;

        // Handle function names in short-form function definitions (assignment)
        if (!functionName && (node.type === 'assignment' || node.type === 'function_definition')) {
            const parent = node.parent;
            if (parent.type === 'assignment') {
                functionName = parent.childForFieldName('left')?.text;
            }
        }

        // Handle function names in macro definitions
        if (!functionName && node.type === 'macro_definition') {
            functionName = node.childForFieldName('name')?.text;
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
            return 'function';
        }
        if (node.type === 'assignment') {
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
        const bodyNode = node.childForFieldName('body');
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
