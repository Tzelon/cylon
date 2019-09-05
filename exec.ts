import parse from './src/compiler/neo.parse';
import tokenize from './src/compiler/neo.tokenize';
import codegen from './src/compiler/neo.codegen';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as sourceMap from 'source-map';

const readFile = util.promisify(fs.readFile);

Promise.all(readCyFiles(path.resolve(process.cwd(), './experiments/cy-example'))).then((programs) => {
    const modules = resolveModules(programs);
    const jscode = codegen(modules);
    writeFiles(jscode);
});

function resolveModules(programs) {
    let modules = programs.flatMap((program) => {
        return program.zeroth;
    });

    let nested_modules = {};

    modules.forEach((statement, index, modules) => {
        if (statement.id === 'def' && statement.wunth.id === 'module') {
            const splited_module_name = statement.zeroth.id.split('_');
            if (splited_module_name.length > 1) {
                // changing the name of the module
                statement.zeroth.id = splited_module_name[splited_module_name.length - 1];
                nested_modules[splited_module_name[0]] = {
                    statement,
                    nesting: splited_module_name.slice(1, -1)
                };
                delete modules[index];
            }
        }
    });

    modules.forEach((statement) => {
        if (statement === undefined) return;
        const module_name = statement.zeroth.id;
        const nested_module = nested_modules[module_name];

        if (nested_module === undefined) return;
        nest_in_module(nested_module.statement, statement, nested_module.nesting);
    });

    return modules.filter((mod) => !!mod);
}

//TODO: handle the scope of the module! we must passed it to the new location.
function nest_in_module(module_to_nest, target_module, nesting) {
    if (nesting.length === 0) {
        target_module.wunth.zeroth.push(module_to_nest);
        return;
    }
    target_module.wunth.zeroth.forEach((statement) => {
        if (statement.wunth.id === 'module' && statement.zeroth.id === nesting[0]) {
            nest_in_module(module_to_nest, statement, nesting.slice(1));
        }
    });
}

function writeFiles(mod) {
    const mapFilename = mod.id + '.js.map';
    const output = mod.content.toStringWithSourceMap({ file: mapFilename });
    //We must add the //# sourceMappingURL comment directive
    //so that the browser’s debugger knows where to find the source map.
    output.code += '\n//# sourceMappingURL=' + mapFilename;
    fs.writeFileSync(path.resolve(__dirname, `../dist/${mod.id}.js`), output.code, 'utf-8');
    fs.writeFileSync(path.resolve(__dirname, `../dist/${mapFilename}`), output.map, 'utf-8');
    if (Object.keys(mod.children).length !== 0) {
        Object.keys(mod.children).forEach((inner_mod) => {
            writeFiles(mod.children[inner_mod]);
        });
    }
}

function readCyFiles(dirPath) {
    const dirent = fs.readdirSync(dirPath, { withFileTypes: true });
    return dirent
        .filter((dirent) => {
            if (!dirent.isFile()) return false;
            const splitedFileName = dirent.name.split('.');
            if (splitedFileName[splitedFileName.length - 1] !== 'cy') {
                return false;
            }

            return true;
        })
        .map(function({ name }) {
            return readFile(path.resolve(dirPath, name), 'utf-8')
                .then((content) => parse_code(content, name));
        });
}

function parse_code(content, filename) {
    let hrstart = process.hrtime();
    const tokenized = tokenize(content);
    const parsed = parse(tokenized, filename);
    let hrend = process.hrtime(hrstart);
    console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);

    if (parsed.id === '(error)') {
        console.error(util.inspect(parsed, true, 10000));
    }
    return parsed;
}
