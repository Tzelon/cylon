import parse from './src/compiler/neo.parse';
import tokenize from './src/compiler/neo.tokenize';
import codegen from './src/compiler/neo.codegen';
import { walk } from './utils/ast-visitor';
import util from 'util';
import fs from 'fs';
import path from 'path';

const readFile = util.promisify(fs.readFile);

Promise.all(
  readCyFiles(path.resolve(process.cwd(), './experiments/cy-example'))
).then(programs => {
  const modules = resolveModules(programs);
  const jscode = codegen(modules[0]);
  writeFiles(jscode[0]);
});

function resolveModules(programs) {
  let modules = programs.flatMap(program => {
    return program.zeroth;
  });

  return modules;
}

//TODO: handle the scope of the module! we must passed it to the new location.
function nest_in_module(module_to_nest, target_module, nesting) {
  if (nesting.length === 0) {
    target_module.wunth.zeroth.push(module_to_nest);
    return;
  }
  target_module.wunth.zeroth.forEach(statement => {
    if (statement.wunth.id === 'module' && statement.zeroth.id === nesting[0]) {
      nest_in_module(module_to_nest, statement, nesting.slice(1));
    }
  });
}

function writeFiles(mod, module_name = 'Main') {
  const mapFilename = module_name + '.js.map';
  const output = mod.toStringWithSourceMap({ file: mapFilename });
  //We must add the //# sourceMappingURL comment directive
  //so that the browser’s debugger knows where to find the source map.
  output.code += '\n//# sourceMappingURL=' + mapFilename;
  fs.writeFileSync(
    path.resolve(__dirname, `../dist/${module_name}.js`),
    output.code,
    'utf-8'
  );
  fs.writeFileSync(
    path.resolve(__dirname, `../dist/${mapFilename}`),
    output.map,
    'utf-8'
  );
  // if (Object.keys(mod.children).length !== 0) {
  //     Object.keys(mod.children).forEach((inner_mod) => {
  //         writeFiles(mod.children[inner_mod]);
  //     });
  // }
}

function readCyFiles(dirPath) {
  const dirent = fs.readdirSync(dirPath, { withFileTypes: true });
  return dirent
    .filter(dirent => {
      if (!dirent.isFile()) return false;
      const splitedFileName = dirent.name.split('.');
      if (splitedFileName[splitedFileName.length - 1] !== 'cy') {
        return false;
      }

      return true;
    })
    .map(function({ name }) {
      return readFile(path.resolve(dirPath, name), 'utf-8').then(content =>
        parse_code(content, name)
      );
    });
}

function parse_code(content, filename) {
  let hrstart = process.hrtime();
  const tokenized = tokenize(content);
  const parsed = parse(tokenized, filename);
  let entered = [];
  let left = [];

  walk(parsed, {
    enter(node) {
      entered.push(node);
    },
    leave(node) {
      left.push(node);
    },
  });
  let hrend = process.hrtime(hrstart);
  console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);

  if (parsed.id === '(error)') {
    console.error(util.inspect(parsed, true, 10000));
  }
  return parsed;
}
