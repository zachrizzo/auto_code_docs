import * as Parser from 'web-tree-sitter';
import ASTDetectionHandler from './ast/ast';

let parsers = {};
let globalResults = {}; // To store parsed results for all files
let globalDeclarations = {}; // Global storage for all declarations across files, indexed by name
let currentAnalysisId = 0;

const languageExtensions = {
    '.js': 'javascript',
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

export function detectLanguageFromFileName(fileName) {
    const extension = fileName.slice(fileName.lastIndexOf('.'));
    return languageExtensions[extension] || null;
}

export async function detectClassesAndFunctions(code, filePath, fileExtension, watchedDir) {
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
        functionCallRelationships: {}, // Initialize as an empty object
        functionNameToId: {}
    };

    const processedFunctions = new Set();
    const processedClasses = new Set();

    const parser = new Parser();
    const ASTDetection = new ASTDetectionHandler(parser, results, processedFunctions, processedClasses, currentAnalysisId, watchedDir, filePath, language);

    parser.setLanguage(parsers[language]);

    const tree = parser.parse(code);
    const cursor = tree.walk();

    currentAnalysisId++; // Increment for each new analysis

    ASTDetection.traverse(cursor);

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

    // Clean up old global declarations
    for (const [name, declaration] of Object.entries(globalDeclarations)) {
        if (declaration.analysisId !== currentAnalysisId) {
            delete globalDeclarations[name];
        }
    }

    return results;
}

export function detectLanguageFromExtension(extension) {
    const languageMap = {
        '.js': 'javascript',
        '.py': 'python',
        // Add more extensions and languages here if needed
    };

    return languageMap[extension] || null;
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

        // Clean up any null keys in directRelationships
        if (fileResults.directRelationships && 'null' in fileResults.directRelationships) {
            console.warn(`Found 'null' key in directRelationships for file ${fileName}`);
            delete fileResults.directRelationships['null'];
        }

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
