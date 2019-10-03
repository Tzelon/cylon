import {
  ReturnStatement,
  VarStatement,
  DefStatement,
  IfStatement,
  BreakStatement,
  CallStatement,
  FailStatement,
  LetStatement,
  ImportStatement,
  LoopStatement,
  ImportNameBinding,
  ImportSpecifier,
} from '../../NodesTypes';
import Printer from '../printer';

export function VarStatement(this: Printer, node: VarStatement) {
  this.word('var');
  this.space();
  this.print(node.zeroth, node);
  if (node.wunth === undefined) {
    this.semicolon();
  } else {
    this.space();
    this.token('=');
    this.space();
    this.print(node.wunth, node);
    this.semicolon();
  }
  this.newline();
}

export function DefStatement(this: Printer, node: DefStatement) {
  this.word('var');
  this.space();
  this.print(node.zeroth, node);
  this.space();
  this.token('=');
  this.space();
  this.print(node.wunth, node);
  this.semicolon();
  this.newline();
}

export function ReturnStatement(this: Printer, node: ReturnStatement) {
  this.word('return');
  this.space();
  this.print(node.zeroth, node);
  this.semicolon();
}

export function ImportStatement(this: Printer, node: ImportStatement) {
  this.word('import');
  this.space();
  if (node.wunth === undefined) {
    this.token('*');
    this.space();
    this.token('as');
    this.space();
    this.print(node.zeroth, node);
  } else {
    this.print(node.wunth, node);
  }
  this.space();
  this.token('from');
  this.space();
  this.token('"./');
  this.print(node.zeroth, node);
  this.token('"');
  this.semicolon();
  this.newline();
}

export function ImportNameBinding(this: Printer, node: ImportNameBinding) {
  if (node.id === 'only') {
    this.token('{');
    this.space();
    node.binds.zeroth.forEach((bind, index) => {
      this.print(bind, node);
      if (index < node.binds.zeroth.length - 1) {
        this.token(',');
        this.space();
      }
    });
    this.space();
    this.token('}');
  } else if (node.id === 'as') {
    this.token('*');
    this.space();
    this.token('as');
    this.space();
    this.print(node.binds, node);
  }
}

export function ImportSpecifier(this: Printer, node: ImportSpecifier) {
  if (node.alias) {
    this.token(node.name);
    this.space();
    this.token('as');
    this.space();
    this.print(node.alias, node);
  } else {
    this.print(node.name, node);
  }
}

export function IfStatement(this: Printer, node: IfStatement) {
  throw 'Need to implement IfStatement';
}

export function BreakStatement(this: Printer, node: BreakStatement) {
  throw 'Need to implement BreakStatement';
}
export function CallStatement(this: Printer, node: CallStatement) {
  throw 'Need to implement CallStatement';
}
export function FailStatement(this: Printer, node: FailStatement) {
  throw 'Need to implement FailStatement';
}
export function LetStatement(this: Printer, node: LetStatement) {
  throw 'Need to implement LetStatement';
}
export function LoopStatement(this: Printer, node: LoopStatement) {
  throw 'Need to implement LoopStatement';
}
