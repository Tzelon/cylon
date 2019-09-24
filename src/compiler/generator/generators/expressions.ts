import $NEO from '../../../runtime/neo.runtime';
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
      this.token('...' + mangle(param.zeroth.id));
    } else if (param.id === '|') {
      this.token(mangle(param.zeroth.id));
      this.space();
      this.token('=');
      this.space();
      this.print(param.wunth, node);
    } else {
      this.token(mangle(param.id));
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

const rx_exclamation_question = /[\\!?]/g;
const reserved = [];
function mangle(name) {
  // JavaScript does not allow ! or '?' in identifiers, so we
  // replace them with '_'. We give reserved words a '$' prefix.

  //  So 'what_me_worry?' becomes 'what_me_worry_', and 'class' becomes '$class'.

  return reserved[name] === true
    ? '$' + name
    : name.replace(rx_exclamation_question, '_');
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

function make_set(array, value = true) {
  const object = Object.create(null);
  array.forEach(function(element) {
    object[element] = value;
  });
  return $NEO.stone(object);
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
