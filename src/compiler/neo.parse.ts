// neo.parse.js
// Douglas Crockford
// 2018-08-27

// Public Domain

/*jslint devel */

/*property
    alphameric, break, call, class, column_nr, column_to, concat, create, def,
    disrupt, fail, forEach, freeze, id, if, indexOf, length, let, line_nr, loop,
    origin, parent, parser, pop, precedence, push, readonly, return, scope,
    slice, startsWith, text, twoth, var, wunth, zeroth
*/
import generator, { Token } from './neo.tokenize';
let the_error;

function error(zeroth, wunth) {
    the_error = {
        id: '(error)',
        zeroth,
        wunth
    };
    throw 'fail';
}

// The primordial object contains the object that are buikt into the language.
// This includes constants like true and functions like neg.
const primordial = (function(ids) {
    const result = Object.create(null);
    ids.forEach(function(id) {
        result[id] = Object.freeze({
            id,
            alphameric: true,
            readonly: true // blocks the let statement
        });
    });
    return Object.freeze(result);
})([
    'abs',
    'array',
    'array?',
    'bit and',
    'bit mask',
    'bit or',
    'bit shift down',
    'bit shift up',
    'bit xor',
    'boolean?',
    'char',
    'code',
    'false',
    'fraction',
    'function?',
    'integer',
    'integer?',
    'length',
    'neg',
    'not',
    'number',
    'number?',
    'null',
    'record',
    'record?',
    'stone',
    'stone?',
    'text',
    'text?',
    'true'
]);
const special_def_keywords = Object.freeze(['module']);
// The generator function supplies a stream of token objects.
// Three tokens are visible as 'prev_token', 'token', and 'next_token'.
// The 'advance' function uses the generator to cycle thru all of
// the token objects, skipping over the comments.

let the_token_generator: ReturnType<typeof generator>;
let prev_token: Token;
let token: Token;
let next_token: Token;

let now_function; // The function currently being processed.
let loop; // An array of loop exit status.

const the_end = Object.freeze({
    id: '(end)',
    precedence: 0,
    column_nr: 0,
    column_to: 0,
    line_nr: 0
});

// The advance function advences to the next token. Its companion, the prelude function,
// tries to split the current token into two tokens.
function advance(id?: string) {
    // Advance to the next token using the token generator.
    // If an 'id' is supplied, make sure that the current token matches that 'id'.

    if (id !== undefined && id !== token.id) {
        return error(token, "expected '" + id + "'");
    }
    prev_token = token;
    token = next_token;
    next_token = the_token_generator() || the_end;
}

function prelude() {
    // If 'token' contains a space, split it, putting the first part in
    // 'prev_token'. Otherwise, advance.
    if (token.alphameric) {
        let space_at = token.id.indexOf(' ');
        if (space_at > 0) {
            prev_token = {
                id: token.id.slice(0, space_at),
                alphameric: true,
                line_nr: token.line_nr,
                column_nr: token.column_nr,
                column_to: token.column_nr + space_at
            };
            token.id = token.id.slice(space_at + 1);
            token.column_nr = token.column_nr + space_at + 1;
            return;
        }
    }
    return advance();
}

// Whitespace is significant in this language. A line break can signal the end of a statement or element.
// Indentation can signal the end of a clause. These functions help to manage that.

let indentation: number;

function indent() {
    indentation += 4;
}

function outdent() {
    indentation -= 4;
}

function at_indentation() {
    if (token.column_nr !== indentation) {
        return error(token, 'expected at ' + indentation);
    }
}

function is_line_break() {
    return token.line_nr !== prev_token.line_nr;
}

function same_line() {
    if (is_line_break()) {
        return error(token, 'unexpected linebreak');
    }
}

function line_check(open: boolean) {
    return open ? at_indentation() : same_line();
}

// The register function declares a new variable in a function's scope.
// The lookup function finds a veriable in the most relevant scope.

