// TypeScript script to compile and show Neo programs
import fs from 'fs';
import tokenizer from './src/compiler/neo.tokenize';
import parser from './src/compiler/neo.parse';
import codegen from './src/compiler/neo.codegen';

function compile(sourceCode: string): string {
    const tokens = tokenizer(sourceCode);
    const ast = parser(tokens, '');
    const jsCode = codegen(ast);
    return jsCode;
}

// Get filename from command line
const filename = process.argv[2];

if (!filename) {
    console.error('Usage: ts-node run-neo.ts <file.cy>');
    process.exit(1);
}

// Read the Neo source file
const sourceCode = fs.readFileSync(filename, 'utf8');

console.log('=== Neo Source Code ===');
console.log(sourceCode);
console.log('\n=== Compiling... ===\n');

// Compile to JavaScript
try {
    const jsCode = compile(sourceCode);

    console.log('=== Generated JavaScript ===');
    console.log(jsCode);

    // Write the compiled JavaScript
    const outputFile = filename.replace('.cy', '.js');
    fs.writeFileSync(outputFile, jsCode);

    console.log(`\n✓ Compiled successfully: ${filename} -> ${outputFile}`);
} catch (error) {
    console.error('✗ Compilation error:', error);
    process.exit(1);
}
