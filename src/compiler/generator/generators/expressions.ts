import { FunctionLiteralExpression } from '../../NodesTypes';
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
