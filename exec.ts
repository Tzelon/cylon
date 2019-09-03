import parse from './src/compiler/neo.parse';
import tokenize from './src/compiler/neo.tokenize';
import codegen from './src/compiler/neo.codegen';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';

const cyProgram = fs.readFileSync(path.resolve(__dirname, '../experiments/example.cy'), 'utf-8');


let hrstart = process.hrtime()
const tokenized = tokenize(cyProgram);
const parsed = parse(tokenized);
let hrend = process.hrtime(hrstart)
console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000)


if (parsed.id === '(error)') {
    console.error(util.inspect(parsed, true, 10000));
} else {
    const jsProgram = codegen(parsed);
    console.log(util.inspect(jsProgram, true, 10000));
    writeFiles(jsProgram);
}


function writeFiles(mod) {
    fs.writeFileSync(path.resolve(__dirname, `../dist/${mod.id}.js`), mod.content, 'utf-8');
    if(Object.keys(mod.children).length !== 0) {
        Object.keys(mod.children).forEach(inner_mod => {
            writeFiles(mod.children[inner_mod]);
        });
    }
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
