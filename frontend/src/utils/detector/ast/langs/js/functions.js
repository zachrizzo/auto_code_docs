// jsfunctions.js
class FunctionHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId) {
        const functionName = this.getFunctionName(node);

        // Handle anonymous functions by assigning a unique name
        let name = functionName;
        if (!name || name === 'anonymous') {
            name = `anonymous_${this.astAnalyzer.getUniqueId(node.text)}`;
        }

        if (this.shouldProcessFunction(name)) {
            const path = `${parentPath}${name}`;
            const id = this.astAnalyzer.addDeclaration(name, this.getFunctionType(node), path, node.text);

            if (id) {
                if (parentId) {
                    this.addFunctionRelationship(id, parentId);
                }

                this.astAnalyzer.processedFunctions.add(name);

                // Traverse the function body to detect nested functions
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
                    } else if (this.astAnalyzer.isCalledNode(childNode.type)) {
                        this.astAnalyzer.addFunctionCallRelationship(childNode);
                    }
                } while (cursor.gotoNextSibling());
            }
        }
    }
}

export default FunctionHandler;
