class FunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId) {
        const functionName = this.getFunctionName(node);

        if (functionName && this.shouldProcessFunction(functionName)) {
            const path = `${parentPath}${functionName}`;
            const id = this.astAnalyzer.addDeclaration(functionName, this.getFunctionType(node), path, node.text);

            if (id) {
                // ParentId is dynamically fetched via ASTDetectionHandler method
                if (parentId) {
                    this.addFunctionRelationship(id, parentId);
                }

                // this.traverseFunctionBody(node, path, id);
                this.astAnalyzer.processedFunctions.add(functionName);

                return id;
            }
        }
        return null;
    }
    extractFunctionName(node) {
        let functionName = node.childForFieldName('name')?.text;

        // Check if this function is part of an object literal
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
        return name || 'anonymous';
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
        if (parentId) {
            // If there is a parent function, establish a child-parent relationship
            if (this.astAnalyzer.results.allDeclarations[parentId]) { // Ensure parentId exists in declarations
                this.addDirectRelationship(parentId, id);
            }
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
                        // Handle nested functions and establish parent-child relationship
                        this.handleNode(childNode, path, functionId); // Correctly pass the current functionId as parentId
                    }
                } while (cursor.gotoNextSibling());
            }
        }
    }
}

export default FunctionHandler;
