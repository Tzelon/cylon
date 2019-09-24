import {
  ReturnStatement,
  VarStatement,
  DefStatement,
  IfStatement,
  BreakStatement,
  CallStatement,
  FailStatement,
  LetStatement,
  LoopStatement,
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
  this.print(node.zeroth, node);
  this.semicolon();
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
