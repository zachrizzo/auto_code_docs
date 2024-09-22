// langs/julia/classes.js

class JuliaClassHandler {
    constructor(astAnalyzer) {
        this.astAnalyzer = astAnalyzer;
    }

    handleNode(node, parentPath, parentId, startPosition, endPosition, nodeType) {
        const className = this.getClassName(node);
        const classType = this.getClassType(node);

        if (className && this.shouldProcessClass(className)) {
            const path = `${parentPath}${className}`;
            const id = this.astAnalyzer.addDeclaration(
                className,
                classType,
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

                // Traverse the class body to detect nested types and functions
                this.traverseClassBody(node, path, id);

                return id;
            }
        }
        return null;
    }

    extractClassName(node) {
        let className = node.childForFieldName('name')?.text;

        // Handle anonymous structs assigned to a variable
        if (!className && node.parent && node.parent.type === 'assignment') {
            className = node.parent.childForFieldName('left')?.text;
        }

        return className || null;
    }

    getClassName(node) {
        let name = this.extractClassName(node);
        if (!name) {
            name = this.getNameFromParent(node);
        }
        return name || null;
    }

    getNameFromParent(node) {
        const parent = node.parent;
        if (parent && parent.type === 'assignment') {
            const leftSide = parent.childForFieldName('left');
            if (leftSide && leftSide.type === 'identifier') {
                return leftSide.text;
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
        if (node.type === 'struct_definition') {
            return 'struct';
        } else if (node.type === 'abstract_definition') {
            return 'abstract';
        } else if (node.type === 'primitive_definition') {
            return 'primitive';
        } else if (node.type === 'module_definition') {
            return 'module';
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
                    } else if (this.astAnalyzer.isFunctionNode(childNode.type)) {
                        // Handle functions defined within the class/module
                        this.astAnalyzer.functionHandler.handleNode(childNode, path, classId);
                    } else if (childNode.namedChildCount > 0) {
                        // Recursively traverse other nodes
                        this.traverseClassBody(childNode, path, classId);
                    }
                } while (cursor.gotoNextSibling());
            }
        }
    }
}

export default JuliaClassHandler;
