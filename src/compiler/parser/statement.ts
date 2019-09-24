import {
  BreakStatement,
  CallStatement,
  DefStatement,
  VarStatement,
  ReturnStatement,
  FailStatement,
  IfStatement,
  LetStatement,
  LoopStatement,
  ModuleStatement,
} from '../NodesTypes';
import { Parser } from '../neo.parse';

import {
  expression,
  parse_dot,
  parse_subscript,
  parse_invocation,
  parse_identifier,
} from './expressions';

interface ParseStatemets {
  break: (the_break, parser: Parser) => BreakStatement;
  call: (the_call, parser: Parser) => CallStatement;
  def: (the_def, parser: Parser) => DefStatement;
  fail: (the_fail, parser: Parser) => FailStatement;
  if: (the_if, parser: Parser) => IfStatement;
  let: (the_let, parser: Parser) => LetStatement;
  loop: (the_loop, parser: Parser) => LoopStatement;
  return: (the_return, parser: Parser) => ReturnStatement;
  var: (the_var, parser: Parser) => VarStatement;
  module: (the_var, parser: Parser) => ModuleStatement;
}

// The 'parse_statement' contain functions that do the specialized parsing.
// We are using 'Object.create(null)' to make them because we do not want any of
// the debris from 'Object.prototype' getting dredged up here.
const parse_statement: ParseStatemets = Object.create(null);

// The 'disrupt' property marks statements and statement lists that break or return.
// The 'return' property marks statements and statement lists that return.

// The break statment breaks out of a loop. The parser is passed the 'break' token.
// It sets the exit condition of the current loop.
parse_statement.break = function(the_break, parser) {
  const breakStatement = the_break as BreakStatement;
  breakStatement.syntaxKind = 'BreakStatement';

  if (!parser.is_in_loop()) {
    return parser.error(the_break, "'break' wants to be in a loop.");
  }
  parser.set_top_loop_status('break');
  breakStatement.disrupt = true;
  return breakStatement;
};

// The call statement calls a function and ignores the return value. This is to identify
// calls that are happening solely for their side effects.
parse_statement.call = function(the_call, parser) {
  const callStatement = the_call as CallStatement;
  callStatement.syntaxKind = 'CallStatement';

  callStatement.zeroth = expression(parser);
  if (callStatement.zeroth.id !== '(') {
    return parser.error(callStatement, 'expected a function invocation');
  }

  return callStatement;
};

// The def statement registers read only variables.
parse_statement.def = function(the_def, parser) {
  const defStatement = the_def as DefStatement;
  defStatement.syntaxKind = 'DefStatement';

  if (!parser.token.alphameric) {
    return parser.error(parser.token, 'expected a name.');
  }
  parser.same_line();
  const is_dotted_name = parser.advance_dots(parser.token);
  defStatement.zeroth = parse_identifier(parser, parser.token);
  parser.register(defStatement.zeroth, true);
  parser.advance();
  parser.same_line();
  parser.advance(':');
  const is_module = parser.tag_module();

  if (is_dotted_name && !is_module) {
    return parser.error(
      defStatement.zeroth,
      'only modules can have dots in ther name'
    );
  }

  defStatement.wunth = expression(parser);
  return defStatement;
};

// The fail statement is an exception machanisms.
parse_statement.fail = function(the_fail, _parser) {
  const failStatement = the_fail as FailStatement;
  failStatement.syntaxKind = 'FailStatement';

  failStatement.disrupt = true;
  return failStatement;
};

// The if statement has an optional else clause or else if statement. if both branches distrupt or return,
// then the if statement itself distrupts or return.
parse_statement.if = function if_statement(the_if, parser) {
  const ifStatement = the_if as IfStatement;
  ifStatement.syntaxKind = 'IfStatement';

  ifStatement.zeroth = expression(parser);
  parser.indent();
  ifStatement.wunth = statements(parser);
  parser.outdent();
  if (parser.at_indentation()) {
    if (parser.token.id === 'else') {
      parser.advance('else');
      parser.indent();
      ifStatement.twoth = statements(parser);
      parser.outdent();
      ifStatement.disrupt =
        ifStatement.wunth.disrupt && ifStatement.twoth.disrupt;
      ifStatement.return = ifStatement.wunth.return && ifStatement.twoth.return;
    } else if (parser.token.id.startsWith('else if ')) {
      // Not sure if I need those but maybe.. because of the space between the else if
      //   prelude();
      //   prelude();
      ifStatement.twoth = if_statement(parser.prev_token, parser);
      ifStatement.disrupt =
        ifStatement.wunth.disrupt && ifStatement.twoth.disrupt;
      ifStatement.return = ifStatement.wunth.return && ifStatement.twoth.return;
    }
  }
  return ifStatement;
};

