import { register, lookup, error } from '../globals';
import {
  is_line_break,
  same_line,
  advance,
  indent,
  outdent,
  at_indentation,
  the_end,
  parse_dot,
  parse_subscript,
  parse_invocation,
  get_tokens,
} from '../neo.parse';

// The 'parse_prefix', and 'parse_suffix' objects
// contain functions that do the specialized parsing. We are using
// 'Object.create(null)' to make them because we do not want any of
// the debris from 'Object.prototype' getting dredged up here.

const parse_prefix = Object.create(null);
const parse_suffix = Object.create(null);

// The 'suffix' function builds the parse_suffix array. It takes an operator and a precedence
// and an optinal parser. It can provide a default parser function that works for most of the operators.

function suffix(
  id: string,
  precedence: number,
  optional_parser = function infix(left, the_token) {
    the_token.zeroth = left;
    the_token.wunth = expression(precedence);
    return the_token;
  }
) {
  // Make an infix or suffix operator.

  const the_symbol = Object.create(null);
  the_symbol.id = id;
  the_symbol.precedence = precedence;
  the_symbol.parser = optional_parser;
  parse_suffix[id] = Object.freeze(the_symbol);
}

suffix('|', 111, function parse_default(left, the_bar) {
  the_bar.zeroth = left;
  the_bar.wunth = expression(112);
  advance('|');
  return the_bar;
});
suffix('?', 111, function then_else(left, the_then) {
  the_then.zeroth = left;
  the_then.wunth = expression();
  advance('!');
  the_then.twoth = expression();
  return the_then;
});
suffix('/\\', 222);
suffix('\\/', 222);
suffix('~', 444);
suffix('≈', 444);
suffix('+', 555);
suffix('-', 555);
suffix('<<', 555);
suffix('>>', 555);
suffix('*', 666);
suffix('/', 666);
suffix('.', 777, parse_dot);
suffix('[', 777, parse_subscript);
suffix('(', 777, parse_invocation);

//We treat the relational operators a little differently to guard against a < b ≤ c errors.

const rel_op = Object.create(null);

function relational(operator) {
  const { token } = get_tokens();
  rel_op[operator] = true;
  return suffix(operator, 333, function(left, the_token) {
    the_token.zeroth = left;
    the_token.wunth = expression(333);
    if (rel_op[token.id] === true) {
      return error(token, 'unexpected relational operator');
    }
    return the_token;
  });
}

relational('=');
relational('≠');
relational('<');
relational('>');
relational('≤');
relational('≥');

// The prefix function builds the parse_prefix array. Notice that '(' and '[' are also in the parse_suffix array.
// That is not a problem. There is no ambiguity. Prefix operators do not need precedence.

function prefix(id, parser) {
  const the_symbol = Object.create(null);
  the_symbol.id = id;
  the_symbol.parser = parser;
  parse_prefix[id] = Object.freeze(the_symbol);
}

prefix('(', function(ignore) {
  let result;
  if (is_line_break()) {
    indent();
    result = expression(0, true);
    outdent();
    at_indentation();
  } else {
    result = expression(0);
    same_line();
  }
  advance(')');
  return result;
});

prefix('[', function arrayliteral(the_bracket) {
  const { token, next_token } = get_tokens();
  let matrix = [];
  let array = [];
  if (!is_line_break()) {
    while (true) {
      array.push(ellipsis(expression()));
      if (token.id === ',') {
        same_line();
        advance(',');
      } else if (
        token.id === ';' &&
        array.length > 0 &&
        //@ts-ignore
        next_token !== ']'
      ) {
        same_line();
        advance(';');
        matrix.push(array);
        array = [];
      } else {
        break;
      }
    }
    same_line();
  } else {
    indent();
    while (true) {
      array.push(ellipsis(expression(0, is_line_break())));
      if (token.id === ']' || token === the_end) {
        break;
      }
      if (token.id === ';') {
        if (array.length === 0 || next_token.id === ']') {
          break;
        }
        same_line();
        advance(';');
        matrix.push(array);
        array = [];
      } else if (token.id === ',' || !is_line_break()) {
        same_line();
        advance(',');
      }
    }
    outdent();
    if (token.column_nr !== indentation) {
      return error(token, 'expected at ' + indentation);
    }
  }
  advance(']');
  if (matrix.length > 0) {
    matrix.push(array);
    the_bracket.zeroth = matrix;
  } else {
    the_bracket.zeroth = array;
  }
  return the_bracket;
});

