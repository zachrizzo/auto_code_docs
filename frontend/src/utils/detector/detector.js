import * as Parser from 'web-tree-sitter';
import ASTDetectionHandler from './ast/ast';

let parsers = {};
let globalResults = {}; // To store parsed results for all files
let globalDeclarations = {}; // Global storage for all declarations across files, indexed by name
let currentAnalysisId = 0;
let globalIds = new Set();

const languageExtensions = {
    '.js': 'javascript',
    'jsx': 'javascript',
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
        functionNameToId: {}
    };

    const processedFunctions = new Set();
    const processedClasses = new Set();

    const parser = new Parser();
    const ASTDetection = new ASTDetectionHandler(parser, results, processedFunctions, processedClasses, currentAnalysisId, watchedDir, filePath, language);

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
}

export function detectLanguageFromExtension(extension) {
    const languageMap = {
        '.js': 'javascript',
        'jsx': 'javascript',
        '.py': 'python',
        // Add more extensions and languages here if needed
    };

    return languageMap[extension] || null;
}

export function resolveCrossFileDependencies() {
    // Create a global map of all functions
    const allFunctions = new Map();
    for (const [fileName, fileResults] of Object.entries(globalResults)) {
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
    for (const [fileName, fileResults] of Object.entries(globalResults)) {
        fileResults.crossFileRelationships = {};

        // Iterate through all function calls in this file
        for (const [callerId, calledFunctions] of Object.entries(fileResults.functionCallRelationships || {})) {
            for (const calledFunctionName of calledFunctions) {
                const calledFunctionInfo = allFunctions.get(calledFunctionName);
                if (calledFunctionInfo) {
                    // Update functionCallRelationships with function IDs
                    if (!fileResults.functionCallRelationships[callerId]) {
                        fileResults.functionCallRelationships[callerId] = [];
                    }
                    if (!fileResults.functionCallRelationships[callerId].includes(calledFunctionInfo.id)) {
                        fileResults.functionCallRelationships[callerId].push(calledFunctionInfo.id);
                    }

                    // Record cross-file calls
                    if (calledFunctionInfo.fileName !== fileName) {
                        if (!fileResults.crossFileRelationships[callerId]) {
                            fileResults.crossFileRelationships[callerId] = [];
                        }
                        if (!fileResults.crossFileRelationships[callerId].includes(calledFunctionInfo.id)) {
                            fileResults.crossFileRelationships[callerId].push(calledFunctionInfo.id);
                        }
                    }
                }
            }
        }

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

    console.log("Updated globalResults:", globalResults);

    return globalResults;
}