// The let statement is assignment statement. The left side is not an ordinary expression.
// It is a more limited thing called 'lvalue'. An lvalue can be a variable (var not def), or an expression
// that finds a field or element.
parse_statement.let = function(the_let, parser) {
  const letStatement = the_let as LetStatement;
  letStatement.syntaxKind = 'LetStatement';

  // The 'let' statement is the only place where mutation is allowed.

  // The next token must be a name.

  parser.same_line();
  const name = parser.token;
  parser.advance();
  const id = name.id;
  let left = parser.lookup(id);
  if (left === undefined) {
    return parser.error(name, 'expected a variable');
  }
  let readonly = left.readonly;

  // Now we consider the suffix operators ' []  .  [ ' and ' {'.

  while (true) {
    if (parser.token === Parser.the_end) {
      break;
    }
    parser.same_line();

    // A '[]' in this position indicates an array append operation.

    if (parser.token.id === '[]') {
      readonly = false;
      parser.token.zeroth = left;
      left = parser.token;
      parser.same_line();
      parser.advance('[]');
      break;
    }
    if (parser.token.id === '.') {
      readonly = false;
      parser.advance('.');
      left = parse_dot(parser, left, parser.prev_token);
    } else if (parser.token.id === '[') {
      readonly = false;
      parser.advance('[');
      left = parse_subscript(parser, left, parser.prev_token);
    } else if (parser.token.id === '(') {
      readonly = false;
      parser.advance('(');
      left = parse_invocation(parser, left, parser.prev_token);
      //@ts-ignore
      if (token.id === ':') {
        return parser.error(left, 'assignment to the result of a function');
      }
    } else {
      break;
    }
  }
  parser.advance(':');
  if (readonly) {
    return parser.error(left, 'assignment to a constant');
  }
  letStatement.zeroth = left;
  letStatement.wunth = expression(parser);

  // A '[]' in this position indicates an array pop operation.

  if (
    parser.token.id === '[]' &&
    left.id !== '[]' &&
    (letStatement.wunth.alphameric === true ||
      letStatement.wunth.id === '.' ||
      letStatement.wunth.id === '[' ||
      letStatement.wunth.id === '(')
  ) {
    parser.token.zeroth = letStatement.wunth;
    letStatement.wunth = parser.token;
    parser.same_line();
    parser.advance('[]');
  }
  return letStatement;
};

// The loop statement keeps a stack for dealing with nested loops.
// The entries in the stack are the exit conditions of the loops. If there is no explicit exit,
// a stack's status is "infinite". If the only exit is a 'return' statement, its status is "return".
// If the loop exits with a 'break' statement, its status is "break". For this purpose, 'fail' is not an explicit exit condition.
parse_statement.loop = function(the_loop, parser) {
  const loopStatement = the_loop as LoopStatement;
  loopStatement.syntaxKind = 'LoopStatement';

  parser.indent();
  parser.loop.push('infinite');
  loopStatement.zeroth = statements(parser);
  const exit = parser.loop.pop();
  if (exit === 'infinite') {
    return parser.error(loopStatement, "A loop wants a 'break'.");
  }
  if (exit === 'return') {
    loopStatement.disrupt = true;
    loopStatement.return = true;
  }
  parser.outdent();
  return loopStatement;
};

// The return statement changes the status of "infinite" loops to "return".
parse_statement.return = function(the_return, parser) {
  const returnStatement = the_return as ReturnStatement;
  returnStatement.syntaxKind = 'ReturnStatement';
  try {
    if (!parser.is_in_function()) {
      return parser.error(
        returnStatement,
        "'return' wants to be in a function."
      );
    }
    parser.set_infinite_loops_to_return();
    if (parser.is_line_break()) {
      return parser.error(returnStatement, "'return' wants a return value.");
    }
    returnStatement.zeroth = expression(parser);
    if (parser.token.id !== '}') {
      return parser.error(returnStatement, "Misplaced 'return'.");
    }
    returnStatement.disrupt = true;
    returnStatement.return = true;
    return returnStatement;
  } catch (ignore) {
    return parser.the_error;
  }
};

// The var statement declares a variable that can be assigned to with the let statement.
// If the variable is not explicitly initialized, its initial value is null.
parse_statement.var = function(the_var, parser) {
  const varStatement = the_var as VarStatement;
  varStatement.syntaxKind = 'VarStatement';

  if (!parser.token.alphameric) {
    return parser.error(parser.token, 'expected a name.');
  }
  parser.same_line();
  varStatement.zeroth = parse_identifier(parser, parser.token);
  parser.register(varStatement.zeroth);
  parser.advance();
  if (parser.token.id === ':') {
    parser.same_line();
    parser.advance(':');
    varStatement.wunth = expression(parser);
  }
  return varStatement;
};

// The module statement declares a module. Module name can be separated with dots to indicate nesting.
parse_statement.module = function(the_module, parser) {
  const moduleStatement = the_module as ModuleStatement;
  moduleStatement.syntaxKind = 'ModuleStatement';

  if (!parser.token.alphameric) {
    return parser.error(parser.token, 'expected a name.');
  }
  parser.same_line();
  moduleStatement.zeroth = parse_identifier(parser, parser.token);
  parser.register(moduleStatement.zeroth);
  parser.advance();
  if (parser.token.id === '{') {
    parser.same_line();
    parser.advance('}');
    moduleStatement.wunth = statements(parser);
  }
  return moduleStatement;
};

// The statements function parses statements, returing an array of statement tokens.
export function statements(the_parser: Parser) {
  const statement_list = [];
  let the_statement;
  while (true) {
    if (
      the_parser.token === Parser.the_end ||
      the_parser.token.loc.start.column < the_parser.indentation ||
      the_parser.token.alphameric !== true
    ) {
      break;
    }
    the_parser.at_indentation();
    the_parser.advance();
    let parser = parse_statement[the_parser.prev_token.id];
    if (parser === undefined) {
      return the_parser.error(the_parser.prev_token, 'expected a statement');
    }
    // prev_token.class = 'statement';
    the_statement = parser(the_parser.prev_token, the_parser);
    statement_list.push(the_statement);
    if (the_statement.disrupt === true) {
      if (the_parser.token.loc.start.column === the_parser.indentation) {
        return the_parser.error(the_parser.token, 'unreachable');
      }
      break;
    }
  }
  if (statement_list.length === 0) {
    if (!the_parser.token.id.startsWith('export')) {
      return the_parser.error(the_parser.token, 'expected a statement');
    }
  } else {
    //@ts-ignore
    statement_list.disrupt = the_statement.disrupt;
    //@ts-ignore
    statement_list.return = the_statement.return;
  }
  return statement_list;
}
