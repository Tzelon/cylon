import generator, { Token } from './neo.tokenize';
import { statements } from './parser/statement';
import primordial from './parser/primordial';

type LoopStatus = 'break' | 'return' | 'infinite';

export class Parser {
  readonly the_filename: string;
  indentation: number;
  loop = [];
  now_function;
  now_module;
  the_error;
  prev_token: Token;
  next_token: Token;
  token: Token;
  the_token_generator: ReturnType<typeof generator>;

  static the_end = Object.freeze({
    id: '(end)',
    precedence: 0,
    column_nr: 0,
    column_to: 0,
    line_nr: 1,
  });

  constructor(filename: string, token_generator: ReturnType<typeof generator>) {
    this.the_filename = filename;
    this.indentation = 0;
    this.the_error;
    this.now_module; // The scope currently being processed. can be inside a function or module
    this.now_function= {
        id: '',
        scope: Object.create(null),
        zeroth: null
    }; // The scope currently being processed. can be inside a function or module
    this.loop = []; // An array of loop exit status.

    // The generator function supplies a stream of token objects.
    // Three tokens are visible as 'prev_token', 'token', and 'next_token'.
    // The 'advance' function uses the generator to cycle thru all of
    // the token objects, skipping over the comments.

    this.the_token_generator = token_generator;
    this.prev_token;
    this.token;
    this.next_token = Parser.the_end;
  }

  // Whitespace is significant in this language. A line break can signal the end of a statement or element.
  // Indentation can signal the end of a clause. These functions help to manage that.

  set_now_function(the_now_function) {
    this.now_function = the_now_function;
  }

  get_now_function() {
    return this.now_function;
  }

  is_in_function() {
    return this.now_function !== undefined;
  }

  is_in_module() {
    return this.now_module !== undefined;
  }

  set_now_module(the_now_module) {
    this.now_module = the_now_module;
  }

  get_now_module() {
    return this.now_module;
  }

  is_in_loop() {
    return this.loop.length > 0;
  }

  set_top_loop_status(status: LoopStatus) {
    this.loop[this.loop.length - 1] = status;
  }

  set_infinite_loops_to_return() {
    this.loop.forEach(function(element, element_nr) {
      if (element === 'infinite') {
        this.loop[element_nr] = 'return';
      }
    });
  }

  error(zeroth, wunth): never {
    this.the_error = {
      id: '(error)',
      zeroth,
      wunth,
    };
    throw 'fail';
  }

  // The register function declares a new variable in a function's scope.
  // The lookup function finds a veriable in the most relevant scope.
  register(the_token: Token, readonly = false) {
    // Add a variable to the current scope.

    // if (!this.is_in_function()) {
    //   this.error(the_token, 'must be inside a function');
    // }

    if (this.now_function.scope[the_token.id] !== undefined) {
      this.error(the_token, 'already defined');
    }

    // The origin property capture the function that created the variable.
    // The scope property holds all of the variable created or used in a function.
    // The parent property points to the function that created this function.

    the_token.readonly = readonly;
    the_token.origin = this.now_function;
    this.now_function.scope[the_token.id] = the_token;
  }

  lookup(id: string) {
    // Look for the definition in the current scope.

    let definition = this.now_function.scope[id];

    // If that fails, search the ancestor scopes.

    if (definition === undefined) {
      let parent = this.now_function.parent;
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
        this.now_function.scope[id] = definition;
      }
    }
    return definition;
  }

  // The advance function advences to the next token. Its companion, the prelude function,
  // tries to split the current token into two tokens.
  advance(id?: string) {
    // Advance to the next token using the token generator.
    // If an 'id' is supplied, make sure that the current token matches that 'id'.

    if (id !== undefined && id !== this.token.id) {
      return this.error(this.token, "expected '" + id + "'");
    }
    this.prev_token = this.token;
    this.token = this.next_token;
    this.next_token = this.the_token_generator() || Parser.the_end;
  }

  // prelude() {
  //     // If 'token' contains a space, split it, putting the first part in
  //     // 'prev_token'. Otherwise, advance.
  //     if (token.alphameric) {
  //       let space_at = token.id.indexOf(' ');
  //       if (space_at > 0) {
  //         prev_token = {
  //           id: token.id.slice(0, space_at),
  //           alphameric: true,
  //           line_nr: token.line_nr,
  //           column_nr: token.column_nr,
  //           column_to: token.column_nr + space_at,
  //         };
  //         token.id = token.id.slice(space_at + 1);
  //         token.column_nr = token.column_nr + space_at + 1;
  //         return;
  //       }
  //     }
  //     return advance();
  //   }

  indent() {
    this.indentation += 4;
  }

  outdent() {
    this.indentation -= 4;
  }

  at_indentation() {
    if (this.token.column_nr !== this.indentation) {
      return this.error(this.token, 'expected at ' + this.indentation);
    }
    return true;
  }

  is_line_break() {
    return this.token.line_nr !== this.prev_token.line_nr;
  }

  same_line() {
    if (this.is_line_break()) {
      return this.error(this.token, 'unexpected linebreak');
    }
  }

  line_check(open: boolean) {
    return open ? this.at_indentation() : this.same_line();
  }

  /**
   * we need to know if its a module defenition or just a variable name
   * @returns if it is a module
   */
  tag_module() {
    if (this.token.id === 'module' && this.next_token.id === '{') {
      this.token.alphameric = false;
      return true;
    }

    return false;
  }

  /**
   *
   * @param the_prev_token
   * @returns if the name contained dots
   */
  advance_dots(the_token: Token) {
    if (this.next_token.id !== '.') return false;

    while (this.next_token.id === '.') {
      this.same_line();
      this.advance();
      // @ts-ignore
      the_token.column_to = next_token.column_to;
      the_token.id += '.' + this.next_token.id;
      this.advance();
    }
    this.token = the_token;
    return true;
  }

  // The 'precedence' property determines how the suffix operator is parsed. The 'parse' property
  // is a function for parsing a prefix or suffix. The 'class' property is "suffix", "statement", or undefined.
}

/**
 * We export a single parse function. It takes a token generator and return a tree.
 * We do not need to make a constructor because pares does not retain any state between calls.
 * @param token_generator
 * @param filename - the original file name
 */
export default function parse(
  token_generator: ReturnType<typeof generator>,
  filename: string
) {
  const the_parser = new Parser(filename, token_generator);
  try {
    const mod = {
      filename,
      id: '',
      syntaxKind: 'ModuleStatement',
      zeroth: null,
    };
    the_parser.set_now_module(mod);
    the_parser.advance();
    the_parser.advance();
    let the_statements = [];
    the_statements = the_statements.concat(statements(the_parser));
    if (the_parser.token !== Parser.the_end) {
      return the_parser.error(the_parser.token, 'unexpected');
    }
    mod.zeroth = the_statements;
    return mod;
  } catch (ignore) {
    return the_parser.the_error;
  }
}
