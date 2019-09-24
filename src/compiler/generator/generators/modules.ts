import { ModuleStatement } from '../../NodesTypes';
import Printer from '../printer';
export function ModuleStatement(this: Printer, node: ModuleStatement) {
  node.front_matter.forEach(line => {
    if (typeof line === 'string') {
      this.token(line);
    } else {
      this.token(this.numgle(line));
    }
    this.newline();
  });
  this.printJoin(node.zeroth, node);
}
