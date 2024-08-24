import crypto from 'crypto';
import path from 'path';

class JsDetectionHandler {
    constructor(parser, results, processedFunctions, currentAnalysisId, watchedDir, currentFile) {
        this.parser = parser;
        this.results = results;
        this.results.methods = this.results.methods || [];
        this.results.functions = this.results.functions || [];
        this.results.classes = this.results.classes || [];
        this.results.directRelationships = this.results.directRelationships || {};
        this.results.rootFunctionIds = this.results.rootFunctionIds || [];
        this.processedFunctions = processedFunctions || new Set();
        this.currentAnalysisId = currentAnalysisId;
        this.watchedDir = watchedDir;
        this.currentFile = currentFile;
        this.importedModules = new Set();
        this.currentClassId = null;
        this.functionCalls = new Set();
    }


    isInWatchedDir(filePath) {
        const relativePath = path.relative(this.watchedDir, filePath);
        return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    }

    addDeclaration(name, type, path, code) {
        if (!this.isInWatchedDir(this.currentFile)) {
            return null;
        }

        if (this.importedModules.has(name)) {
            return null;
        }

        const id = this.generateUniqueId(code);
        const declaration = {
            id,
            name,
            type,
            path,
            code,
            analysisId: this.currentAnalysisId,
            file: this.currentFile
        };
        this.results.allDeclarations[id] = declaration;
        console.log('Declaration added:', declaration);
        return id;
    }

    generateUniqueId(code) {
        return crypto.createHash('sha256').update(code).digest('hex');
    }

    detectImport(node) {
        const importSource = node.childForFieldName('source')?.text;
        if (importSource) {
            const importSpecifiers = node.childForFieldName('specifiers');
            if (importSpecifiers) {
                importSpecifiers.children.forEach(specifier => {
                    const importedName = specifier.childForFieldName('local')?.text;
                    if (importedName) {
                        this.importedModules.add(importedName);
                    }
                });
            }
        }
    }

    detectFunction(node, parentPath, parentId, currentFunctionId, cursor) {
        let functionName = node.childForFieldName('name')?.text;

        if (!functionName && (node.type === 'arrow_function' || node.type === 'function')) {
            const parent = node.parent;
            if (parent.type === 'variable_declarator') {
                functionName = parent.childForFieldName('name')?.text;
            }
        }

        if (functionName && !this.importedModules.has(functionName) && !this.processedFunctions.has(functionName) && this.isInWatchedDir(this.currentFile)) {
            const path = `${parentPath}${functionName}`;
            const id = this.addDeclaration(functionName, node.type === 'method_definition' ? 'method' : 'function', path, node.text);

            if (id) {
                if (node.type === 'method_definition') {
                    this.results.methods.push({ id, parentClassId: this.currentClassId });
                    this.results.directRelationships[parentId] = this.results.directRelationships[parentId] || [];
                    this.results.directRelationships[parentId].push(id);
                } else {
                    this.results.functions.push({ id, parentFunctionId: currentFunctionId });
                    this.results.directRelationships[id] = [];

                    if (!currentFunctionId && !parentId) {
                        this.results.rootFunctionIds.push(id);
                    }

                    if (currentFunctionId) {
                        this.results.directRelationships[currentFunctionId] = this.results.directRelationships[currentFunctionId] || [];
                        this.results.directRelationships[currentFunctionId].push(id);
                    } else if (parentId) {
                        this.results.directRelationships[parentId] = this.results.directRelationships[parentId] || [];
                        this.results.directRelationships[parentId].push(id);
                    }
                }

                this.analyzeMethodBody(node, id, this.results);
                this.processedFunctions.add(functionName);

                const bodyNode = node.childForFieldName('body');
                if (bodyNode && bodyNode.cursor && bodyNode.cursor.gotoFirstChild()) {
                    this.traverse(bodyNode.cursor, `${path}-`, parentId, id);
                    bodyNode.cursor.gotoParent();
                }

                return id;
            }
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

            if (id) {
                this.currentClassId = id; // Add this line

                this.results.classes.push({ id });
                this.results.directRelationships[id] = [];
                this.processedFunctions.add(className);

                const bodyNode = node.childForFieldName('body');
                if (bodyNode && bodyNode.cursor && bodyNode.cursor.gotoFirstChild()) {
                    this.traverse(bodyNode.cursor, `${path}-`, id, id);
                    bodyNode.cursor.gotoParent();
                }
                // this.currentClassId = null; // Reset after processing the class

                return id;
            }
        }
        return null;
    }


