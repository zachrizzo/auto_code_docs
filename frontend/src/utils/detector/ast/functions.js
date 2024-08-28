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
                this.addFunctionToResults(id, node, parentId);
                this.astAnalyzer.analyzeMethodBody(node, id, this.astAnalyzer.results);
                this.astAnalyzer.processedFunctions.add(functionName);
                this.traverseFunctionBody(node, path, parentId, id);
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

        return functionName
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

    addFunctionToResults(id, node, parentId) {
        if (this.isMethod(node)) {
            this.addMethod(id, parentId);
        } else {
            this.addFunction(id, parentId);
        }
    }

    isMethod(node) {
        return node.type === 'method_definition' || (node.parent && node.parent.type === 'pair');
    }

    addMethod(id, parentId) {
        this.astAnalyzer.results.methods.push({ id, parentClassId: this.currentClassId || parentId });
        this.addDirectRelationship(parentId, id);
    }

    addFunction(id, parentId) {
        this.astAnalyzer.results.functions.push({ id, parentFunctionId: this.currentFunctionId });
        this.astAnalyzer.results.directRelationships[id] = [];
        this.addFunctionRelationship(id, parentId);
    }

    addFunctionRelationship(id, parentId) {
        if (!this.currentFunctionId && !parentId) {
            this.astAnalyzer.results.rootFunctionIds.push(id);
        } else if (this.currentFunctionId) {
            this.addDirectRelationship(this.currentFunctionId, id);
        } else if (parentId) {
            this.addDirectRelationship(parentId, id);
        }
    }

    addDirectRelationship(parentId, childId) {
        this.astAnalyzer.results.directRelationships[parentId] = this.astAnalyzer.results.directRelationships[parentId] || [];
        this.astAnalyzer.results.directRelationships[parentId].push(childId);
    }

    traverseFunctionBody(node, path, parentId, functionId) {
        const bodyNode = node.childForFieldName('body');
        if (bodyNode && bodyNode.cursor && bodyNode.cursor.gotoFirstChild()) {
            this.traverse(bodyNode.cursor, `${path}-`, parentId, functionId);
            bodyNode.cursor.gotoParent();
        }
    }
}

export default FunctionHandler;
