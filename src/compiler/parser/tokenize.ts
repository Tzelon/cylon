// neo.tokenize.js
// Douglas Crockford
// 2018-09-24

// Public Domain

/*property
    alphameric, column_nr, column_to, comment, exec, freeze, fromCodePoint, id,
    isArray, lastIndex, length, line_nr, make, normalize, number, parse,
    readonly, replace, slice, split, string, text
*/

import big_float from '../../runtime/numbers/big_float';

interface BaseToken {
    id: string;
    identifierName?: string,
    loc:  {
        start: {
            line: number,
            column: number
        },
        end: {
            line: number,
            column: number
        }
    }
    alphameric?: boolean;
    origin?: any;
    readonly?: boolean;
    class?: 'statement' | 'suffix' | undefined;
    zeroth?: any;
    wunth?: any;
}

interface ErrorToken extends BaseToken {
    id: '(error)';
    string: string;
}

interface CommentToken extends BaseToken {
    id: '(comment)';
    comment: string;
}

export interface NameToken extends BaseToken {
    alphameric: boolean;
    
}

interface NumberToken extends BaseToken {
    id: '(number)';
    readonly: boolean;
    number: number;
    text: string;
    
}

interface TextToken extends BaseToken {
    id: '(text)';
    readonly: boolean;
    text: string;
    
}

interface PunctuatorToken extends BaseToken {
    
}

export type Token = ErrorToken | CommentToken | NameToken | NumberToken | TextToken | PunctuatorToken;

const rx_unicode_escapement = /\\u\{([0-9A-F]{4,6})\}/g;

// 'rx_crfl' matches linefeed, carriage return, and carriage return linefeed.
// We are still messing with device codes for mid 20th Century electromechanical
// teletype machines.

const rx_crlf = /\n|\r\n?/;

// 'rx_token' matches a Neo token: comment, name, number, string, punctuator.

const rx_token = /(\u0020+)|(#.*)|([a-zA-Z](?:_[a-zA-Z]|[0-9a-zA-Z])*\!?\??)|(-?\d+(?:\.\d+)?(?:e\-?\d+)?)|("(?:[^"\\]|\\(?:[nr"\\]|u\{[0-9A-F]{4,6}\}))*")|(\.(?:\.\.)?|\/\\?|\\\/?|>>?|<<?|\[\]?|\{\}?|[()}\].,:?!;~≈=≠≤≥&|+\-*%ƒ$@\^_'`])/y;

//. Capture Group
//.     [1]  Whitespace
//.     [2]  Comment
//.     [3]  Alphameric
//.     [4]  Number
//.     [5]  String
//.     [6]  Punctuator

export default Object.freeze(function tokenize(source: string | string[], comment: boolean = false) {
    // 'tokenize' takes a source and produces from it an array of token objects.
    // If the 'source' is not an array, then it is split into lines at the carriage
    // return/linefeed. If 'comment' is true then comments are included as token
    // objects. The parser does not want to see comments, but a software tool might.

    const lines = Array.isArray(source) ? source : source.split(rx_crlf);
    let line_nr = 0;
    let line = lines[0];
    rx_token.lastIndex = 0;

    // The factory returns a generator that breaks the lines into token objects.
    // The token objects contain an id, coordinates, and other information.
    // Whitespace is not tokenized.
    return function token_generator(): Token {
        if (line === undefined) {
            return;
        }
        let column_nr = rx_token.lastIndex;
        // If we at the end of the line then drop to the next line
        if (column_nr >= line.length) {
            rx_token.lastIndex = 0;
            line_nr += 1;
            line = lines[line_nr];
            return line === undefined ? undefined : token_generator();
        }
        let captives = rx_token.exec(line);

        // Nothing matched.

        if (!captives) {
            return {
                id: '(error)',
                loc: {
                    start: {
                        line: line_nr,
                        column: column_nr
                    },
                    end: {
                        line: line_nr,
                        column: rx_token.lastIndex
                    }
                },
                string: line.slice(column_nr)
            };
        }

        // Whitespace matched.

        if (captives[1]) {
            return token_generator();
        }

        // A comment matched.

        if (captives[2]) {
            return comment
                ? {
                      id: '(comment)',
                      comment: captives[2],
                      loc: {
                        start: {
                            line: line_nr,
                            column: column_nr
                        },
                        end: {
                            line: line_nr,
                            column: rx_token.lastIndex
                        }
                      }
                  }
                : token_generator();
        }

        // A name matched.

        if (captives[3]) {
            return {
                id: captives[3],
                alphameric: true,
                loc: {
                    start: {
                        line: line_nr,
                        column: column_nr
                    },
                    end: {
                        line: line_nr,
                        column: rx_token.lastIndex
                    }
                },
            };
        }

        // A number literal matched.

        if (captives[4]) {
            return {
                id: '(number)',
                readonly: true,
                number: big_float.normalize(big_float.make(captives[4])),
                text: captives[4],
                loc: {
                    start: {
                        line: line_nr,
                        column: column_nr
                    },
                    end: {
                        line: line_nr,
                        column: rx_token.lastIndex
                    }
                },
            };
        }

        // A text literal matched.

        if (captives[5]) {
            // We use '.replace' to convert '\u{xxxxxx}' to a codepoint
            // and 'JSON.parse' to process the remaining escapes and remove the quotes.

            return {
                id: '(text)',
                readonly: true,
                text: JSON.parse(
                    captives[5].replace(rx_unicode_escapement, function(ignore, code) {
                        return String.fromCodePoint(parseInt(code, 16));
                    })
                ),
                loc: {
                    start: {
                        line: line_nr,
                        column: column_nr
                    },
                    end: {
                        line: line_nr,
                        column: rx_token.lastIndex
                    }
                },
            };
        }

        // A punctuator matched.

        if (captives[6]) {
            return {
                id: captives[6],
                loc: {
                    start: {
                        line: line_nr,
                        column: column_nr
                    },
                    end: {
                        line: line_nr,
                        column: rx_token.lastIndex
                    }
                },
            };
        }
    };
});