prefix('[]', function emptyarrayliteral(the_brackets) {
  return the_brackets;
});

// The record literal parser recognizes 4 forms of fields.
//  * variable
//  * name: expression
//  * "string": expression
//  * [expression]: expression

prefix('{', function recordliteral(the_brace) {
  const properties = [];
  let key;
  let value;
  const open = the_brace.line_nr !== token.line_nr;
  if (open) {
    indent();
  }
  while (true) {
    line_check(open);
    if (token.id === '[') {
      advance('[');
      key = expression();
      advance(']');
      same_line();
      advance(':');
      value = expression();
    } else {
      key = token;
      advance();
      if (key.alphameric === true) {
        if (token.id === ':') {
          same_line();
          advance(':');
          value = expression();
        } else {
          value = lookup(key.id);
          if (value === undefined) {
            return error(key, 'expected a variable');
          }
        }
        key = key.id;
      } else if (key.id === '(text)') {
        key = key.text;
        same_line();
        advance(':');
        value = expression();
      } else {
        return error(key, 'expected a key');
      }
    }
    properties.push({
      zeroth: key,
      wunth: value,
    });
    if (token.column_nr < indentation || token.id === '}') {
      break;
    }
    if (!open) {
      same_line();
      advance(',');
    }
  }
  if (open) {
    outdent();
    at_indentation();
  } else {
    same_line();
  }
  advance('}');
  the_brace.zeroth = properties;
  return the_brace;
});

prefix('{}', function emptyrecordliteral(the_braces) {
  return the_braces;
});

// The function literal parser makes new functions. It also gives access to functinos.

const functino = (function make_set(array, value = true) {
  const object = Object.create(null);
  array.forEach(function(element) {
    object[element] = value;
  });
  return Object.freeze(object);
})([
  '?',
  '|',
  '/\\',
  '\\/',
  '=',
  '≠',
  '<',
  '≥',
  '>',
  '≤',
  '~',
  '≈',
  '+',
  '-',
  '>>',
  '<<',
  '*',
  '/',
  '[',
  '(',
]);

prefix('ƒ', function function_literal(the_function) {
  // If the 'ƒ' is followed by a suffix operator,
  // then produce the corresponding functino.

  const the_operator = token;
  if (
    functino[token.id] === true &&
    (the_operator.id !== '(' || next_token.id === ')')
  ) {
    advance();
    if (the_operator.id === '(') {
      same_line();
      advance(')');
    } else if (the_operator.id === '[') {
      same_line();
      advance(']');
    } else if (the_operator.id === '?') {
      same_line();
      advance('!');
    } else if (the_operator.id === '|') {
      same_line();
      advance('|');
    }
    the_function.zeroth = the_operator.id;
    return the_function;
  }

  // Set up the new function.

  if (loop.length > 0) {
    return error(the_function, 'Do not make functions in loops.');
  }
  the_function.scope = Object.create(null);
  the_function.parent = now_function;
  now_function = the_function;

  //. Function parameters come in 3 forms.
  //.      name
  //.      name | default |
  //.      name...

  // The parameter list can be open or closed.

  const parameters = [];
  if (token.alphameric === true) {
    let open = is_line_break();
    if (open) {
      indent();
    }
    while (true) {
      line_check(open);
      let the_parameter = token;
      register(the_parameter);
      advance();
      if (token.id === '...') {
        parameters.push(ellipsis(the_parameter));
        break;
      }
      if (token.id === '|') {
        advance('|');
        parameters.push(parse_suffix['|'](the_parameter, prev_token));
      } else {
        parameters.push(the_parameter);
      }
      if (open) {
        if (token.id === ',') {
          return error(token, "unexpected ','");
        }
        if (token.alphameric !== true) {
          break;
        }
      } else {
        if (token.id !== ',') {
          break;
        }
        same_line();
        advance(',');
        if (token.alphameric !== true) {
          return error(token, 'expected another parameter');
        }
      }
    }
    if (open) {
      outdent();
      at_indentation();
    } else {
      same_line();
    }
  }
  the_function.zeroth = parameters;

  // A function can have a '('return expression')' or a '{'function body'}'.

  // Parse the return expression.

  if (token.id === '(') {
    advance('(');
    if (is_line_break()) {
      indent();
      the_function.wunth = expression(0, true);
      outdent();
      at_indentation();
    } else {
      the_function.wunth = expression();
      same_line();
    }
    advance(')');
  } else {
    // Parse the function body. The body must contain an explicit 'return'.
    // There is no implicit return by falling thru the bottom.

    advance('{');
    indent();
    the_function.wunth = statements();
    if (the_function.wunth.return !== true) {
      return error(prev_token, "missing explicit 'return'");
    }

    // Parse the 'failure' handler.

    if (token.id === 'failure') {
      outdent();
      at_indentation();
      advance('failure');
      indent();
      the_function.twoth = statements();
      if (the_function.twoth.return !== true) {
        return error(prev_token, "missing explicit 'return'");
      }
    }
    outdent();
    at_indentation();
    advance('}');
  }
  now_function = the_function.parent;
  return the_function;
});

