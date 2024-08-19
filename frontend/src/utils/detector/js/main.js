//JsDetectionHandler.js
class JsDetectionHandler {
    constructor(parser, results, processedFunctions, currentAnalysisId) {
        this.parser = parser;
        this.results = results;
        this.processedFunctions = processedFunctions;
        this.currentAnalysisId = currentAnalysisId;
    }

    addDeclaration(name, type, path, code) {
        const id = this.generateUniqueId();
        const declaration = {
            id,
            name,
            type,
            path,
            code,
            analysisId: this.currentAnalysisId
        };
        this.results.allDeclarations[id] = declaration;
        console.log('Declaration added:', declaration);
        return id;
    }

    generateUniqueId() {
        return Math.random().toString(36).substr(2, 9);
    }

    detectFunction(node, parentPath, parentId, currentFunctionId, cursor) {
        let functionName = node.childForFieldName('name')?.text;
        if (!functionName && (node.type === 'arrow_function' || node.type === 'function')) {
            const parent = node.parent;
            if (parent.type === 'variable_declarator') {
                functionName = parent.childForFieldName('name')?.text;
            }
        }
        if (functionName && (!this.processedFunctions || !this.processedFunctions.has(functionName))) {
            const path = `${parentPath}${functionName}`;
            const id = this.addDeclaration(functionName, 'function', path, node.text);
            if (id) {
                this.results.functions.push({ id, parentFunctionId: currentFunctionId });
                this.results.directRelationships[id] = [];
                this.results.indirectRelationships[id] = [];

                // If this function is at the root level (no parent function or class)
                if (!currentFunctionId && !parentId) {
                    this.results.rootFunctionIds = this.results.rootFunctionIds || [];
                    this.results.rootFunctionIds.push(id);
                }

                if (currentFunctionId) {
                    this.results.directRelationships[currentFunctionId] = this.results.directRelationships[currentFunctionId] || [];
                    this.results.directRelationships[currentFunctionId].push(id);
                } else if (parentId) {
                    this.results.directRelationships[parentId] = this.results.directRelationships[parentId] || [];
                    this.results.directRelationships[parentId].push(id);
                }
                this.analyzeMethodBody(node, id, this.results);

                if (!this.processedFunctions) {
                    this.processedFunctions = new Set();
                }
                this.processedFunctions.add(functionName);

                if (cursor.gotoFirstChild()) {
                    this.traverse(cursor, `${path}-`, parentId, id);
                    cursor.gotoParent();
                }
            }
            return id;
        }
        return null;
    }

    detectJSXElement(node, parentPath, parentId, currentFunctionId) {
        const componentName = node.childForFieldName('name')?.text;
        if (componentName && !this.processedFunctions.has(componentName)) {
            const path = `${parentPath}${componentName}`;
            const id = this.addDeclaration(componentName, 'component', path, node.text);
            this.addToResults(id, currentFunctionId, parentId, path);
            this.processedFunctions.add(componentName);
        }
    }

    detectReactFunctionalComponent(node, parentPath, parentId, currentFunctionId) {
        let functionName = node.childForFieldName('name')?.text;
        if (functionName && node.text.includes('return <')) {
            const path = `${parentPath}${functionName}`;
            const id = this.addDeclaration(functionName, 'react_component', path, node.text);
            this.addToResults(id, currentFunctionId, parentId, path);
            this.processedFunctions.add(functionName);
        }
    }

    detectReactClassComponent(node, parentPath, parentId) {
        const className = node.childForFieldName('name')?.text;
        if (className) {
            const path = `${parentPath}${className}`;
            const id = this.addDeclaration(className, 'react_class', path, node.text);
            this.results.classes.push({ id });
            this.addToResults(id, null, parentId, path);
            this.processedFunctions.add(className);
        }
    }

    detectReactHooks(node, parentPath, currentFunctionId) {
        const callName = node.childForFieldName('function')?.text;
        if (callName && callName.startsWith('use')) {
            const id = this.addDeclaration(callName, 'hook', parentPath, node.text);
            this.addToResults(id, currentFunctionId, null, parentPath);
        }
    }

    detectHOC(node, parentPath, currentFunctionId) {
        const callName = node.childForFieldName('function')?.text;
        if (callName && this.isComponent(callName)) {
            const wrappedComponent = node.childForFieldName('arguments')?.firstChild?.text;
            if (wrappedComponent && this.processedFunctions.has(wrappedComponent)) {
                this.results.directRelationships[currentFunctionId].push(wrappedComponent);
            }
        }
    }

    detectDynamicImport(node, parentPath, currentFunctionId) {
        const importPath = node.childForFieldName('source')?.text;
        if (importPath) {
            const dynamicImportId = this.addDeclaration(importPath, 'dynamic_import', parentPath, node.text);
            this.addToResults(dynamicImportId, currentFunctionId, null, parentPath);
        }
    }

    detectEventListener(node, parentPath, currentFunctionId) {
        if (node.childForFieldName('function')?.text === 'addEventListener') {
            const callbackFunction = node.childForFieldName('arguments')?.child(1)?.text;
            if (callbackFunction) {
                const callbackId = this.addDeclaration(callbackFunction, 'event_listener', parentPath, node.text);
                this.addToResults(callbackId, currentFunctionId, null, parentPath);
            }
        }
    }

    detectPromiseCallbacks(node, parentPath, currentFunctionId) {
        if (node.childForFieldName('function')?.text === 'then') {
            const callbackFunction = node.childForFieldName('arguments')?.child(0)?.text;
            if (callbackFunction) {
                const callbackId = this.addDeclaration(callbackFunction, 'promise_callback', parentPath, node.text);
                this.addToResults(callbackId, currentFunctionId, null, parentPath);
            }
        }
    }

    addToResults(id, currentFunctionId, parentId, path) {
        this.results.functions.push({ id, parentFunctionId: currentFunctionId });
        this.results.directRelationships[id] = [];
        this.results.indirectRelationships[id] = [];
        if (!currentFunctionId && !parentId) {
            this.results.rootFunctionIds.push(id);
        }
        if (currentFunctionId) {
            this.results.directRelationships[currentFunctionId].push(id);
        } else if (parentId) {
            this.results.directRelationships[parentId].push(id);
        }
    }

    analyzeMethodBody(node, id) {
        // Implement method body analysis logic here
    }

    traverse(cursor, parentPath = '', parentId = null, currentFunctionId = null) {
        do {
            const node = cursor.currentNode;
            const type = node.type;

            if (
                type === 'function_declaration' ||
                type === 'function' ||
                type === 'arrow_function' ||
                type === 'generator_function' ||
                type === 'async_function'
            ) {
                this.detectFunction(node, parentPath, parentId, currentFunctionId, cursor);

            } else if (cursor.gotoFirstChild()) {
                this.traverse(cursor, `${parentPath}${node.type}-`, parentId, currentFunctionId);
                cursor.gotoParent();
            }
        } while (cursor.gotoNextSibling());
    }

    isComponent(callName) {
        // Implement logic to check if the callName corresponds to a known component
        return true; // Placeholder, replace with actual logic
    }
}

export default JsDetectionHandler;
