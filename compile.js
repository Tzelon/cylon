// Simple Neo compiler script
const fs = require('fs');
const path = require('path');

// Import the compiler components
const tokenizer = require('./dist/compiler/neo.tokenize').default;
const parser = require('./dist/compiler/neo.parse').default;
const codegen = require('./dist/compiler/neo.codegen').default;

function compile(sourceCode) {
    const tokens = tokenizer(sourceCode);
    const ast = parser(tokens, '');
    const jsCode = codegen(ast);
    return jsCode;
}

// Get filename from command line
const filename = process.argv[2];

if (!filename) {
    console.error('Usage: node compile.js <file.cy>');
    process.exit(1);
}

// Read the Neo source file
const sourceCode = fs.readFileSync(filename, 'utf8');

// Compile to JavaScript
try {
    const jsCode = compile(sourceCode);

    // Write the compiled JavaScript
    const outputFile = filename.replace('.cy', '.js');
    fs.writeFileSync(outputFile, jsCode);

    console.log(`Compiled ${filename} -> ${outputFile}`);
    console.log('\nGenerated JavaScript:');
    console.log('---');
    console.log(jsCode);
    console.log('---');
} catch (error) {
    console.error('Compilation error:', error.message);
    process.exit(1);
}
