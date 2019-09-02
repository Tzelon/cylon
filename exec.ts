import parse from './src/compiler/neo.parse';
import tokenize from './src/compiler/neo.tokenize';
import codegen from './src/compiler/neo.codegen';
import * as fs from 'fs';
import * as path from 'path';

const cyProgram = fs.readFileSync(path.resolve(__dirname, '../experiments/example.cy'), 'utf-8');
const tokenized = tokenize(cyProgram);
const parsed = parse(tokenized);
if (parsed.id === '(error)') {
    console.error(parsed);
} else {
    const jsProgram = codegen(parsed);

    fs.writeFileSync(path.resolve(__dirname, '../experiments/example.js'), jsProgram, 'utf-8');
}

// const cyProgram = fs.readFileSync(
//   path.resolve(__dirname, '../demo/reduce-reverse.cy'),
//   'utf-8'
// );
// const jsProgram = codegen(parse(tokenize(cyProgram)));
// fs.writeFileSync(
//   path.resolve(__dirname, '../demo/reduce-reverse.js'),
//   jsProgram,
//   'utf-8'
// );

/**
 * Statements
 */
// const cyProgram = fs.readFileSync(
//   path.resolve(__dirname, '../demo/statements/var.cy'),
//   'utf-8'
// );
// const jsProgram = parse(tokenize(cyProgram));
// console.log(jsProgram);
// fs.writeFileSync(
//   path.resolve(__dirname, '../demo/statements/var.js'),
//   codegen(jsProgram),
//   'utf-8'
// );

// const cyProgram = fs.readFileSync(
//   path.resolve(__dirname, '../demo/statements/def.cy'),
//   'utf-8'
// );
// const jsProgram = parse(tokenize(cyProgram));
// console.log(jsProgram);
// fs.writeFileSync(
//   path.resolve(__dirname, '../demo/statements/def.js'),
//   codegen(jsProgram),
//   'utf-8'
// );
