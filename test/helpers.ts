import fs from 'fs';
import path from 'path';
import parser from '../src/compiler/neo.parse';
import tokenizer from '../src/compiler/neo.tokenize';
import codegen from '../src/compiler/neo.codegen';

function compile(input): { parse: any; code: string } {
    const parse = parser(tokenizer(input), '');
    const code = codegen(parse);

    return {
        parse,
        code
    };
}

function loadAsText(absoulteFilePath: string) {
    return fs.readFileSync(absoulteFilePath, 'utf8');
}

export function loadTests(dirname: string) {
    return fs
        .readdirSync(dirname, { withFileTypes: true })
        .filter((dirent) => !dirent.isDirectory())
        .map((dirent) => dirent.name)
        .map((filename) => {
            if (!filename.includes('.cy')) return;
            const input = loadAsText(path.resolve(dirname, filename));

            let result: ReturnType<typeof compile>;
            let error;

            try {
                result = compile(input);
            } catch (e) {
                console.error(error);
            }

            return {
                filename,
                compiled: result
            };
        })
        .filter(item => !!item);
}
