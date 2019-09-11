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
} from '../NodesTypes';
import {
  is_in_loop,
  set_top_loop_status,
  add_loop,
  pop_loop,
  set_infinite_loops_to_return,
  register,
  lookup,
  error,
  is_in_function,
} from '../globals';
import {
  is_line_break,
  same_line,
  advance,
  advance_dots,
  tag_module,
  indent,
  outdent,
  get_tokens,
  at_indentation,
  get_indentation,
  the_end,
  parse_dot,
  parse_subscript,
  parse_invocation,
} from '../neo.parse';

// The 'parse_statement' contain functions that do the specialized parsing.
// We are using 'Object.create(null)' to make them because we do not want any of
// the debris from 'Object.prototype' getting dredged up here.
const parse_statement = Object.create(null);

// The 'disrupt' property marks statements and statement lists that break or return.
// The 'return' property marks statements and statement lists that return.

// The break statment breaks out of a loop. The parser is passed the 'break' token.
// It sets the exit condition of the current loop.
parse_statement.break = function(the_break): BreakStatement {
  const breakStatement = the_break as BreakStatement;
  breakStatement.syntaxKind = 'BreakStatment';

  if (is_in_loop()) {
    return error(the_break, "'break' wants to be in a loop.");
  }
  set_top_loop_status('break');
  breakStatement.disrupt = true;
  return breakStatement;
};

// The call statement calls a function and ignores the return value. This is to identify
// calls that are happening solely for their side effects.
parse_statement.call = function(the_call) {
  const callStatement = the_call as CallStatement;
  callStatement.syntaxKind = 'CallStatment';

  callStatement.zeroth = expression();
  if (callStatement.zeroth.id !== '(') {
    return error(callStatement, 'expected a function invocation');
  }

  return callStatement;
};

// The def statement registers read only variables.
parse_statement.def = function(the_def) {
  const defStatement = the_def as DefStatement;
  defStatement.syntaxKind = 'DefStatement';

  const { token } = get_tokens();
  if (!token.alphameric) {
    return error(token, 'expected a name.');
  }
  same_line();
  const is_dotted_name = advance_dots(token);
  defStatement.zeroth = token;
  register(token, true);
  advance();
  same_line();
  advance(':');
  const is_module = tag_module();

  if (is_dotted_name && !is_module) {
    return error(
      defStatement.zeroth,
      'only modules can have dots in ther name'
    );
  }

  defStatement.wunth = expression();
  return defStatement;
};

// The fail statement is an exception machanisms.
parse_statement.fail = function(the_fail) {
  const failStatement = the_fail as FailStatement;
  failStatement.syntaxKind = 'FailStatement';

  failStatement.disrupt = true;
  return failStatement;
};

