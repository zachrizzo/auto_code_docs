import crypto from 'crypto';

class JsDetectionHandler {
    constructor(parser, results, processedFunctions, currentAnalysisId) {
        this.parser = parser;
        this.results = results;
        this.processedFunctions = processedFunctions || new Set();
        this.currentAnalysisId = currentAnalysisId;
    }

    addDeclaration(name, type, path, code) {
        const id = this.generateUniqueId(code);
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

    generateUniqueId(code) {
        return crypto.createHash('sha256').update(code).digest('hex');
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

    detectClass(node, parentPath, parentId) {
        if (!node) {
            return null;
        }

        const className = node.childForFieldName('name')?.text;
        if (className && (!this.processedFunctions || !this.processedFunctions.has(className))) {
            const path = `${parentPath}${className}`;
            const id = this.addDeclaration(className, 'class', path, node.text);
            this.results.classes.push({ id });
            this.addToResults(id, null, parentId, path);

            this.processedFunctions.add(className);

            const bodyNode = node.childForFieldName('body');
            if (bodyNode && bodyNode.cursor && bodyNode.cursor.gotoFirstChild()) {
                this.traverse(bodyNode.cursor, `${path}-`, id);
                bodyNode.cursor.gotoParent();
            }
            return id;
        }
        return null;
    }

    detectClassMethod(node, parentPath, parentId) {
        const methodName = node.childForFieldName('name')?.text;
        if (methodName && (!this.processedFunctions || !this.processedFunctions.has(methodName))) {
            const path = `${parentPath}${methodName}`;
            const id = this.addDeclaration(methodName, 'method', path, node.text);
            this.results.methods.push({ id, parentClassId: parentId });
            this.addToResults(id, null, parentId, path);

            this.processedFunctions.add(methodName);

            if (node.childForFieldName('body')) {
                const bodyCursor = node.childForFieldName('body').cursor;
                if (bodyCursor.gotoFirstChild()) {
                    this.traverse(bodyCursor, `${path}-`, parentId);
                    bodyCursor.gotoParent();
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
            if (wrappedComponent && (this.processedFunctions?.has(wrappedComponent) || false)) {
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
                type === 'async_function' ||
                type === 'method_definition' // Detect class methods
            ) {
                this.detectFunction(node, parentPath, parentId, currentFunctionId, cursor);

            } else if (type === 'class_declaration') {
                this.detectClass(node, parentPath, parentId);

            } else if (type === 'method_definition') {
                this.detectClassMethod(node, parentPath, parentId);

            } else if (type === 'jsx_element') {
                this.detectJSXElement(node, parentPath, parentId, currentFunctionId);

            } else if (type === 'arrow_function' || type === 'function') {
                this.detectReactFunctionalComponent(node, parentPath, parentId, currentFunctionId);

            } else if (type === 'class_declaration') {
                this.detectReactClassComponent(node, parentPath, parentId);

            } else if (type === 'call_expression' && node.text.includes('use')) {
                this.detectReactHooks(node, parentPath, currentFunctionId);

            } else if (type === 'call_expression' && this.isComponent(node.childForFieldName('function')?.text)) {
                this.detectHOC(node, parentPath, currentFunctionId);

            } else if (type === 'call_expression' && node.text.includes('import(')) {
                this.detectDynamicImport(node, parentPath, currentFunctionId);

            } else if (type === 'call_expression' && node.text.includes('addEventListener')) {
                this.detectEventListener(node, parentPath, currentFunctionId);

            } else if (type === 'call_expression' && node.text.includes('.then')) {
                this.detectPromiseCallbacks(node, parentPath, currentFunctionId);

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
