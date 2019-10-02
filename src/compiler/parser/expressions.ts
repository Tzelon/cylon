import {
  ArrayLiteralExpression,
  RecordLiteralExpression,
  FunctionLiteralExpression,
  BinaryExpression,
  NumberLiteral,
  TextLiteral,
  Identifier,
  RecordProperty,
} from '../NodesTypes';
import { Parser } from '../parser';
import { statements } from './statement';
import { Token } from '../neo.tokenize';

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
  optional_parser = function infix(parser, left, the_token) {
    const binaryExpression = the_token as BinaryExpression;
    binaryExpression.syntaxKind = 'BinaryExpression';
    binaryExpression.zeroth = left;
    binaryExpression.wunth = expression(parser, precedence);
    return binaryExpression;
  }
) {
  // Make an infix or suffix operator.

  const the_symbol = Object.create(null);
  the_symbol.id = id;
  the_symbol.precedence = precedence;
  the_symbol.parser = optional_parser;
  parse_suffix[id] = Object.freeze(the_symbol);
}

suffix('|', 111, function parse_default(parser, left, the_bar) {
  the_bar.zeroth = left;
  the_bar.wunth = expression(parser, 112);
  parser.advance('|');
  return the_bar;
});
suffix('?', 111, function then_else(parser, left, the_then) {
  the_then.zeroth = left;
  the_then.wunth = expression(parser);
  parser.advance('!');
  the_then.twoth = expression(parser);
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
  rel_op[operator] = true;
  return suffix(operator, 333, function(parser, left, the_token) {
    const binaryExpression = the_token as BinaryExpression;
    binaryExpression.syntaxKind = 'BinaryExpression';
    binaryExpression.zeroth = left;
    binaryExpression.wunth = expression(parser, 333);
    if (rel_op[parser.token.id] === true) {
      return parser.error(parser.token, 'unexpected relational operator');
    }
    return binaryExpression;
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

prefix('(', function(parser, ignore) {
  let result;
  if (parser.is_line_break()) {
    parser.indent();
    result = expression(parser, 0, true);
    parser.outdent();
    parser.at_indentation();
  } else {
    result = expression(parser, 0);
    parser.same_line();
  }
  parser.advance(')');
  return result;
});

prefix('[', function arrayliteral(parser, the_bracket) {
  const arrayLiteralExpression = the_bracket as ArrayLiteralExpression;
  arrayLiteralExpression.syntaxKind = 'ArrayLiteralExpression';

  let matrix = [];
  let array = [];
  if (!parser.is_line_break()) {
    while (true) {
      array.push(ellipsis(parser, expression(parser)));
      if (parser.token.id === ',') {
        parser.same_line();
        parser.advance(',');
      } else if (
        parser.token.id === ';' &&
        array.length > 0 &&
        parser.next_token.id !== ']'
      ) {
        parser.same_line();
        parser.advance(';');
        matrix.push(array);
        array = [];
      } else {
        break;
      }
    }
    parser.same_line();
  } else {
    parser.indent();
    while (true) {
      array.push(
        ellipsis(parser, expression(parser, 0, parser.is_line_break()))
      );
      if (parser.token.id === ']' || parser.token === parser.the_end) {
        break;
      }
      if (parser.token.id === ';') {
        if (array.length === 0 || parser.next_token.id === ']') {
          break;
        }
        parser.same_line();
        parser.advance(';');
        matrix.push(array);
        array = [];
      } else if (parser.token.id === ',' || !parser.is_line_break()) {
        parser.same_line();
        parser.advance(',');
      }
    }
    parser.outdent();
    if (parser.token.column_nr !== parser.indentation) {
      return parser.error(parser.token, 'expected at ' + parser.indentation);
    }
  }
  parser.advance(']');
  if (matrix.length > 0) {
    matrix.push(array);
    arrayLiteralExpression.zeroth = matrix;
  } else {
    arrayLiteralExpression.zeroth = array;
  }
  return arrayLiteralExpression;
});

prefix('[]', function emptyarrayliteral(_parser, the_brackets) {
  const arrayLiteralExpression = the_brackets as ArrayLiteralExpression;
  arrayLiteralExpression.syntaxKind = 'ArrayLiteralExpression';

  return arrayLiteralExpression;
});

// The record literal parser recognizes 4 forms of fields.
//  * variable
//  * name: expression
//  * "string": expression
//  * [expression]: expression

prefix('{', function recordliteral(parser, the_brace) {
  const recordLiteralExpression = the_brace as RecordLiteralExpression;
  recordLiteralExpression.syntaxKind = 'RecordLiteralExpression';

  const properties = [];
  let key;
  let value;
  const open =
    recordLiteralExpression.loc.start.line !== parser.token.loc.start.line;
  if (open) {
    parser.indent();
  }
  while (true) {
    parser.line_check(open);
    if (parser.token.id === '[') {
      parser.advance('[');
      key = expression(parser);
      parser.advance(']');
      parser.same_line();
      parser.advance(':');
      value = expression(parser);
    } else {
      key = parser.token;
      parser.advance();
      if (key.alphameric === true) {
        if (parser.token.id === ':') {
          parser.same_line();
          parser.advance(':');
          value = expression(parser);
        } else {
          value = parser.lookup(key.id);
          if (value === undefined) {
            return parser.error(key, 'expected a variable');
          }
        }
      } else if (key.id === '(text)') {
        parser.same_line();
        parser.advance(':');
        value = expression(parser);
      } else {
        return parser.error(key, 'expected a key');
      }
    }
    properties.push({
      zeroth: key,
      wunth: value,
      syntaxKind: 'RecordProperty',
    } as RecordProperty);

    if (
      parser.token.column_nr < parser.indentation ||
      parser.token.id === '}'
    ) {
      break;
    }
    if (!open) {
      parser.same_line();
      parser.advance(',');
    }
  }
  if (open) {
    parser.outdent();
    parser.at_indentation();
  } else {
    parser.same_line();
  }
  parser.advance('}');
  recordLiteralExpression.zeroth = properties;
  return recordLiteralExpression;
});

prefix('{}', function emptyrecordliteral(_parser, the_braces) {
  const recordLiteralExpression = the_braces as RecordLiteralExpression;
  recordLiteralExpression.syntaxKind = 'RecordLiteralExpression';

  return recordLiteralExpression;
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

prefix('ƒ', function function_literal(parser: Parser, the_function) {
  const functionLiteralExpression = the_function as FunctionLiteralExpression;
  functionLiteralExpression.syntaxKind = 'FunctionLiteralExpression';

  // If the 'ƒ' is followed by a suffix operator,
  // then produce the corresponding functino.
  const the_operator = parser.token;
  if (
    functino[parser.token.id] === true &&
    (the_operator.id !== '(' || parser.next_token.id === ')')
  ) {
    parser.advance();
    if (the_operator.id === '(') {
      parser.same_line();
      parser.advance(')');
    } else if (the_operator.id === '[') {
      parser.same_line();
      parser.advance(']');
    } else if (the_operator.id === '?') {
      parser.same_line();
      parser.advance('!');
    } else if (the_operator.id === '|') {
      parser.same_line();
      parser.advance('|');
    }
    functionLiteralExpression.zeroth = the_operator.id;
    return functionLiteralExpression;
  }

  // Set up the new function.

  if (parser.is_in_loop()) {
    return parser.error(
      functionLiteralExpression,
      'Do not make functions in loops.'
    );
  }

  functionLiteralExpression.scope = Object.create(null);
  functionLiteralExpression.parent = parser.get_now_function();
  parser.set_now_function(functionLiteralExpression);

  //. Function parameters come in 3 forms.
  //.      name
  //.      name | default |
  //.      name...

  // The parameter list can be open or closed.

  const parameters = [];
  if (parser.token.alphameric === true) {
    let open = parser.is_line_break();
    if (open) {
      parser.indent();
    }
    while (true) {
      parser.line_check(open);
      let the_parameter = parser.token;
      parser.advance();
      if (parser.token.id === '...') {
        parameters.push(ellipsis(parser, the_parameter));
        break;
      }
      if (parser.token.id === '|') {
        parser.advance('|');
        parameters.push(parse_suffix['|'](the_parameter, parser.prev_token));
      } else {
        parameters.push(the_parameter);
      }
      if (open) {
        if (parser.token.id === ',') {
          return parser.error(parser.token, "unexpected ','");
        }
        if (parser.token.alphameric !== true) {
          break;
        }
      } else {
        if (parser.token.id !== ',') {
          break;
        }
        parser.same_line();
        parser.advance(',');
        if (parser.token.alphameric !== true) {
          return parser.error(parser.token, 'expected another parameter');
        }
      }
    }
    if (open) {
      parser.outdent();
      parser.at_indentation();
    } else {
      parser.same_line();
    }
  }
  functionLiteralExpression.zeroth = parameters;

  // A function can have a '('return expression')' or a '{'function body'}'.

  // Parse the return expression.

  if (parser.token.id === '(') {
    parser.advance('(');
    if (parser.is_line_break()) {
      parser.indent();
      functionLiteralExpression.wunth = expression(parser, 0, true);
      parser.outdent();
      parser.at_indentation();
    } else {
      functionLiteralExpression.wunth = expression(parser);
      parser.same_line();
    }
    parser.advance(')');
  } else {
    // Parse the function body. The body must contain an explicit 'return'.
    // There is no implicit return by falling thru the bottom.

    parser.advance('{');
    parser.indent();
    functionLiteralExpression.wunth = statements(parser);
    if (functionLiteralExpression.wunth.return !== true) {
      return parser.error(parser.prev_token, "missing explicit 'return'");
    }

    // Parse the 'failure' handler.

    if (parser.token.id === 'failure') {
      parser.outdent();
      parser.at_indentation();
      parser.advance('failure');
      parser.indent();
      functionLiteralExpression.twoth = statements(parser);
      if (functionLiteralExpression.twoth.return !== true) {
        return parser.error(parser.prev_token, "missing explicit 'return'");
      }
    }
    parser.outdent();
    parser.at_indentation();
    parser.advance('}');
  }
  parser.set_now_function(functionLiteralExpression.parent);
  return functionLiteralExpression;
});

export function parse_dot(parser: Parser, left, the_dot) {
  // The expression on the left must be a variable or an expression
  // that can return an object (excluding object literals).
  if (
    !left.alphameric &&
    left.id !== '.' &&
    (left.id !== '[' || left.wunth === undefined) &&
    left.id !== '('
  ) {
    return parser.error(parser.token, 'expected a variable');
  }
  let the_name = parser.token;
  if (the_name.alphameric !== true) {
    return parser.error(the_name, 'expected a field name');
  }
  the_dot.zeroth = left;
  the_dot.wunth = the_name;
  parser.same_line();
  parser.advance();
  return the_dot;
}

export function parse_module_identifier(parser: Parser, the_token) {
  if (parser.next_token.id !== '.') {
    if (parser.is_in_module()) {
      the_token.id = parser.get_now_module().zeroth.id + '.' + the_token.id;
    }
    return parse_identifier(parser, the_token);
  }

  const identifier = the_token as Identifier;
  identifier.syntaxKind = 'Identifier';
  identifier.parents = [];

  while (parser.next_token.id === '.') {
    parser.same_line();
    identifier.parents.push(parser.token.id);
    parser.advance();
    identifier.loc.start.column = parser.next_token.loc.start.column;
    identifier.id += '.' + parser.next_token.id;
    parser.advance();
  }
  identifier.loc.identifierName = identifier.id;

  return identifier;
}

export function parse_subscript(parser, left, the_bracket) {
  if (
    !left.alphameric &&
    left.id !== '.' &&
    (left.id !== '[' || left.wunth === undefined) &&
    left.id !== '('
  ) {
    return parser.error(parser.token, 'expected a variable');
  }
  the_bracket.zeroth = left;
  if (parser.is_line_break()) {
    parser.indent();
    the_bracket.wunth = expression(parser, 0, true);
    parser.outdent();
    parser.at_indentation();
  } else {
    the_bracket.wunth = parser.expression();
    parser.same_line();
  }
  parser.advance(']');
  return the_bracket;
}

// The 'ellipsis is not packaged like the other suffix operators because it is allowed
// in only three places: Parameter lists, argument lists, and array literals. It is not allowed
// anywhere else, so we treat it as a special case.

export function ellipsis(parser, left) {
  if (parser.token.id === '...') {
    const the_ellipsis = parser.token;
    parser.same_line();
    parser.advance('...');
    the_ellipsis.zeroth = left;
    return the_ellipsis;
  }
  return left;
}

// The ()invocation parser parses function calls. It calls argument_expression for each argument.
// An open form invocation lists the argument vertically without commas.

export function parse_invocation(parser: Parser, left, the_paren) {
  // function invocation:
  //      expression
  //      expression...

  const args = [];
  if (parser.token.id === ')') {
    parser.same_line();
  } else {
    const open = parser.is_line_break();
    if (open) {
      parser.indent();
    }
    while (true) {
      parser.line_check(open);
      args.push(ellipsis(parser, argument_expression(parser)));
      if (parser.token.id === ')' || parser.token === Parser.the_end) {
        break;
      }
      if (!open) {
        parser.same_line();
        parser.advance(',');
      }
    }
    if (open) {
      parser.outdent();
      parser.at_indentation();
    } else {
      parser.same_line();
    }
  }
  parser.advance(')');
  the_paren.zeroth = left;
  the_paren.wunth = args;
  return the_paren;
}

export function parse_literals(parser: Parser, the_token: Token) {
  let literalExpression;
  if (the_token.id === '(number)') {
    literalExpression = the_token as NumberLiteral;
    literalExpression.syntaxKind = 'NumberLiteral';
    parser.now_module.front_matter.set(
      literalExpression.text,
      literalExpression.number
    );
  } else if (the_token.id === '(text)') {
    literalExpression = the_token as TextLiteral;
    literalExpression.syntaxKind = 'TextLiteral';
  }

  return literalExpression;
}

export function parse_identifier(_parser: Parser, the_token: Token) {
  const identifier = the_token as Identifier;
  identifier.syntaxKind = 'Identifier';
  identifier.loc.identifierName = identifier.id;
  return identifier;
}

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

export function argument_expression(
  parser: Parser,
  precedence = 0,
  open = false
) {
  // It takes an optional 'open' parameter that allows tolerance of
  // certain line breaks. If 'open' is true, we expect the token to
  // be at the indentation point.
  let definition;
  let left;
  let the_token = parser.token;

  // Is the token a number literal or text literal?
  if (the_token.id === '(number)' || the_token.id === '(text)') {
    parser.advance();
    left = parse_literals(parser, the_token);

    // Is the token alphameric?
  } else if (the_token.alphameric === true) {
    left = parse_identifier(parser, the_token);
    parser.advance();
  } else {
    // The token might be a prefix thing: '(', '[', '{', 'ƒ'.

    definition = parse_prefix[the_token.id];
    if (definition === undefined) {
      return parser.error(the_token, 'expected a variable');
    }
    parser.advance();
    left = definition.parser(parser, the_token);
  }

  // We have the left part. Is there a suffix operator on the right?
  // Does precedence allow consuming that operator?
  // If so, combine the left and right to form a new left.

  while (true) {
    the_token = parser.token;
    definition = parse_suffix[the_token.id];
    if (
      parser.token.loc.start.column < parser.indentation ||
      (!open && parser.is_line_break()) ||
      definition === undefined ||
      definition.precedence <= precedence
    ) {
      break;
    }
    parser.line_check(open && parser.is_line_break());
    parser.advance();
    the_token.class = 'suffix';
    left = definition.parser(parser, left, the_token);
  }

  // After going zero or more times around the loop,
  // we can return the parse tree of the expression.

  return left;
}

export function expression(parser: Parser, precedence?: number, open = false) {
  // Expressions do a whitespace check that argument expressions do not need.

  parser.line_check(open);
  return argument_expression(parser, precedence, open);
}