prefix('module', function module_literal(the_module) {
  if (now_function.id !== '' && now_function.id !== 'module') {
    return error(the_module, 'Do not make modules inside function.');
  }

  if (loop.length > 0) {
    return error(the_module, 'Do not make functions in loops.');
  }

  the_module.filename = the_filename;
  // Creating new scope.
  the_module.scope = Object.create(null);
  the_module.parent = now_function;
  // Changing scopes.
  now_function = the_module;

  advance('{');
  indent();
  the_module.zeroth = statements();
  outdent();
  at_indentation();
  advance('}');

  // Change scope back to parent
  now_function = the_module.parent;
  return the_module;
});

Object.freeze(parse_prefix);
Object.freeze(parse_suffix);

// The expression function (and its helper, argument_expression) is the heart of this parser.
// It uses a technique called Top Down Operator Precedence.
// An expression can be viewed as having two parts: A left part and an optional right part.
// The left part is a literal, variable, or prefix thing. The right part is a suffix operator
// that might be followed by another expression.
// If there is a suffix on the right and if it has greater precedence, then the left part is passed to the right part's parser,
// producing a new left part. The right part's parser will probably call 'expression' again itself,
// possibly with a different precedence.

function argument_expression(precedence = 0, open = false) {
  // It takes an optional 'open' parameter that allows tolerance of
  // certain line breaks. If 'open' is true, we expect the token to
  // be at the indentation point.
  const { token } = get_tokens();
  let definition;
  let left;
  let the_token = token;

  // Is the token a number literal or text literal?
  if (the_token.id === '(number)' || the_token.id === '(text)') {
    advance();
    left = the_token;

    // Is the token alphameric?
  } else if (the_token.alphameric === true) {
    definition = lookup(the_token.id);
    if (definition === undefined) {
      return error(the_token, 'expected a variable');
    }
    left = definition;
    advance();
  } else {
    // The token might be a prefix thing: '(', '[', '{', 'ƒ'.

    definition = parse_prefix[the_token.id];
    if (definition === undefined) {
      return error(the_token, 'expected a variable');
    }
    advance();
    left = definition.parser(the_token);
  }

  // We have the left part. Is there a suffix operator on the right?
  // Does precedence allow consuming that operator?
  // If so, combine the left and right to form a new left.

  while (true) {
    the_token = token;
    definition = parse_suffix[the_token.id];
    if (
      token.column_nr < indentation ||
      (!open && is_line_break()) ||
      definition === undefined ||
      definition.precedence <= precedence
    ) {
      break;
    }
    line_check(open && is_line_break());
    advance();
    the_token.class = 'suffix';
    left = definition.parser(left, the_token);
  }

  // After going zero or more times around the loop,
  // we can return the parse tree of the expression.

  return left;
}

function expression(precedence?: number, open = false) {
  // Expressions do a whitespace check that argument expressions do not need.

  line_check(open);
  return argument_expression(precedence, open);
}
