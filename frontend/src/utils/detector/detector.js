import * as Parser from 'web-tree-sitter';
import ASTDetectionHandler from './ast/ast';

let parsers = {};
let globalResults = {}; // To store parsed results for all files
let globalDeclarations = {}; // Global storage for all declarations across files, indexed by name
let currentAnalysisId = 0;
let globalIds = new Set();
let globalFunctionNameToId = {};

const languageExtensions = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    // Add more extensions and languages here if needed
};

export async function initializeParser() {
    await Parser.init({
        locateFile(scriptName) {
            return scriptName;
        },
    });

    const JavaScript = await Parser.Language.load('dist/tree-sitter-javascript.wasm');
    const Python = await Parser.Language.load('dist/tree-sitter-python.wasm');

    parsers.javascript = JavaScript;
    parsers.python = Python;
}

function resolveIdConflict(id) {
    let newId = id;
    let counter = 1;
    while (globalIds.has(newId)) {
        newId = `${id}_copy_${counter}`;
        counter++;
    }
    globalIds.add(newId);
    return newId;
}

export function detectLanguageFromFileName(fileName) {
    const extension = fileName.slice(fileName.lastIndexOf('.'));
    return languageExtensions[extension] || null;
}

export async function detectClassesAndFunctions(code, filePath, fileExtension, watchedDir) {
    try {
        const language = detectLanguageFromExtension(fileExtension);

        if (!language || !parsers[language]) {
            await initializeParser();
        }

        const results = {
            filePath,
            directRelationships: {},
            crossFileRelationships: {},
            allDeclarations: {},
            recursiveRelationships: [],
            analysisId: currentAnalysisId,
            rootFunctionIds: [],
            functionCallRelationships: {},
            functionNameToId: {},
            allCalledFunctions: {},
            deferredFunctionCalls: [],
        };

        const processedFunctions = new Set();
        const processedClasses = new Set();

        const parser = new Parser();
        const ASTDetection = new ASTDetectionHandler(parser, results, processedFunctions, processedClasses, currentAnalysisId, watchedDir, filePath, language, globalFunctionNameToId);

        parser.setLanguage(parsers[language]);

        const tree = parser.parse(code);
        const cursor = tree.walk();

        // Single pass: Detect functions, classes, and function calls
        ASTDetection.traverseAndDetect(cursor);

        currentAnalysisId++;

        ASTDetection.finalizeRelationships();
        currentAnalysisId++;

        ASTDetection.finalizeRelationships();

        // Update globalResults
        if (!globalResults[filePath]) {
            globalResults[filePath] = {};
        }

        // Remove old declarations and relationships
        for (const key in globalResults[filePath]) {
            if (Array.isArray(globalResults[filePath][key])) {
                globalResults[filePath][key] = globalResults[filePath][key].filter(item => item.analysisId === currentAnalysisId);
            } else if (typeof globalResults[filePath][key] === 'object') {
                for (const subKey in globalResults[filePath][key]) {
                    if (globalResults[filePath][key][subKey].analysisId !== currentAnalysisId) {
                        delete globalResults[filePath][key][subKey];
                    }
                }
            }
        }

        // Merge new results
        Object.assign(globalResults[filePath], results);

        // Ensure we're not overwriting functionCallRelationships if it already exists
        if (!globalResults[filePath].functionCallRelationships) {
            globalResults[filePath].functionCallRelationships = {};
        }
        Object.assign(globalResults[filePath].functionCallRelationships, results.functionCallRelationships);

        // Clean up old global declarations
        for (const [name, declaration] of Object.entries(globalDeclarations)) {
            if (declaration.analysisId !== currentAnalysisId) {
                delete globalDeclarations[name];
            }
        }

        // After generating IDs for functions and classes:
        results.functions?.forEach(func => {
            func.id = resolveIdConflict(func.id);
        });
        results.classes?.forEach(cls => {
            cls.id = resolveIdConflict(cls.id);
        });

        return results;

    } catch (error) {
        console.error(`Error analyzing file ${filePath}:`, error);
        return { error: error.message };
    }
}

export function detectLanguageFromExtension(extension) {
    const languageMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
    };

    return languageMap[extension] || null;
}

export function resolveCrossFileDependencies() {
    // Create a global map of all functions
    const allFunctions = new Map();
    for (const [fileName, fileResults] of Object.entries(globalResults)) {
        fileResults.allDeclarations && Object.values(fileResults.allDeclarations).forEach(declaration => {
            if (declaration.type === 'function' || declaration.type === 'method') {
                allFunctions.set(declaration.id, { name: declaration.name, fileName });
            }
        });
    }

    // Resolve cross-file relationships
    for (const [sourceFileName, sourceFileResults] of Object.entries(globalResults)) {
        sourceFileResults.crossFileRelationships = {}; // Reset cross-file relationships

        // Resolve deferred function calls
        if (sourceFileResults.deferredFunctionCalls) {

            sourceFileResults.deferredFunctionCalls.forEach(({ callerNodeId, calledFunctionName }) => {
                const calledFunctionIds = globalFunctionNameToId[calledFunctionName] || [];
                if (calledFunctionIds.length > 0) {
                    calledFunctionIds.forEach(calledFunctionId => {

                        if (!sourceFileResults.allCalledFunctions[calledFunctionId]) {
                            sourceFileResults.allCalledFunctions[calledFunctionId] = [];
                        }
                        sourceFileResults.allCalledFunctions[calledFunctionId].push(callerNodeId);

                        if (!globalResults[sourceFileName].crossFileRelationships[calledFunctionId]) {
                            globalResults[sourceFileName].crossFileRelationships[calledFunctionId] = [];
                        }
                        globalResults[sourceFileName].crossFileRelationships[calledFunctionId].push(callerNodeId);
                    });
                } else {
                    console.warn(`Unresolved function call: ${calledFunctionName} called by ${callerNodeId}`);
                }
            });
            delete sourceFileResults.deferredFunctionCalls;
        }

    }

    console.log("Updated globalResults:", globalResults);
    console.log('globalFunctionNameToId', globalFunctionNameToId)

    return globalResults;
}
