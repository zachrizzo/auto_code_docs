import * as Parser from 'web-tree-sitter';
import JsDetectionHandler from './js/main';

let parsers = {};
let globalResults = {}; // To store parsed results for all files
let globalDeclarations = {}; // Global storage for all declarations across files, indexed by name
let currentAnalysisId = 0;


export async function initializeParser() {
    await Parser.init({
        locateFile(scriptName) {
            return scriptName;
        },
    });

    const JavaScript = await Parser.Language.load('dist/tree-sitter-javascript.wasm');
    parsers.javascript = JavaScript;
}

export async function detectClassesAndFunctions(language, code, fileName, watchedDir) {
    if (!parsers[language]) {
        await initializeParser();
    }

    const results = {
        fileName,
        classes: [],
        functions: [],
        directRelationships: {},
        indirectRelationships: {},
        crossFileRelationships: {},
        allDeclarations: {},
        recursiveRelationships: [],
        analysisId: currentAnalysisId,
        rootFunctionIds: []
    };

    const parser = new Parser();
    const jsDetectionHandler = new JsDetectionHandler(parser, results, processedFunctions, currentAnalysisId, watchedDir, fileName);

    parser.setLanguage(parsers[language]);

    const tree = parser.parse(code);
    const cursor = tree.walk();

    const processedFunctions = new Set();

    currentAnalysisId++; // Increment for each new analysis




    jsDetectionHandler.traverse(cursor);

    // Update globalResults
    if (!globalResults[fileName]) {
        globalResults[fileName] = {};
    }

    // Remove old declarations and relationships
    for (const key in globalResults[fileName]) {
        if (Array.isArray(globalResults[fileName][key])) {
            globalResults[fileName][key] = globalResults[fileName][key].filter(item => item.analysisId === currentAnalysisId);
        } else if (typeof globalResults[fileName][key] === 'object') {
            for (const subKey in globalResults[fileName][key]) {
                if (globalResults[fileName][key][subKey].analysisId !== currentAnalysisId) {
                    delete globalResults[fileName][key][subKey];
                }
            }
        }
    }

    // Merge new results
    Object.assign(globalResults[fileName], results);

    // Clean up old global declarations
    for (const [name, declaration] of Object.entries(globalDeclarations)) {
        if (declaration.analysisId !== currentAnalysisId) {
            delete globalDeclarations[name];
        }
    }

    return results;
}

export function resolveCrossFileDependencies() {
    const resolvedResults = JSON.parse(JSON.stringify(globalResults));

    // Create a global map of all functions
    const allFunctions = new Map();
    for (const [fileName, fileResults] of Object.entries(resolvedResults)) {
        fileResults.functions?.forEach(func => {
            const declaration = fileResults.allDeclarations[func.id];
            if (declaration) {
                allFunctions.set(declaration.name, { id: declaration.id, fileName });
            }
        });
        // Include class methods as well
        fileResults.classes?.forEach(cls => {
            const classDeclaration = fileResults.allDeclarations[cls.id];
            if (classDeclaration) {
                Object.values(fileResults.allDeclarations)
                    .filter(decl => decl.path && decl.path.startsWith(`${classDeclaration.path}-`) && decl.type === 'function')
                    .forEach(method => {
                        allFunctions.set(method.name, { id: method.id, fileName });
                    });
            }
        });
    }

    // Resolve cross-file relationships
    for (const [fileName, fileResults] of Object.entries(resolvedResults)) {
        fileResults.crossFileRelationships = {};
        fileResults.functionCallRelationships = {};

        const checkForCalls = (entity, entityId, entityType) => {
            if (!entity || !entity.code) return;
            const calls = entity.code.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g) || [];
            calls.forEach(call => {
                const callName = call.trim().slice(0, -1);
                const calledFunction = allFunctions.get(callName);
                if (calledFunction && calledFunction.id !== entityId) {
                    // Record all function calls
                    if (!fileResults.functionCallRelationships[entityId]) {
                        fileResults.functionCallRelationships[entityId] = [];
                    }
                    if (!fileResults.functionCallRelationships[entityId].includes(calledFunction.id)) {
                        fileResults.functionCallRelationships[entityId].push(calledFunction.id);
                    }

                    // Record cross-file calls
                    if (calledFunction.fileName !== fileName) {
                        if (!fileResults.crossFileRelationships[entityType]) {
                            fileResults.crossFileRelationships[entityType] = {};
                        }
                        if (!fileResults.crossFileRelationships[entityType][entityId]) {
                            fileResults.crossFileRelationships[entityType][entityId] = [];
                        }
                        if (!fileResults.crossFileRelationships[entityType][entityId].includes(calledFunction.id)) {
                            fileResults.crossFileRelationships[entityType][entityId].push(calledFunction.id);
                        }
                    }
                }
            });
        };

        // Check functions
        fileResults.functions?.forEach(func => {
            const funcDeclaration = fileResults.allDeclarations[func.id];
            if (funcDeclaration) {
                checkForCalls(funcDeclaration, funcDeclaration.id, 'functions');
            }
        });

        // Check classes and their methods
        fileResults.classes?.forEach(cls => {
            const classDeclaration = fileResults.allDeclarations[cls.id];
            if (classDeclaration) {
                Object.values(fileResults.allDeclarations)
                    .filter(decl => decl.path && decl.path.startsWith(`${classDeclaration.path}-`) && decl.type === 'function')
                    .forEach(method => {
                        checkForCalls(method, method.id, `classes.${classDeclaration.name}.methods`);
                    });
            }
        });

        // Ensure functionCallRelationships are arrays
        if (fileResults.functionCallRelationships) {
            for (const [key, value] of Object.entries(fileResults.functionCallRelationships)) {
                if (!Array.isArray(value)) {
                    fileResults.functionCallRelationships[key] = Array.from(value);
                }
            }
        }
    }

    console.log("Resolved Results:", resolvedResults);

    return resolvedResults;
}