    detectJSXElement(node, parentPath, parentId, currentFunctionId) {
        const componentName = node.childForFieldName('name')?.text;
        if (componentName && !this.importedModules.has(componentName) && !this.processedFunctions.has(componentName) && this.isInWatchedDir(this.currentFile)) {
            // Only proceed if it's a custom component (starts with uppercase)
            if (componentName[0] === componentName[0].toUpperCase()) {
                const path = `${parentPath}${componentName}`;
                const id = this.addDeclaration(componentName, 'component', path, node.text);
                if (id) {
                    this.addToResults(id, currentFunctionId, parentId, path);
                    this.processedFunctions.add(componentName);
                }
            }
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
        if (callName && callName.startsWith('use') && !this.importedModules.has(callName) && this.isInWatchedDir(this.currentFile)) {
            // Only detect custom hooks defined in the project
            // Check if the hook is defined in the current file
            const hookDefinition = this.findHookDefinition(callName);
            if (hookDefinition) {
                const path = `${parentPath}${callName}`;
                const id = this.addDeclaration(callName, 'custom_hook', path, hookDefinition);
                if (id) {
                    this.results.hooks = this.results.hooks || [];
                    this.results.hooks.push({ id, parentFunctionId: currentFunctionId });
                    this.addToResults(id, currentFunctionId, null, path);
                }
            }
        }
    }

    findHookDefinition(hookName) {
        // This method should search the current file for the hook definition
        // For simplicity, we'll just return null here. In a real implementation,
        // you'd search the AST for the function definition.
        return null;
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

    detectFunctionCall(node, currentFunctionId) {
        const callName = node.childForFieldName('function')?.text;
        if (callName) {
            // Check if it's a method call
            const objectName = node.childForFieldName('function')?.childForFieldName('object')?.text;
            const fullCallName = objectName ? `${objectName}.${callName}` : callName;

            // Ensure this.results.functionCalls is initialized as an object
            if (!this.results.functionCalls) {
                console.log("Initializing this.results.functionCalls as an empty object");
                this.results.functionCalls = {};
            }

            // Check the type of this.results.functionCalls[fullCallName]
            if (!this.results.functionCalls[fullCallName]) {
                console.log(`Initializing this.results.functionCalls[${fullCallName}] as a Set`);
                this.results.functionCalls[fullCallName] = new Set();
            } else if (!(this.results.functionCalls[fullCallName] instanceof Set)) {
                console.error(`Type Error: this.results.functionCalls[${fullCallName}] is not a Set`);
                console.error(`Current value:`, this.results.functionCalls[fullCallName]);
                return; // Stop further execution to prevent errors
            }

            // Add the currentFunctionId to the set
            if (currentFunctionId) {
                console.log(`Adding function ID ${currentFunctionId} to the set for ${fullCallName}`);
                this.results.functionCalls[fullCallName].add(currentFunctionId);
            } else {
                // If there's no current function ID, it might be a top-level call
                console.log(`Adding 'top-level' to the set for ${fullCallName}`);
                this.results.functionCalls[fullCallName].add('top-level');
            }

            // Check for callback functions in the arguments
            const args = node.childForFieldName('arguments');
            if (args) {
                args.children.forEach((arg, index) => {
                    if (arg.type === 'function' || arg.type === 'arrow_function') {
                        const callbackId = this.detectFunction(arg, `${fullCallName}-arg${index}-`, currentFunctionId, null, arg.cursor);
                        if (callbackId) {
                            if (!this.results.callbackRelationships) {
                                this.results.callbackRelationships = {};
                            }
                            if (!this.results.callbackRelationships[fullCallName]) {
                                this.results.callbackRelationships[fullCallName] = [];
                            }
                            this.results.callbackRelationships[fullCallName].push(callbackId);
                        }
                    }
                });
            }
        }
    }



    addToResults(id, currentFunctionId, parentId, path, isMethod = false) {
        if (isMethod) {
            this.results.methods.push({ id, parentClassId: parentId });
        } else {
            this.results.functions.push({ id, parentFunctionId: currentFunctionId || parentId });
        }

        this.results.directRelationships[id] = [];
        if (!currentFunctionId && !parentId) {
            this.results.rootFunctionIds.push(id);
        }
        if (currentFunctionId) {
            this.results.directRelationships[currentFunctionId] = this.results.directRelationships[currentFunctionId] || [];
            this.results.directRelationships[currentFunctionId].push(id);
        } else if (parentId) {
            this.results.directRelationships[parentId] = this.results.directRelationships[parentId] || [];
            this.results.directRelationships[parentId].push(id);
        }
        const functionName = this.results.allDeclarations[id].name;
        if (this.results.functionCalls && this.results.functionCalls[functionName]) {
            if (!this.results.functionCallRelationships) {
                this.results.functionCallRelationships = {};
            }
            this.results.functionCallRelationships[id] = Array.from(this.results.functionCalls[functionName]);
        }
    }
    analyzeMethodBody(node, id) {
        // Implement method body analysis logic here
    }

    traverse(cursor, parentPath = '', parentId = null, currentFunctionId = null) {
        do {
            const node = cursor.currentNode;
            const type = node.type;

            if (type === 'import_statement') {
                this.detectImport(node);
            } else if (this.isInWatchedDir(this.currentFile)) {
                switch (type) {
                    case 'function_declaration':
                    case 'function':
                    case 'arrow_function':
                    case 'generator_function':
                    case 'async_function':
                    case 'method_definition':
                        currentFunctionId = this.detectFunction(node, parentPath, parentId, currentFunctionId, cursor);
                        break;

                    case 'class_declaration':
                        this.detectClass(node, parentPath, parentId);
                        break;

                    case 'call_expression':
                        this.detectFunctionCall(node, currentFunctionId);
                        break;

                }
            }

            if (cursor.gotoFirstChild()) {
                this.traverse(cursor, `${parentPath}${node.type}-`, parentId, currentFunctionId);
                cursor.gotoParent();
            }

        } while (cursor.gotoNextSibling());

        if (this.results.functionCalls) {
            for (const [key, value] of Object.entries(this.results.functionCalls)) {
                this.results.functionCalls[key] = Array.from(value);
            }
        }
    }

    isComponent(callName) {
        // Implement logic to check if the callName corresponds to a known component
        return true; // Placeholder, replace with actual logic
    }
}

export default JsDetectionHandler;
