import {
  ArrayLiteralExpression,
  NumberLiteral,
  TextLiteral,
  Identifier,
} from '../../NodesTypes';
import jsesc from 'jsesc';
import Printer from '../printer';

export function TextLiteral(this: Printer, node: TextLiteral) {
  // ensure the output is ASCII-safe
  //@ts-ignore
  const opts = this.format.jsescOption;
  //@ts-ignore
  if (this.format.jsonCompatibleStrings) {
    opts.json = true;
  }
  const val = jsesc(node.text, opts);

  return this.token(val);
}

export function Identifier(this: Printer, node: Identifier) {
  this.exactSource({ column_nr: node.column_nr, line_nr: node.line_nr }, () => {
    this.word(node.id);
  });
}