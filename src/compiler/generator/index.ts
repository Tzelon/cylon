import SourceMap from './source-map';
import Printer from './printer';

interface Options {
  sourceMaps?: boolean;
}

class Generator extends Printer {
  constructor(ast: any, opts: Options, code: string) {
    const format = {}; // is the format options;
    const map = opts.sourceMaps ? new SourceMap(opts, code) : null;
    super(format, map);

    this.ast = ast;
  }

  ast: Object;

  /**
   * Generate code and sourcemap from ast.
   * Appends comments that weren't attached to any node to the end of the generated output.
   */

  generate() {
    return super.generate(this.ast);
  }
}

export default function(ast: Object, opts: Object, code: string): Object {
  const gen = new Generator(ast, opts, code);
  return gen.generate();
}
