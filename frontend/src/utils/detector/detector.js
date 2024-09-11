import ASTDetectionHandler from './ast/ast.js';
import { readFile, readdir, stat as _stat } from 'fs/promises';
import { relative, join, extname } from 'path';
import Parser from 'web-tree-sitter';
import { createReadStream } from 'fs';
import ignore from 'ignore';  // You can install this package via npm to handle .gitignore patterns

let parsers = {};
let globalResults = {};
let globalDeclarations = {};
let currentAnalysisId = 0;
let globalIds = new Set();
let globalFunctionNameToId = {};

const languageExtensions = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.jl': 'julia',  // Added Julia extension
};

// Initialize the parsers for JavaScript, Python, and Julia
export async function initializeParser() {
    // Initialize the WebAssembly for Tree-sitter
    await Parser.init();

    // Create a new parser instance
    const parser = new Parser();

    // Load the WebAssembly files correctly for each language
    const JavaScript = await Parser.Language.load(require('path').join(__dirname, '../../.wasm/tree-sitter-javascript.wasm'));
    const Python = await Parser.Language.load(require('path').join(__dirname, '../../.wasm/tree-sitter-python.wasm'));
    const Julia = await Parser.Language.load(require('path').join(__dirname, '../../.wasm/tree-sitter-julia.wasm'));  // Added Julia

    // Set the language for the parser
    parser.setLanguage(JavaScript);  // Default language can be changed dynamically

    // Return an object with the parser configurations
    parsers = {
        main: parser,
        javascript: JavaScript,
        python: Python,
        julia: Julia  // Added Julia parser
    };

    return parsers;
}

export function resolveIdConflict(id) {
    let newId = id;
    let counter = 1;
    while (globalIds.has(newId)) {
        newId = `${id}_copy_${counter}`;
        counter++;
    }
    globalIds.add(newId);
    return newId;
}

// Use languageExtensions for file extension to language mapping
export function detectLanguageFromFileName(fileName) {
    const extension = extname(fileName);  // Use extname for consistency
    return languageExtensions[extension] || null;
}

export async function detectClassesAndFunctions(code, filePath, fileExtension, watchedDir) {
    console.log(`Analyzing file: ${filePath}`);
    try {
        const language = detectLanguageFromExtension(fileExtension);

        if (!language || !parsers[language]) {
            console.log('Initializing parser for language:', language);
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

        console.log('Traversing and detecting...');
        ASTDetection.traverseAndDetect(cursor);

        currentAnalysisId++;

        console.log('Finalizing relationships...');
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

        console.log(`Analysis complete for file: ${filePath}`);
        return results;

    } catch (error) {
        console.error(`Error analyzing file ${filePath}:`, error);
        return { error: error.message };
    }
}

// Use languageExtensions as the source of truth for extension-to-language mapping
export function detectLanguageFromExtension(extension) {
    return languageExtensions[extension] || null;
}

export function resolveCrossFileDependencies() {
    console.log('Resolving cross-file dependencies...');
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

    // console.log("Cross-file dependencies resolved.");
    // console.log("Updated globalResults:", globalResults);
    // console.log('globalFunctionNameToId', globalFunctionNameToId);

    return globalResults;
}

async function loadIgnorePatterns(dir) {
    const ig = ignore();
    const gitIgnorePath = join(dir, '.gitignore');
    const fractalIgnorePath = join(dir, 'ignore.fractal');

    const addPatternsFromFile = async (filePath) => {
        try {
            const content = await readFile(filePath, 'utf8');
            ig.add(content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')));
        } catch (error) {
            console.warn(`Failed to read ignore file: ${filePath}`);
        }
    };

    await addPatternsFromFile(gitIgnorePath);
    await addPatternsFromFile(fractalIgnorePath);

    return ig;
}

export async function analyzeDirectory(watchingDir) {
    console.log(`Analyzing directory: ${watchingDir}`);
    let aggregatedResults = {};
    const ig = await loadIgnorePatterns(watchingDir);

    const analyzeFile = async (filePath) => {
        console.log(`Reading file: ${filePath}`);
        const fileContent = await readFile(filePath, 'utf8');
        const fileExtension = extname(filePath);
        const analysisResults = await detectClassesAndFunctions(fileContent, filePath, fileExtension, watchingDir);
        aggregatedResults[filePath] = analysisResults;
    };

    const walkDirectory = async (dir) => {
        const files = await readdir(dir);
        for (const file of files) {
            const filePath = join(dir, file);
            const stat = await _stat(filePath);

            if (stat.isDirectory()) {
                await walkDirectory(filePath);
            } else if (languageExtensions[extname(file)] && !ig.ignores(relative(watchingDir, filePath))) {
                await analyzeFile(filePath);
            }
        }
    };

    try {
        await walkDirectory(watchingDir);
        const finalResults = resolveCrossFileDependencies();
        return finalResults;
    } catch (error) {
        console.error('Error during directory analysis:', error);
        throw error;
    }
}
