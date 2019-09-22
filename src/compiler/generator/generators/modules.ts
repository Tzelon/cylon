import { ModuleStatement } from '../../NodesTypes';
import Printer from '../printer';
export function ModuleStatement(this: Printer, node: ModuleStatement) {
    this.token('import $NEO from "./neo.runtime.js"');
    this.newline();
    this.printJoin(node.zeroth, node)
}
