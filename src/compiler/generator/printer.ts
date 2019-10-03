import big_float from '../../runtime/numbers/big_float';
import SourceMap from './source-map';
import Buffer from './buffer';
import * as generatorFunctions from './generators';
import js_reserved from './javascript-reserved-words';

const MINUS_POINT = /[\-.]/g;
const EXCLAMATION_QUESTION = /[\\!?]/g;

export type Format = {
  shouldPrintComment: (comment: string) => boolean;
  retainLines: boolean;
  retainFunctionParens: boolean;
  comments: boolean;
  auxiliaryCommentBefore: string;
  auxiliaryCommentAfter: string;
  compact: boolean | 'auto';
  minified: boolean;
  concise: boolean;
  indent: {
    adjustMultilineComment: boolean;
    style: string;
    base: number;
  };
  decoratorsBeforeExport: boolean;
};

export default class Printer {
  format?: Format | {};
  inForStatementInitCounter: number = 0;

  _buf: Buffer;
  _printStack: Array<Node> = [];
  _indentation: number = 0;
  _insideAux: boolean = false;
  _printedCommentStarts: object = {};
  _parenPushNewlineState?: object = null;
  _noLineTerminator: boolean = false;
  _printAuxAfterOnNextUserNode: boolean = false;
  _printedComments = new WeakSet();
  _endsWithInteger = false;
  _endsWithWord = false;
  _uniqueName = Object.create(null);
  _now_function = null;

  constructor(format: Format | {}, map: SourceMap) {
    this.format = format || {};
    this._buf = new Buffer(map);
  }

  generate(ast) {
    this.print(ast, null);

    return this._buf.get();
  }

  /**
   * Increment indent size.
   */

  indent(): void {
    this._indentation += 4;
  }

  /**
   * Decrement indent size.
   */

  outdent(): void {
    this._indentation -= 4;
  }
  /**
   * Get the current indent.
   */

  _getIndent(): string {
    return ' '.repeat(this._indentation);
  }

  _maybeIndent(str: string): void {
    // we've got a newline before us so prepend on the indentation
    if (this.endsWith('\n') && str[0] !== '\n') {
      this._buf.queue(this._getIndent());
    }
  }

  /**
   * Add a semicolon to the buffer.
   */

  semicolon(force: boolean = false): void {
    this._append(';', !force /* queue */);
  }

  /**
   * Add a right brace to the buffer.
   */

  rightBrace(): void {
    this.token('}');
  }

  /**
   * Add a space to the buffer unless it is compact.
   */

  space(force: boolean = false): void {
    if (
      (this._buf.hasContent() && !this.endsWith(' ') && !this.endsWith('\n')) ||
      force
    ) {
      this._space();
    }
  }

  /**
   * Writes a token that can't be safely parsed without taking whitespace into account.
   */

  word(str: string): void {
    // prevent concatenating words and creating // comment out of division and regex
    if (this._endsWithWord || (this.endsWith('/') && str.indexOf('/') === 0)) {
      this._space();
    }

    this._append(str);

    this._endsWithWord = true;
  }

  mangle(name) {
    // JavaScript does not allow ! or '?' in identifiers, so we
    // replace them with '_'. We give reserved words a '$' prefix.

    //  So 'what_me_worry?' becomes 'what_me_worry_', and 'class' becomes '$class'.

    return js_reserved[name] === true
      ? '$' + name
      : name.replace(EXCLAMATION_QUESTION, '_');
  }

  numgle(number) {
    // We make big decimal literals look as natural as possible by making them into
    // constants. A constant name start with '$'. A '-' or '.' is replaced with '_'.

    //  So, '1' becomes '$1', '98.6' becomes '$98_6', and '-1.011e-5' becomes
    //  '$_1_011e_5'.

    const text = big_float.string(number);
    const name = '$' + text.replace(MINUS_POINT, '_');

    // If name is not created yet we return the front_matter.
    // This is probably called from modules generator
    if (this._uniqueName[name] !== true) {
      this._uniqueName[name] = true;
      return 'const ' + name + ' = $NEO.number("' + text + '");';
    }
    // Else we return the name
    return name;
  }

  /**
   * Writes a number token so that we can validate if it is an integer.
   */

  number(number: any): void {
    const name = this.numgle(number);

    this.word(name);
  }

  /**
   * Writes a simple token.
   */

  token(str: string): void {
    // space is mandatory to avoid outputting <!--
    // http://javascript.spec.whatwg.org/#comment-syntax
    if (
      (str === '--' && this.endsWith('!')) ||
      // Need spaces for operators of the same kind to avoid: `a+++b`
      (str[0] === '+' && this.endsWith('+')) ||
      (str[0] === '-' && this.endsWith('-')) ||
      // Needs spaces to avoid changing '34' to '34.', which would still be a valid number.
      (str[0] === '.' && this._endsWithInteger)
    ) {
      this._space();
    }

    this._append(str);
  }

  /**
   * Add a newline (or many newlines), maintaining formatting.
   */

  newline(i?: number): void {
    // never allow more than two lines
    if (this.endsWith('\n\n')) return;

    if (typeof i !== 'number') i = 1;

    i = Math.min(2, i);
    if (this.endsWith('{\n') || this.endsWith(':\n')) i--;
    if (i <= 0) return;

    for (let j = 0; j < i; j++) {
      this._newline();
    }
  }

  endsWith(str: string): boolean {
    return this._buf.endsWith(str);
  }

  removeTrailingNewline(): void {
    this._buf.removeTrailingNewline();
  }

  exactSource(loc: Object, cb: () => void) {
    this._catchUp('start', loc);

    this._buf.exactSource(loc, cb);
  }

  source(prop: string, loc: Object): void {
    this._catchUp(prop, loc);

    this._buf.source(prop, loc);
  }

  withSource(prop: string, loc: Object, cb: () => void): void {
    this._catchUp(prop, loc);

    this._buf.withSource(prop, loc, cb);
  }

  _space(): void {
    this._append(' ', true /* queue */);
  }

  _newline(): void {
    this._append('\n', true /* queue */);
  }

  _append(str: string, queue: boolean = false) {
    this._maybeIndent(str);

    if (queue) this._buf.queue(str);
    else this._buf.append(str);

    this._endsWithWord = false;
    this._endsWithInteger = false;
  }

  _catchUp(prop: string, loc: Object) {
    // catch up to this nodes newline if we're behind
    const pos = loc ? loc[prop] : null;
    if (pos && pos.line !== null) {
      const count = pos.line - this._buf.getCurrentLine();

      for (let i = 0; i < count; i++) {
        this._newline();
      }
    }
  }

  print(node, parent) {
    if (!node) return;

    const printMethod = this[node.syntaxKind];
    if (!printMethod) {
      throw new ReferenceError(
        `unknown node of type ${JSON.stringify(node.syntaxKind)}`
      );
    }

    this._printStack.push(node);

    const loc = node.syntaxKind === 'ModuleStatement' ? null : node.loc;
    this.withSource('start', loc, () => {
      printMethod.call(this, node, parent);
    });

    // end
    this._printStack.pop();
  }

  printJoin(nodes: any[], parent) {
    if (!nodes.length) return;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;

      this.print(node, parent);
    }
  }
}

// Expose the node type functions and helpers on the prototype for easy usage.
Object.assign(Printer.prototype, generatorFunctions);

function commaSeparator() {
  this.token(',');
  this.space();
}
