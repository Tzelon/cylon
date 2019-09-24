import { ReturnStatement, VarStatement, DefStatement } from '../../NodesTypes';
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
  this.print(node.zeroth, node)
  this.semicolon()
}
