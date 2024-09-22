class ClassHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId, startPosition, endPosition, nodeType) {

        const className = this.getClassName(node);

        if (className && this.shouldProcessClass(className)) {
            const path = `${parentPath}${className}`;
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
                    this.addClassRelationship(id, parentId);
                }

                this.astAnalyzer.processedClasses.add(className);

                return id;
            }
        }
        return null;
    }

    extractClassName(node) {
        let className = node.childForFieldName('id')?.text;

        // Handle anonymous classes assigned to a variable
        if (!className && node.parent && (node.parent.type === 'variable_declarator' || node.parent.type === 'assignment_expression')) {
            className = node.parent.childForFieldName('id')?.text;
        }

        // Handle classes within object literals or as object properties
        if (!className && node.parent && node.parent.type === 'property') {
            className = node.parent.childForFieldName('key')?.text;
        }

        return className || 'anonymous';
    }

    getClassName(node) {
        let name = this.extractClassName(node);
        if (!name) {
            name = this.getNameFromParent(node);
        }
        return name || 'anonymous';
    }

    getNameFromParent(node) {
        const parent = node.parent;
        if (parent) {
            if (parent.type === 'property') {
                return parent.childForFieldName('key')?.text;
            }
            if (['variable_declarator', 'assignment_expression'].includes(parent.type)) {
                return parent.childForFieldName('id')?.text;
            }
        }
        return null;
    }

    shouldProcessClass(name) {
        return !this.astAnalyzer.importedModules.has(name) &&
            !this.astAnalyzer.processedClasses.has(name) &&
            this.astAnalyzer.isInWatchedDir(this.astAnalyzer.currentFile);
    }

    getClassType(node) {
        return node.type === 'class_declaration' || node.type === 'class_expression' ? 'class' : 'unknown';
    }

    addClassRelationship(id, parentId) {
        if (parentId) {
            if (this.astAnalyzer.results.allDeclarations[parentId]) {
                this.addDirectRelationship(parentId, id);
            }
        }
    }

    addDirectRelationship(parentId, childId) {
        this.astAnalyzer.results.directRelationships[parentId] = this.astAnalyzer.results.directRelationships[parentId] || [];
        this.astAnalyzer.results.directRelationships[parentId].push(childId);
    }

    traverseClassBody(node, path, classId) {
        const bodyNode = node.childForFieldName('body');
        if (bodyNode) {
            const cursor = bodyNode.walk();
            if (cursor.gotoFirstChild()) {
                do {
                    const childNode = cursor.currentNode;
                    if (this.astAnalyzer.isClassNode(childNode.type)) {
                        this.handleNode(childNode, path, classId);
                    }
                } while (cursor.gotoNextSibling());
            }
        }
    }
}

export default ClassHandler;
