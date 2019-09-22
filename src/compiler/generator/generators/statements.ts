import { VarStatement } from '../../NodesTypes';

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
  }
}
