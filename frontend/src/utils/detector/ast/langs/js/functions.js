class FunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId) {
        const functionName = this.getFunctionName(node);

        //TODO handle anonymous functions and name them later
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
    getCalledFunctionName(node) {
        if (this.astAnalyzer.isCalledNode(node.type)) {
            let functionNode = node.child(0);

            // Handle different node structures
            if (functionNode) {
                if (functionNode.type === 'identifier') {
                    return functionNode.text;
                } else if (['member_expression', 'attribute', 'field_expression'].includes(functionNode.type)) {
                    // Handle object method calls (e.g., object.method())
                    let objectName = functionNode.child(0)?.text;
                    let propertyName = functionNode.child(1)?.text;
                    if (objectName && propertyName) {
                        return `${objectName}.${propertyName}`;
                    }
                } else if (functionNode.type.includes('function')) {
                    // Handle anonymous function calls
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