function register(the_token: Token, readonly = false) {
    // Add a variable to the current scope.

    if (now_function.scope[the_token.id] !== undefined) {
        error(the_token, 'already defined');
    }

    // The origin property capture the function that created the variable.
    // The scope property holds all of the variable created or used in a function.
    // The parent property points to the function that created this function.

    the_token.readonly = readonly;
    the_token.origin = now_function;
    now_function.scope[the_token.id] = the_token;
}

function lookup(id: string) {
    // Look for the definition in the current scope.

    let definition = now_function.scope[id];

    // If that fails, search the ancestor scopes.

    if (definition === undefined) {
        let parent = now_function.parent;
        while (parent !== undefined) {
            definition = parent.scope[id];
            if (definition !== undefined) {
                break;
            }
            parent = parent.parent;
        }

        // If that fails, search the primordials.

        if (definition === undefined) {
            definition = primordial[id];
        }

        // Remember that the current function used this definition.

        if (definition !== undefined) {
            now_function.scope[id] = definition;
        }
    }
    return definition;
}

// The 'parse_statement', 'parse_prefix', and 'parse_suffix' objects
// contain functions that do the specialized parsing. We are using
// 'Object.create(null)' to make them because we do not want any of
// the debris from 'Object.prototype' getting dredged up here.

const parse_statement = Object.create(null);
const parse_prefix = Object.create(null);
const parse_suffix = Object.create(null);

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

// The 'precedence' property determines how the suffix operator is parsed. The 'parse' property
// is a function for parsing a prefix or suffix. The 'class' property is "suffix", "statement", or undefined.

function parse_dot(left, the_dot: Token) {
    // The expression on the left must be a variable or an expression
    // that can return an object (excluding object literals).

    if (!left.alphameric && left.id !== '.' && (left.id !== '[' || left.wunth === undefined) && left.id !== '(') {
        return error(token, 'expected a variable');
    }
    let the_name = token;
    if (the_name.alphameric !== true) {
        return error(the_name, 'expected a field name');
    }
    the_dot.zeroth = left;
    the_dot.wunth = the_name;
    same_line();
    advance();
    return the_dot;
}

function parse_subscript(left, the_bracket: Token) {
    if (!left.alphameric && left.id !== '.' && (left.id !== '[' || left.wunth === undefined) && left.id !== '(') {
        return error(token, 'expected a variable');
    }
    the_bracket.zeroth = left;
    if (is_line_break()) {
        indent();
        the_bracket.wunth = expression(0, true);
        outdent();
        at_indentation();
    } else {
        the_bracket.wunth = expression();
        same_line();
    }
    advance(']');
    return the_bracket;
}

// The 'ellipsis is not packaged like the other suffix operators because it is allowed
// in only three places: Parameter lists, argument lists, and array literals. It is not allowed
// anywhere else, so we treat it as a special case.

function ellipsis(left) {
    if (token.id === '...') {
        const the_ellipsis = token;
        same_line();
        advance('...');
        the_ellipsis.zeroth = left;
        return the_ellipsis;
    }
    return left;
}

// The ()invocation parser parses function calls. It calls argument_expression for each argument.
// An open form invocation lists the argument vertically without commas.

function parse_invocation(left, the_paren: Token) {
    // function invocation:
    //      expression
    //      expression...

    const args = [];
    if (token.id === ')') {
        same_line();
    } else {
        const open = is_line_break();
        if (open) {
            indent();
        }
        while (true) {
            line_check(open);
            args.push(ellipsis(argument_expression()));
            if (token.id === ')' || token === the_end) {
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
    }
    advance(')');
    the_paren.zeroth = left;
    the_paren.wunth = args;
    return the_paren;
}

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
            wunth: value
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
})(['?', '|', '/\\', '\\/', '=', '≠', '<', '≥', '>', '≤', '~', '≈', '+', '-', '>>', '<<', '*', '/', '[', '(']);

