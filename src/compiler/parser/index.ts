import { statements } from './statement';
import tokenize, { Token } from './tokenize';

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
  the_token_generator: ReturnType<typeof tokenize>;

  static the_end = Object.freeze({
    id: '(end)',
    precedence: 0,
    loc: {
      start: {
        line: 1,
        column: 0,
      },
      end: {
        line: 1,
        column: 0,
      },
    },
  });

  constructor(filename: string, token_generator: ReturnType<typeof tokenize>) {
    this.the_filename = filename;
    this.indentation = 0;
    this.the_error;
    this.now_module; // The module currently being processed. 
    this.now_function = {
      id: '',
      scope: Object.create(null),
      zeroth: null,
    }; // The function scope currently being processed. can be inside a function or module
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
    if (the_now_module !== undefined) {
      the_now_module.filename = this.the_filename
    }
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

  // The advance function advences to the next token. 
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

  indent() {
    this.indentation += 4;
  }

  outdent() {
    this.indentation -= 4;
  }

  at_indentation() {
    if (this.token.loc.start.column !== this.indentation) {
      return this.error(this.token, 'expected at ' + this.indentation);
    }
    return true;
  }

  is_line_break() {
    return this.token.loc.start.line !== this.prev_token.loc.start.line;
  }

  same_line() {
    if (this.is_line_break()) {
      return this.error(this.token, 'unexpected linebreak');
    }
  }

  line_check(open: boolean) {
    return open ? this.at_indentation() : this.same_line();
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
export default function parse(code: string, filename: string) {
  const the_parser = new Parser(filename, tokenize(code));
  try {
    the_parser.advance();
    the_parser.advance();
    let the_statements = [];
    the_statements = the_statements.concat(statements(the_parser));
    if (the_parser.token !== Parser.the_end) {
      return the_parser.error(the_parser.token, 'unexpected');
    }
    return the_statements;
  } catch (ignore) {
    return the_parser.the_error;
  }
}
