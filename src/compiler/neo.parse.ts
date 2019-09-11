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
import { error } from './globals'

// The generator function supplies a stream of token objects.
// Three tokens are visible as 'prev_token', 'token', and 'next_token'.
// The 'advance' function uses the generator to cycle thru all of
// the token objects, skipping over the comments.

let the_token_generator: ReturnType<typeof generator>;
let prev_token: Token;
let token: Token;
let next_token: Token;

export function get_tokens() {
    return {token, prev_token, next_token};
}

export const the_end = Object.freeze({
    id: '(end)',
    precedence: 0,
    column_nr: 0,
    column_to: 0,
    line_nr: 1
});

// The advance function advences to the next token. Its companion, the prelude function,
// tries to split the current token into two tokens.
export function advance(id?: string) {
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

export function get_indentation() {
    return indentation;
}

export function indent() {
    indentation += 4;
}

export function outdent() {
    indentation -= 4;
}

export function at_indentation() {
    if (token.column_nr !== indentation) {
        return error(token, 'expected at ' + indentation);
    }
    return true;
}

export function is_line_break() {
    return token.line_nr !== prev_token.line_nr;
}

export function same_line() {
    if (is_line_break()) {
        return error(token, 'unexpected linebreak');
    }
}

function line_check(open: boolean) {
    return open ? at_indentation() : same_line();
}

/**
 * we need to know if its a module defenition or just a variable name
 * @returns if it is a module
 */
export function tag_module() {
    if (token.id === 'module' && next_token.id === '{') {
        token.alphameric = false;
        return true;
    }

    return false;
}

/**
 *
 * @param the_prev_token
 * @returns if the name contained dots
 */
export function advance_dots(the_token: Token) {
    if (next_token.id !== '.') return false;

    while (next_token.id === '.') {
        same_line();
        advance();
        // @ts-ignore
        the_token.column_to = next_token.column_to;
        the_token.id += '.' + next_token.id;
        advance();
    }
    token = the_token;
    return true;
}


// The 'precedence' property determines how the suffix operator is parsed. The 'parse' property
// is a function for parsing a prefix or suffix. The 'class' property is "suffix", "statement", or undefined.

export function parse_dot(left, the_dot: Token) {
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

export function parse_subscript(left, the_bracket: Token) {
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

export function parse_invocation(left, the_paren: Token) {
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

/**
 * We export a single parse function. It takes a token generator and return a tree.
 * We do not need to make a constructor because pares does not retain any state between calls.
 * @param token_generator
 * @param filename - the original file name
 */
export default function parse(token_generator: ReturnType<typeof generator>, filename: string) {
    try {
        the_filename = filename;
        indentation = 0;
        loop = [];
        the_token_generator = token_generator;
        next_token = the_end;
        const mod: Module = {
            filename,
            id: '',
            syntaxKind: SyntaxKind.Module,
            zeroth: null
        };
        now_function = mod;
        advance();
        advance();
        let the_statements = [];
        the_statements = the_statements.concat(statements());
        if (token !== the_end) {
            return error(token, 'unexpected');
        }
        mod.zeroth = the_statements;
        return mod;
    } catch (ignore) {
        return the_error;
    }
}
