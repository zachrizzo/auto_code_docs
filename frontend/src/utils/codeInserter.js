const fs = require('fs');
const recast = require('recast');
const path = require('path');
const Parser = require('web-tree-sitter'); // For tree-sitter parsing

let parserInitialized = false;
let parser = null;
let Language = {};

async function initializeParsers() {
    if (parserInitialized) return;
    await Parser.init();
    parser = new Parser();

    const JavaScript = await Parser.Language.load(require('path').join(__dirname, '../../.wasm/tree-sitter-javascript.wasm'));
    const Python = await Parser.Language.load(require('path').join(__dirname, '../../.wasm/tree-sitter-python.wasm'));
    const Julia = await Parser.Language.load(require('path').join(__dirname, '../../.wasm/tree-sitter-julia.wasm'));  // Added Julia


    Language['javascript'] = JavaScript;
    Language['python'] = Python;
    Language['julia'] = Julia;

    parserInitialized = true;
}

/**
 * Replaces a specified function within a file with new code.
 * @param {string} filePath - The path to the file.
 * @param {Object} declarationInfo - Information about the declaration.
 * @param {string} newCode - The new code to replace the function or function body.
 */
async function insertCode(filePath, declarationInfo, newCode) {
    console.log(`Attempting to insert code into file: ${filePath}`);
    const { name, startPosition } = declarationInfo;
    console.log(`Target Declaration - Name: ${name}, Start Position:`, startPosition);

    if (!name || !startPosition) {
        console.error('Incomplete declarationInfo provided:', declarationInfo);
        throw new Error('Incomplete declarationInfo provided.');
    }

    // Detect the language from the file extension
    const language = detectLanguageFromFileName(filePath);
    if (!language) {
        throw new Error(`Unsupported file extension for file ${filePath}.`);
    }

    // Read the original file content
    let code;
    try {
        code = await fs.promises.readFile(filePath, 'utf8');
    } catch (readError) {
        console.error(`Failed to read file ${filePath}:`, readError);
        throw new Error(`Failed to read file ${filePath}.`);
    }

    // Parse and modify the code based on the language
    if (language === 'javascript' || language === 'typescript') {
        await insertCodeForJS(filePath, code, declarationInfo, newCode, language);
    } else if (language === 'python') {
        await insertCodeForPython(filePath, code, declarationInfo, newCode);
    } else if (language === 'julia') {
        await insertCodeForJulia(filePath, code, declarationInfo, newCode);
    } else {
        throw new Error(`Language ${language} is not supported.`);
    }
}

function detectLanguageFromFileName(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    const languageMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.jl': 'julia',
    };
    return languageMap[extension] || null;
}

/**
 * Compares AST node start positions with the provided start position.
 * Adjusts for one-based line numbering and zero-based column numbering.
 * @param {Object} locStart - The start location from the AST node.
 * @param {Object} startPosition - The start position provided in declarationInfo.
 * @returns {boolean} - Whether the positions match.
 */
function positionsMatch(locStart, startPosition) {
    // Assuming locStart.line is 1-based and startPosition.row is also 1-based
    // Adjust for zero-based column numbering
    const adjustedStartPosition = {
        row: startPosition.row, // No adjustment needed for line numbers
        column: startPosition.column - 1, // Convert to zero-based column numbering
    };

    return (
        locStart.line === adjustedStartPosition.row &&
        locStart.column === adjustedStartPosition.column
    );
}





async function insertCodeForJS(filePath, code, declarationInfo, newCode, language) {
    const parser = language === 'typescript' ? require('recast/parsers/typescript') : require('recast/parsers/babel');

    // Parse the code to an AST
    let ast;
    try {
        ast = recast.parse(code, { parser });
    } catch (parseError) {
        console.error(`Failed to parse AST for file ${filePath}:`, parseError);
        throw new Error(`Failed to parse AST for file ${filePath}.`);
    }

    let nodeFound = false;

    // Traverse the AST to find the target declaration
    recast.types.visit(ast, {
        // Handle Function Declarations
        visitFunctionDeclaration(path) {
            const node = path.node;
            const nodeName = node.id ? node.id.name : 'Anonymous Function';
            const nodeStart = node.loc.start;
            console.log(`Visiting FunctionDeclaration: ${nodeName} at Line ${nodeStart.line}, Column ${nodeStart.column}`);

            if (
                node.id &&
                node.id.name === declarationInfo.name &&
                positionsMatch(node.loc.start, declarationInfo.startPosition)
            ) {
                nodeFound = true;
                console.log(`Found FunctionDeclaration: ${declarationInfo.name} at position`, node.loc.start);

                // Parse the new code to AST nodes
                const newAst = recast.parse(newCode, { parser });

                // Replace the entire node
                path.replace(newAst.program.body[0]);

                // Stop traversal
                return false;
            }
            this.traverse(path);
        },

        // Handle Variable Declarations with Function Expressions or Arrow Functions
        visitVariableDeclaration(path) {
            const node = path.node;
            node.declarations.forEach(declarator => {
                const declaratorName = declarator.id.name;
                const declaratorStart = declarator.init ? declarator.init.loc.start : null;
                if (declarator.init) {
                    console.log(`Visiting VariableDeclaration: ${declaratorName} at Line ${declaratorStart.line}, Column ${declaratorStart.column}`);
                }

                if (
                    declarator.id.name === declarationInfo.name &&
                    declarator.init &&
                    (declarator.init.type === 'FunctionExpression' || declarator.init.type === 'ArrowFunctionExpression') &&
                    positionsMatch(declarator.init.loc.start, declarationInfo.startPosition)
                ) {
                    nodeFound = true;
                    console.log(`Found ${declarator.init.type}: ${declaratorName} at position`, declarator.init.loc.start);

                    // Parse the new code to AST nodes
                    const newAst = recast.parse(newCode, { parser });
                    const newFunction = newAst.program.body[0].declarations[0].init;

                    // Replace the function expression or arrow function
                    declarator.init = newFunction;

                    // Stop traversal
                    return false;
                }
            });
            this.traverse(path);
        },

        // Handle Class Methods
        visitClassDeclaration(path) {
            const node = path.node;
            node.body.body.forEach(method => {
                const methodName = method.key.name || method.kind;
                const methodStart = method.loc.start;
                console.log(`Visiting ClassMethod: ${methodName} at Line ${methodStart.line}, Column ${methodStart.column}`);

                if (
                    (method.key.name === declarationInfo.name || method.kind === declarationInfo.name) &&
                    positionsMatch(method.loc.start, declarationInfo.startPosition)
                ) {
                    nodeFound = true;
                    console.log(`Found ClassMethod: ${declarationInfo.name} at position`, method.loc.start);

                    // Parse the new code to AST nodes
                    const newAst = recast.parse(newCode, { parser });
                    const newMethod = newAst.program.body[0].body.body[0]; // Assuming newCode contains a method

                    // Replace the method
                    Object.assign(method, newMethod);

                    // Stop traversal
                    return false;
                }
            });
            this.traverse(path);
        },
    });

    if (!nodeFound) {
        console.error(`Declaration ${declarationInfo.name} not found in file ${filePath}`);
        console.error(`Expected position: Row ${declarationInfo.startPosition.row}, Column ${declarationInfo.startPosition.column}`);
        throw new Error(`Declaration ${declarationInfo.name} not found in file ${filePath}`);
    }

    // Generate the modified code from the AST
    let newFileContent;
    try {
        newFileContent = recast.print(ast).code;
    } catch (printError) {
        console.error(`Failed to generate new code for file ${filePath}:`, printError);
        throw new Error(`Failed to generate new code for file ${filePath}.`);
    }

    // Write the modified code back to the file
    try {
        await fs.promises.writeFile(filePath, newFileContent, 'utf8');
        console.log(`Successfully inserted code into file: ${filePath}`);
    } catch (writeError) {
        console.error(`Failed to write to file ${filePath}:`, writeError);
        throw new Error(`Failed to write to file ${filePath}.`);
    }
}