// The if statement has an optional else clause or else if statement. if both branches distrupt or return,
// then the if statement itself distrupts or return.
parse_statement.if = function if_statement(the_if) {
  const ifStatement = the_if as IfStatement;
  ifStatement.syntaxKind = 'IfStatement';

  const { token, prev_token } = get_tokens();
  ifStatement.zeroth = expression();
  indent();
  ifStatement.wunth = statements();
  outdent();
  if (at_indentation()) {
    if (token.id === 'else') {
      advance('else');
      indent();
      ifStatement.twoth = statements();
      outdent();
      ifStatement.disrupt =
        ifStatement.wunth.disrupt && ifStatement.twoth.disrupt;
      ifStatement.return = ifStatement.wunth.return && ifStatement.twoth.return;
    } else if (token.id.startsWith('else if ')) {
      // Not sure if I need those but maybe.. because of the space between the else if
      //   prelude();
      //   prelude();
      ifStatement.twoth = if_statement(prev_token);
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
parse_statement.let = function(the_let) {
  const letStatement = the_let as LetStatement;
  letStatement.syntaxKind = 'LetStatement';

  const { token, prev_token } = get_tokens();
  // The 'let' statement is the only place where mutation is allowed.

  // The next token must be a name.

  same_line();
  const name = token;
  advance();
  const id = name.id;
  let left = lookup(id);
  if (left === undefined) {
    return error(name, 'expected a variable');
  }
  let readonly = left.readonly;

  // Now we consider the suffix operators ' []  .  [ ' and ' {'.

  while (true) {
    if (token === the_end) {
      break;
    }
    same_line();

    // A '[]' in this position indicates an array append operation.

    if (token.id === '[]') {
      readonly = false;
      token.zeroth = left;
      left = token;
      same_line();
      advance('[]');
      break;
    }
    if (token.id === '.') {
      readonly = false;
      advance('.');
      left = parse_dot(left, prev_token);
    } else if (token.id === '[') {
      readonly = false;
      advance('[');
      left = parse_subscript(left, prev_token);
    } else if (token.id === '(') {
      readonly = false;
      advance('(');
      left = parse_invocation(left, prev_token);
      //@ts-ignore
      if (token.id === ':') {
        return error(left, 'assignment to the result of a function');
      }
    } else {
      break;
    }
  }
  advance(':');
  if (readonly) {
    return error(left, 'assignment to a constant');
  }
  letStatement.zeroth = left;
  letStatement.wunth = expression();

  // A '[]' in this position indicates an array pop operation.

  if (
    token.id === '[]' &&
    left.id !== '[]' &&
    (letStatement.wunth.alphameric === true ||
      letStatement.wunth.id === '.' ||
      letStatement.wunth.id === '[' ||
      letStatement.wunth.id === '(')
  ) {
    token.zeroth = letStatement.wunth;
    letStatement.wunth = token;
    same_line();
    advance('[]');
  }
  return letStatement;
};

// The loop statement keeps a stack for dealing with nested loops.
// The entries in the stack are the exit conditions of the loops. If there is no explicit exit,
// a stack's status is "infinite". If the only exit is a 'return' statement, its status is "return".
// If the loop exits with a 'break' statement, its status is "break". For this purpose, 'fail' is not an explicit exit condition.
parse_statement.loop = function(the_loop) {
  const loopStatement = the_loop as LoopStatement;
  loopStatement.syntaxKind = 'LoopStatement';

  indent();
  add_loop('infinite');
  loopStatement.zeroth = statements();
  const exit = pop_loop();
  if (exit === 'infinite') {
    return error(loopStatement, "A loop wants a 'break'.");
  }
  if (exit === 'return') {
    loopStatement.disrupt = true;
    loopStatement.return = true;
  }
  outdent();
  return loopStatement;
};

// The return statement changes the status of "infinite" loops to "return".
parse_statement.return = function(the_return) {
  const returnStatement = the_return as ReturnStatement;
  returnStatement.syntaxKind = 'ReturnStatement';

  const { token } = get_tokens();
  //   try {
  if (is_in_function()) {
    return error(returnStatement, "'return' wants to be in a function.");
  }
  set_infinite_loops_to_return();
  if (is_line_break()) {
    return error(returnStatement, "'return' wants a return value.");
  }
  returnStatement.zeroth = expression();
  if (token.id === '}') {
    return error(returnStatement, "Misplaced 'return'.");
  }
  returnStatement.disrupt = true;
  returnStatement.return = true;
  return returnStatement;
  //   } catch (ignore) {
  //     return the_error;
  //   }
};

// The var statement declares a variable that can be assigned to with the let statement.
// If the variable is not explicitly initialized, its initial value is null.
parse_statement.var = function(the_var) {
  const varStatement = the_var as VarStatement;
  varStatement.syntaxKind = 'VarStatement';

  const { token } = get_tokens();
  if (!token.alphameric) {
    return error(token, 'expected a name.');
  }
  same_line();
  varStatement.zeroth = token;
  register(token);
  advance();
  if (token.id === ':') {
    same_line();
    advance(':');
    varStatement.wunth = expression();
  }
  return varStatement;
};

// The statements function parses statements, returing an array of statement tokens.
export function statements() {
  const { token, prev_token } = get_tokens();
  const statement_list = [];
  let the_statement;
  while (true) {
    if (
      token === the_end ||
      token.column_nr < get_indentation() ||
      token.alphameric !== true
    ) {
      break;
    }
    at_indentation();
    advance();
    let parser = parse_statement[prev_token.id];
    if (parser === undefined) {
      return error(prev_token, 'expected a statement');
    }
    // prev_token.class = 'statement';
    the_statement = parser(prev_token);
    statement_list.push(the_statement);
    if (the_statement.disrupt === true) {
      if (token.column_nr === get_indentation()) {
        return error(token, 'unreachable');
      }
      break;
    }
  }
  if (statement_list.length === 0) {
    if (!token.id.startsWith('export')) {
      return error(token, 'expected a statement');
    }
  } else {
    //@ts-ignore
    statement_list.disrupt = the_statement.disrupt;
    //@ts-ignore
    statement_list.return = the_statement.return;
  }
  return statement_list;
}
