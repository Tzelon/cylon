import jsesc from 'jsesc';
import $NEO from '../../../runtime/neo.runtime';
import { make_set } from '../../utils';
import {
  FunctionLiteralExpression,
  ArrayLiteralExpression,
  BinaryExpression,
  RecordLiteralExpression,
} from '../../NodesTypes';
import Printer from '../printer';

export function FunctionLiteralExpression(
  this: Printer,
  node: FunctionLiteralExpression
) {
  this.token('$NEO.stone(function ');
  this.token('(');
  node.zeroth.forEach((param, index) => {
    if (param.id === '...') {
      this.token('...' + this.mangle(param.zeroth.id));
    } else if (param.id === '|') {
      this.token(this.mangle(param.zeroth.id));
      this.space();
      this.token('=');
      this.space();
      this.print(param.wunth, node);
    } else {
      this.token(this.mangle(param.id));
    }

    if (index < node.zeroth.length - 1) {
      this.token(',');
      this.space();
    }
  });
  this.token(')');
  this.space();

  if (Array.isArray(node.wunth)) {
    this.token('{');
    this.newline();
    this.indent();
    this.printJoin(node.wunth, node);
    this.outdent();
    this.newline();
    this.token('}');
  } else {
    this.token('{');
    this.token('return');
    this.space();
    this.print(node.wunth, node);
    this.semicolon();
    this.token('}');
  }

  this.token(')');
}

export function ArrayLiteralExpression(
  this: Printer,
  node: ArrayLiteralExpression
) {
  if (node.id === '[]') {
    this.token('[]');
  } else {
    this.token('[');
    node.zeroth.forEach((element, index) => {
      this.print(element, node);
      if (index < node.zeroth.length - 1) {
        this.token(',');
        this.space();
      }
    });
    this.token(']');
  }
}

export function RecordLiteralExpression(
  this: Printer,
  node: RecordLiteralExpression
) {
  if (node.id === '{}') {
    this.token('Object.create(null)');
  } else {
    this.indent();
    this.token('(function(o) ');
    this.token('{');
    this.newline();
    node.zeroth.forEach(element => {
      if (typeof element.zeroth.text === 'string') {
        this.withSource('start', element.zeroth.loc, () => {
          this.token('o[');
          this.token(jsesc(element.zeroth.text, { json: true }));
          this.token(']');
          this.space();
          this.token('=');
          this.space();
          this.print(element.wunth, node);
          this.semicolon();
        });
      } else {
        this.withSource('start', element.zeroth.loc, () => {
          this.token('$NEO.set(o, ');
          this.print(element.zeroth, node);
          this.token(',');
          this.space();
          this.print(element.wunth, node);
          this.token(')');
          this.semicolon();
        });
      }
      this.newline();
    });
    this.token('return o');
    this.semicolon();
    this.newline();
    this.outdent();
    this.token('}');
    this.token('(Object.create(null)))');
  }
}

export function BinaryExpression(this: Printer, node: BinaryExpression) {
  const transform = operator_transform[node.id];
  if (typeof transform === 'string') {
    this.token(transform);
    this.token('(');
    this.print(node.zeroth, node);
    this.token(',');
    this.space();
    this.print(node.wunth, node);
    this.token(')');
  } else {
    transform(this, node);
  }
}

const operator_transform = $NEO.stone({
  '/\\': function(printer: Printer, node: BinaryExpression) {
    printer.token('(');
    assert_boolean(printer, node.zeroth);
    printer.space();
    printer.token('&&');
    printer.space();
    assert_boolean(printer, node.wunth);
    printer.token(')');
  },
  '\\/': function(printer: Printer, node) {
    printer.token('(');
    assert_boolean(printer, node.zeroth);
    printer.space();
    printer.token('||');
    printer.space();
    assert_boolean(printer, node.wunth);
    printer.token(')');
  },
  '=': '$NEO.eq',
  '≠': '$NEO.ne',
  '<': '$NEO.lt',
  '≥': '$NEO.ge',
  '>': '$NEO.gt',
  '≤': '$NEO.le',
  '~': '$NEO.cat',
  '≈': '$NEO.cats',
  '+': '$NEO.add',
  '-': '$NEO.sub',
  '>>': '$NEO.max',
  '<<': '$NEO.min',
  '*': '$NEO.mul',
  '/': '$NEO.div',
  //TODO: Not sure what is a pipe need to check in the book
  // '|': function(printer: Printer, node: BinaryExpression) {
  //   return (
  //     '(function (_0) {' +
  //     'return (_0 === undefined) ? ' +
  //     expression(node.wunth) +
  //     ' : _0);}(' +
  //     expression(node.zeroth) +
  //     '))'
  //   );
  // },
});

function assert_boolean(printer: Printer, node: any) {
  if (
    boolean_operator[node.id] === true ||
    (node.zeroth !== undefined &&
      node.zeroth.origin === undefined &&
      boolean_operator[node.zeroth.id])
  ) {
    printer.print(node, null);
  } else {
    printer.token('$NEO.assert_boolean');
    printer.token('(');
    printer.print(node, null);
    printer.token(')');
  }
}

const boolean_operator = make_set([
  'array?',
  'boolean?',
  'function?',
  'integer?',
  'not',
  'number?',
  'record?',
  'stone?',
  'text?',
  'true',
  '=',
  '≠',
  '<',
  '>',
  '≤',
  '≥',
  '/\\',
  '\\/',
]);