prefix('ƒ', function function_literal(the_function) {
    // If the 'ƒ' is followed by a suffix operator,
    // then produce the corresponding functino.

    const the_operator = token;
    if (functino[token.id] === true && (the_operator.id !== '(' || next_token.id === ')')) {
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

// The statements function parses statements, returing an array of statement tokens.
// We uses the prelude function to split the verb from the token, if necessary.

function statements() {
    const statement_list = [];
    let the_statement;
    while (true) {
        if (
            token === the_end ||
            token.column_nr < indentation ||
            token.alphameric !== true ||
            token.id.startsWith('export')
        ) {
            break;
        }
        at_indentation();
        advance();
        let parser = parse_statement[prev_token.id];
        if (parser === undefined) {
            return error(prev_token, 'expected a statement');
        }
        prev_token.class = 'statement';
        the_statement = parser(prev_token);
        statement_list.push(the_statement);
        if (the_statement.disrupt === true) {
            if (token.column_nr === indentation) {
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

// The 'disrupt' property marks statements and statement lists that break or return.
// The 'return' property marks statements and statement lists that return.

// The break statment breaks out of a loop. The parser is passed the 'break' token.
// It sets the exit condition of the current loop.

parse_statement.break = function(the_break) {
    if (loop.length === 0) {
        return error(the_break, "'break' wants to be in a loop.");
    }
    loop[loop.length - 1] = 'break';
    the_break.disrupt = true;
    return the_break;
};

// The call statement calls a function and ignores the return value. This is to identify
// calls that are happening solely for their side effects.

parse_statement.call = function(the_call) {
    the_call.zeroth = expression();
    if (the_call.zeroth.id !== '(') {
        return error(the_call, 'expected a function invocation');
    }
    return the_call;
};

// We can defein few other things that are not functions
function special_def() {
  if (!token.alphameric) return false;

  let space_at = token.id.indexOf(' ');
  const token_id = space_at > 0 ? token.id.slice(0, space_at) : token.id;
  if (special_def_keywords.includes(token_id)) {
    if (space_at > 0) {
      prev_token = {
        id: token_id,
        alphameric: false,
        line_nr: token.line_nr,
        column_nr: token.column_nr,
        column_to: token.column_nr + space_at,
      };
      token.id = token.id.slice(space_at + 1);
      token.column_nr = token.column_nr + space_at + 1;
    } else {
      advance();
      prev_token.alphameric = false;
    }
    return true;
  }

  return false;
}

// The def statement registers read only variables.

parse_statement.def = function(the_def) {
  if (!token.alphameric) {
    return error(token, 'expected a name.');
  }
  same_line();
  the_def.zeroth = token;
  register(token, true);
  advance();
  same_line();
  advance(':');
  if (special_def()) {
    // The token is a special def like 'module'.
    const definition = parse_prefix[prev_token.id];
    the_def.wunth = definition.parser(prev_token);
  } else {
    the_def.wunth = expression();
  }
  return the_def;
};

// The fail statement is an exception machanisms.

parse_statement.fail = function(the_fail) {
    the_fail.disrupt = true;
    return the_fail;
};

// The if statement has an optional else clause or else if statement. if both branches distrupt or return,
// then the if statement itself distrupts or return.

parse_statement.if = function if_statement(the_if) {
    the_if.zeroth = expression();
    indent();
    the_if.wunth = statements();
    outdent();
    if (token.column_nr === indentation) {
        if (token.id === 'else') {
            advance('else');
            indent();
            the_if.twoth = statements();
            outdent();
            the_if.disrupt = the_if.wunth.disrupt && the_if.twoth.disrupt;
            the_if.return = the_if.wunth.return && the_if.twoth.return;
        } else if (token.id.startsWith('else if ')) {
            prelude();
            prelude();
            the_if.twoth = if_statement(prev_token);
            the_if.disrupt = the_if.wunth.disrupt && the_if.twoth.disrupt;
            the_if.return = the_if.wunth.return && the_if.twoth.return;
        }
    }
    return the_if;
};

// The let statement is assignment statement. The left side is not an ordinary expression.
// It is a more limited thing called 'lvalue'. An lvalue can be a variable (var not def), or an expression
// that finds a field or element.

parse_statement.let = function(the_let) {
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
    the_let.zeroth = left;
    the_let.wunth = expression();

    // A '[]' in this position indicates an array pop operation.

    if (
        token.id === '[]' &&
        left.id !== '[]' &&
        (the_let.wunth.alphameric === true ||
            the_let.wunth.id === '.' ||
            the_let.wunth.id === '[' ||
            the_let.wunth.id === '(')
    ) {
        token.zeroth = the_let.wunth;
        the_let.wunth = token;
        same_line();
        advance('[]');
    }
    return the_let;
};

// The loop statement keeps a stack for dealing with nested loops.
// The entries in the stack are the exit conditions of the loops. If there is no explicit exit,
// a stack's status is "infinite". If the only exit is a 'return' statement, its status is "return".
// If the loop exits with a 'break' statement, its status is "break". For this purpose, 'fail' is not an explicit exit condition.

parse_statement.loop = function(the_loop) {
    indent();
    loop.push('infinite');
    the_loop.zeroth = statements();
    const exit = loop.pop();
    if (exit === 'infinite') {
        return error(the_loop, "A loop wants a 'break'.");
    }
    if (exit === 'return') {
        the_loop.disrupt = true;
        the_loop.return = true;
    }
    outdent();
    return the_loop;
};

// The return statement changes the status of "infinite" loops to "return".

parse_statement.return = function(the_return) {
    try {
        if (now_function.parent === undefined) {
            return error(the_return, "'return' wants to be in a function.");
        }
        loop.forEach(function(element, element_nr) {
            if (element === 'infinite') {
                loop[element_nr] = 'return';
            }
        });
        if (is_line_break()) {
            return error(the_return, "'return' wants a return value.");
        }
        the_return.zeroth = expression();
        //@ts-ignore
        if (token === '}') {
            return error(the_return, "Misplaced 'return'.");
        }
        the_return.disrupt = true;
        the_return.return = true;
        return the_return;
    } catch (ignore) {
        return the_error;
    }
};

// The var statement declares a variable that can be assigned to with the let statement.
// If the variable is not explicitly initialized, its initial value is null.

parse_statement.var = function(the_var) {
    if (!token.alphameric) {
        return error(token, 'expected a name.');
    }
    same_line();
    the_var.zeroth = token;
    register(token);
    advance();
    if (token.id === ':') {
        same_line();
        advance(':');
        the_var.wunth = expression();
    }
    return the_var;
};

Object.freeze(parse_prefix);
Object.freeze(parse_suffix);
Object.freeze(parse_statement);

// The import and export statements are not included in the parse_statement because their
// placement in the source is restricted. All of the imports statements must be placed before
// any other statements. Only one export statement is allowed, and it is the last statement.

function parse_import(the_import) {
    same_line();
    register(token, true);
    the_import.zeroth = token;
    advance();
    same_line();
    advance(':');
    same_line();
    the_import.wunth = token;
    advance('(text)');
    the_import.class = 'statement';
    return the_import;
}

function parse_export(the_export) {
    the_export.zeroth = expression();
    the_export.class = 'statement';
    return the_export;
}

// We export a single parse function. It takes a token generator and return a tree.
// We do not need to make a constructor because pares does not retain any state between calls.

export default function parse(token_generator, filename) {
    try {
        indentation = 0;
        loop = [];
        the_token_generator = token_generator;
        next_token = the_end;
        const program = {
            filename,
            id: '',
            scope: Object.create(null)
        };
        now_function = program;
        advance();
        advance();
        let the_statements = [];
        // while (token.id.startsWith('import ')) {
        //     at_indentation();
        //     prelude();
        //     the_statements.push(parse_import(prev_token));
        // }
        the_statements = the_statements.concat(statements());
        // if (token.id.startsWith('export')) {
        //     at_indentation();
        //     prelude();
        //     the_statements.push(parse_export(prev_token));
        // }
        if (token !== the_end) {
            return error(token, 'unexpected');
        }
        //@ts-ignore
        program.zeroth = the_statements;
        return program;
    } catch (ignore) {
        return the_error;
    }
}