async function insertCodeForPython(filePath, code, declarationInfo, newCode) {
    await initializeParsers();
    parser.setLanguage(Language['python']);

    // Parse the code to an AST
    let tree;
    try {
        tree = parser.parse(code);
    } catch (parseError) {
        console.error(`Failed to parse AST for file ${filePath}:`, parseError);
        throw new Error(`Failed to parse AST for file ${filePath}.`);
    }

    // Find the target node in the AST
    const rootNode = tree.rootNode;
    let targetNode = null;

    function findNode(node) {
        if (
            node.type === 'function_definition' &&
            node.childForFieldName('name').text === declarationInfo.name &&
            positionsMatch(node.startPosition, declarationInfo.startPosition)
        ) {
            targetNode = node;
            return true;
        }
        for (let child of node.namedChildren) {
            if (findNode(child)) return true;
        }
        return false;
    }

    findNode(rootNode);

    if (!targetNode) {
        console.error(`Declaration ${declarationInfo.name} not found in file ${filePath}`);
        throw new Error(`Declaration ${declarationInfo.name} not found in file ${filePath}`);
    }

    // Replace the target node's code
    const startIndex = targetNode.startIndex;
    const endIndex = targetNode.endIndex;

    const newFileContent = code.slice(0, startIndex) + newCode + code.slice(endIndex);

    // Write the modified code back to the file
    try {
        await fs.promises.writeFile(filePath, newFileContent, 'utf8');
        console.log(`Successfully inserted code into file: ${filePath}`);
    } catch (writeError) {
        console.error(`Failed to write to file ${filePath}:`, writeError);
        throw new Error(`Failed to write to file ${filePath}.`);
    }
}

async function insertCodeForJulia(filePath, code, declarationInfo, newCode) {
    await initializeParsers();
    parser.setLanguage(Language['julia']);

    // Parse the code to an AST
    let tree;
    try {
        tree = parser.parse(code);
    } catch (parseError) {
        console.error(`Failed to parse AST for file ${filePath}:`, parseError);
        throw new Error(`Failed to parse AST for file ${filePath}.`);
    }

    // Find the target node in the AST
    const rootNode = tree.rootNode;
    let targetNode = null;

    function findNode(node) {
        if (
            (node.type === 'function_definition' || node.type === 'macro_definition') &&
            node.childForFieldName('name').text === declarationInfo.name &&
            positionsMatch(node.startPosition, declarationInfo.startPosition)
        ) {
            targetNode = node;
            return true;
        }
        for (let child of node.namedChildren) {
            if (findNode(child)) return true;
        }
        return false;
    }

    findNode(rootNode);

    if (!targetNode) {
        console.error(`Declaration ${declarationInfo.name} not found in file ${filePath}`);
        throw new Error(`Declaration ${declarationInfo.name} not found in file ${filePath}`);
    }

    // Replace the target node's code
    const startIndex = targetNode.startIndex;
    const endIndex = targetNode.endIndex;

    const newFileContent = code.slice(0, startIndex) + newCode + code.slice(endIndex);

    // Write the modified code back to the file
    try {
        await fs.promises.writeFile(filePath, newFileContent, 'utf8');
        console.log(`Successfully inserted code into file: ${filePath}`);
    } catch (writeError) {
        console.error(`Failed to write to file ${filePath}:`, writeError);
        throw new Error(`Failed to write to file ${filePath}.`);
    }
}

module.exports = {
    insertCode,
};
