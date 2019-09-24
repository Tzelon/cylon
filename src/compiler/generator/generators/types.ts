import { TextLiteral, Identifier, NumberLiteral } from '../../NodesTypes';
import jsesc from 'jsesc';
import Printer from '../printer';

export function TextLiteral(this: Printer, node: TextLiteral) {
  // ensure the output is ASCII-safe
  const val = jsesc(node.text, { json: true });

  return this.token(val);
}

export function Identifier(this: Printer, node: Identifier) {
  this.exactSource(node.loc, () => {
    this.word(node.id);
  });
}


export function NumberLiteral(this: Printer, node: NumberLiteral) {
  this.number(node.number)
}