class ClassHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId) {
        const className = this.getClassName(node);

        if (className && this.shouldProcessClass(className)) {
            const path = `${parentPath}${className}`;
            const id = this.astAnalyzer.addDeclaration(className, this.getClassType(node), path, node.text);

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
        let className = null;

        // Handle S3 classes defined by the 'class' attribute
        if (node.type === 'function_call' && node.text.includes('class')) {
            className = node.parent?.childForFieldName('left')?.text || null;
        }

        // Handle S4 classes defined by setClass
        if (node.type === 'function_call' && node.text.includes('setClass')) {
            const classArgNode = node.childForFieldName('arguments')?.child(0);
            if (classArgNode) {
                className = classArgNode.text;
            }
        }

        // Handle R6 classes defined by R6Class
        if (node.type === 'function_call' && node.text.includes('R6Class')) {
            const classArgNode = node.childForFieldName('arguments')?.child(0);
            if (classArgNode) {
                className = classArgNode.text;
            }
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
        if (parent && parent.type === 'assignment') {
            return parent.childForFieldName('left')?.text;
        }
        return null;
    }

    shouldProcessClass(name) {
        return !this.astAnalyzer.importedModules.has(name) &&
            !this.astAnalyzer.processedClasses.has(name) &&
            this.astAnalyzer.isInWatchedDir(this.astAnalyzer.currentFile);
    }

    getClassType(node) {
        if (node.type === 'function_call' && node.text.includes('setClass')) {
            return 'S4_class';
        } else if (node.type === 'function_call' && node.text.includes('R6Class')) {
            return 'R6_class';
        } else if (node.type === 'function_call' && node.text.includes('class')) {
            return 'S3_class';
        }
        return 'unknown';
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
