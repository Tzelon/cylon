// neo.codegen.js
// Douglas Crockford
// 2018-10-22

/*property
    abs, alphameric, array, break, call, char, code, create, def, export, fail,
    false, forEach, fraction, id, if, import, integer, isArray, join, length,
    let, loop, map, neg, not, null, number, origin, push, record, repeat,
    replace, return, startsWith, stone, string, stringify, text, true, twoth,
    var, wunth, zeroth
*/

import big_float from '../runtime/numbers/big_float';
import $NEO from '../runtime/neo.runtime';
import { SourceNode } from 'source-map';

let now_module;
let modules = [];
let filename;

function source_node(line_nr: number, column_nr: number, chunks?: string | SourceNode | (string | SourceNode)[]) {
    return new SourceNode(line_nr + 1, column_nr, filename, chunks);
}

function is_last(array: any[], index) {
    return index + 1 === array.length;
}

function make_set(array, value = true) {
    const object = Object.create(null);
    array.forEach(function(element) {
        object[element] = value;
    });
    return $NEO.stone(object);
}

const boolean_operator = make_set([
    'array?',
    'boolean?',
    'function?',
    'integer?',
    'not',
    'number?',
    'record?',
    'stone?',
    'text?',
    'true',
    '=',
    '≠',
    '<',
    '>',
    '≤',
    '≥',
    '/\\',
    '\\/'
]);

const reserved = make_set([
    'arguments',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'eval',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'implements',
    'import',
    'in',
    'Infinity',
    'instanceof',
    'interface',
    'let',
    'NaN',
    'new',
    'null',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'undefined',
    'var',
    'void',
    'while',
    'with',
    'yield'
]);

const primordial = $NEO.stone({
    abs: '$NEO.abs',
    array: '$NEO.array',
    'array?': 'Array.isArray',
    'bit and': '$NEO.bitand',
    'bit mask': '$NEO.bitmask',
    'bit or': '$NEO.bitor',
    'bit shift down': '$NEO.bitdown',
    'bit shift up': '$NEO.bitup',
    'bit xor': '$NEO.bitxor',
    'boolean?': '$NEO.boolean_',
    char: '$NEO.char',
    code: '$NEO.code',
    false: 'false',
    fraction: '$NEO.fraction',
    'function?': '$NEO.function_',
    integer: '$NEO.integer',
    'integer?': '$NEO.integer_',
    length: '$NEO.length',
    neg: '$NEO.neg',
    not: '$NEO.not',
    null: 'undefined',
    number: '$NEO.make',
    'number?': '$NEO.is_big_float',
    record: '$NEO.record',
    'record?': '$NEO.record_',
    stone: '$NEO.stone',
    'stone?': 'Object.isFrozen',
    text: '$NEO.text',
    'text?': '$NEO.text_',
    true: 'true'
});

let indentation;

function indent() {
    indentation += 4;
}

function outdent() {
    indentation -= 4;
}

function begin() {
    // At the beginning of each line we emit a line break and padding.

    return '\n' + ' '.repeat(indentation);
}

function is_module(thing) {
    return thing.wunth.id === 'module' && !thing.wunth.alphameric;
}

let operator_transform;
let statement_transform;
let unique;

const rx_exclamation_question = /[\\!?]/g;

function mangle(name) {
    // JavaScript does not allow ! or '?' in identifiers, so we
    // replace them with '_'. We give reserved words a '$' prefix.

    //  So 'what_me_worry?' becomes 'what_me_worry_', and 'class' becomes '$class'.

    return reserved[name] === true ? '$' + name : name.replace(rx_exclamation_question, '_');
}

const rx_minus_point = /[\-.]/g;

function numgle(number) {
    // We make big decimal literals look as natural as possible by making them into
    // constants. A constant name start with '$'. A '-' or '.' is replaced with '_'.

    //  So, '1' becomes '$1', '98.6' becomes '$98_6', and '-1.011e-5' becomes
    //  '$_1_011e_5'.

    const text = big_float.string(number.number);
    const name = '$' + text.replace(rx_minus_point, '_');
    if (unique[name] !== true) {
        unique[name] = true;
        now_module.front_matter.push('const ' + name + ' = $NEO.number("' + text + '");\n');
    }
    return name;
}

function op(thing) {
    const transform = operator_transform[thing.id];
    return typeof transform === 'string'
        ? thing.zeroth === undefined
            ? transform
            : transform +
              '(' +
              expression(thing.zeroth) +
              (thing.wunth === undefined ? '' : ', ' + expression(thing.wunth)) +
              ')'
        : transform(thing);
}

function expression(thing) {
    if (thing.id === '(number)') {
        // return numgle(thing);
        return source_node(thing.line_nr, thing.column_nr, numgle(thing));
    }
    if (thing.id === '(text)') {
        // return JSON.stringify(thing.text);
        return source_node(thing.line_nr, thing.column_nr, JSON.stringify(thing.text));
    }
    if (thing.alphameric) {
        // return thing.origin === undefined ? primordial[thing.id] : mangle(thing.id);
        return source_node(
            thing.line_nr,
            thing.column_nr,
            thing.origin === undefined ? primordial[thing.id] : mangle(thing.id)
        );
    }
    return op(thing);
}

function create_module(the_module) {
    // We can have nested modules.
    // If we do have we put them in the children array

    // children - a list of children modules
    // parent - the parent module

    const module_source_map = source_node(the_module.line_nr, the_module.column_nr, statements(the_module.zeroth));

    var result = source_node(null, null, now_module.front_matter);
    result.add(module_source_map);

    modules.push(result);
}

function array_literal(array) {
    return source_node(array.line_nr, array.column_nr, [
        '[',
        array.zeroth.map(function(element, index) {
            const node = Array.isArray(element) ? array_literal(element) : expression(element);
            if (!is_last(index, array.zeroth)) {
                node.add(', ');
            }
            return node;
        }),
        ']'
    ]);

    // return (
    //     '[' +
    //     array
    //         .map(function(element) {
    //             return Array.isArray(element) ? array_literal(element) : expression(element);
    //         })
    //         .join(', ') +
    //     ']'
    // );
}

function record_literal(array) {
    indent();
    const padding = begin();
    const string =
        '(function (o) {' +
        array
            .map(function(element) {
                return (
                    padding +
                    (typeof element.zeroth === 'string'
                        ? 'o[' + JSON.stringify(element.zeroth) + '] = ' + expression(element.wunth) + ';'
                        : '$NEO.set(o, ' + expression(element.zeroth) + ', ' + expression(element.wunth) + ');')
                );
            })
            .join('') +
        padding +
        'return o;';
    outdent();
    return string + begin() + '}(Object.create(null)))';
}

function assert_boolean(thing) {
    const string = expression(thing);
    return boolean_operator[thing.id] === true ||
        (thing.zeroth !== undefined && thing.zeroth.origin === undefined && boolean_operator[thing.zeroth.id])
        ? string
        : '$NEO.assert_boolean(' + string + ')';
}

function module_statement(statement) {
    if (statement.id !== 'def' || !is_module(statement)) {
        throw 'codegen must get array of modules';
    }
    create_module(statement.wunth);
}

function statements(array) {
    const padding = begin();
    return array.map(function(statement, index) {
        let node = statement_transform[statement.id](statement);
        node.prepend(padding);
        return node;
        // return padding + statement_transform[statement.id](statement);
    });
    // .join('');
}

function block(array) {
    indent();
    const string = statements(array);
    outdent();
    return source_node(null, null, ['{', string, begin(), '}']);
    // return '{' + string + begin() + '}';
}

statement_transform = $NEO.stone({
    break: function(ignore) {
        return 'break;';
    },
    call: function(thing) {
        return expression(thing.zeroth) + ';';
    },
    def: function(thing) {
        if (is_module(thing)) {
            // Here we are sure we hit a nested module
            now_module.children.push(thing.zeroth.id);

            const new_module = {
                id: thing.zeroth.id,
                children: [],
                parent_path: now_module.id,
                parent: now_module,
                content: '',
                front_matter: ['import $NEO from "./neo.runtime.js"\n']
            };
            // chaning working module
            now_module = new_module;

            create_module(thing.wunth);

            // chaning back working module
            now_module = new_module.parent;
            return '';
        }
        return source_node(thing.line_nr, thing.column_nr, [
            'var ',
            expression(thing.zeroth),
            ' = ',
            expression(thing.wunth),
            ';'
        ]);
        // return 'var ' + expression(thing.zeroth) + ' = ' + expression(thing.wunth) + ';';
    },
    export: function(thing) {
        const exportation = expression(thing.zeroth);
        return (
            'export default ' +
            (exportation.startsWith('$NEO.stone(') ? exportation : '$NEO.stone(' + exportation + ')') +
            ';'
        );
    },
    fail: function() {
        return "throw $NEO.fail(\"fail\");";
    },
    if: function if_statement(thing) {
        return (
            'if (' +
            assert_boolean(thing.zeroth) +
            ') ' +
            block(thing.wunth) +
            (thing.twoth === undefined
                ? ''
                : ' else ' + (thing.twoth.id === 'if' ? if_statement(thing.twoth) : block(thing.twoth)))
        );
    },
    import: function(thing) {
        return 'import ' + expression(thing.zeroth) + ' from ' + expression(thing.wunth) + ';';
    },
    let: function(thing) {
        const right = thing.wunth.id === '[]' ? expression(thing.wunth.zeroth) + '.pop();' : expression(thing.wunth);
        if (thing.zeroth.id === '[]') {
            return expression(thing.zeroth.zeroth) + '.push(' + right + ');';
        }
        if (thing.zeroth.id === '.') {
            return (
                '$NEO.set(' +
                expression(thing.zeroth.zeroth) +
                ', ' +
                JSON.stringify(thing.zeroth.wunth.id) +
                ', ' +
                right +
                ');'
            );
        }
        if (thing.zeroth.id === '[') {
            return (
                '$NEO.set(' +
                expression(thing.zeroth.zeroth) +
                ', ' +
                expression(thing.zeroth.wunth) +
                ', ' +
                right +
                ');'
            );
        }
        return expression(thing.zeroth) + ' = ' + right + ';';
    },
    loop: function(thing) {
        return 'while (true) ' + block(thing.zeroth);
    },
    return: function(thing) {
        return source_node(thing.line_nr, thing.column_nr, ['return ', expression(thing.zeroth), ';']);
        // return 'return ' + expression(thing.zeroth) + ';';
    },
    var: function(thing) {
        return (
            'var ' +
            expression(thing.zeroth) +
            (thing.wunth === undefined ? ';' : ' = ' + expression(thing.wunth) + ';')
        );
    }
});

const functino = $NEO.stone({
    '?': '$NEO.ternary',
    '|': '$NEO.default',
    '/\\': '$NEO.and',
    '\\/': '$NEO.or',
    '=': '$NEO.eq',
    '≠': '$NEO.ne',
    '<': '$NEO.lt',
    '≥': '$NEO.ge',
    '>': '$NEO.gt',
    '≤': '$NEO.le',
    '~': '$NEO.cat',
    '≈': '$NEO.cats',
    '+': '$NEO.add',
    '-': '$NEO.sub',
    '>>': '$NEO.max',
    '<<': '$NEO.min',
    '*': '$NEO.mul',
    '/': '$NEO.div',
    '[': '$NEO.get',
    '(': '$NEO.resolve'
});

operator_transform = $NEO.stone({
    '?': function(thing) {
        indent();
        let padding = begin();
        let string =
            '(' +
            padding +
            assert_boolean(thing.zeroth) +
            padding +
            '? ' +
            expression(thing.wunth) +
            padding +
            ': ' +
            expression(thing.twoth);
        outdent();
        return string + begin() + ')';
    },
    '/\\': function(thing) {
        return '(' + assert_boolean(thing.zeroth) + ' && ' + assert_boolean(thing.wunth) + ')';
    },
    '\\/': function(thing) {
        return '(' + assert_boolean(thing.zeroth) + ' || ' + assert_boolean(thing.wunth) + ')';
    },
    '=': '$NEO.eq',
    '≠': '$NEO.ne',
    '<': '$NEO.lt',
    '≥': '$NEO.ge',
    '>': '$NEO.gt',
    '≤': '$NEO.le',
    '~': '$NEO.cat',
    '≈': '$NEO.cats',
    '+': '$NEO.add',
    '-': '$NEO.sub',
    '>>': '$NEO.max',
    '<<': '$NEO.min',
    '*': '$NEO.mul',
    '/': '$NEO.div',
    '|': function(thing) {
        return (
            '(function (_0) {' +
            'return (_0 === undefined) ? ' +
            expression(thing.wunth) +
            ' : _0);}(' +
            expression(thing.zeroth) +
            '))'
        );
    },
    '...': function(thing) {
        return '...' + expression(thing.zeroth);
    },
    '.': function(thing) {
        return '$NEO.get(' + expression(thing.zeroth) + ', "' + thing.wunth.id + '")';
    },
    '[': function(thing) {
        if (thing.wunth === undefined) {
            // return array_literal(thing.zeroth);
            return array_literal(thing);
        }
        return '$NEO.get(' + expression(thing.zeroth) + ', ' + expression(thing.wunth) + ')';
    },
    '{': function(thing) {
        return record_literal(thing.zeroth);
    },
    '(': function(thing) {
        return expression(thing.zeroth) + '(' + thing.wunth.map(expression).join(', ') + ')';
    },
    '[]': '[]',
    '{}': 'Object.create(null)',
    ƒ: function(thing) {
        if (typeof thing.zeroth === 'string') {
            return functino[thing.zeroth];
        }

        const node = source_node(thing.line_nr, thing.column_nr, [
            '$NEO.stone(function (',
            thing.zeroth.map(function(param, index) {
                let node;
                if (param.id === '...') {
                    node = source_node(param.line_nr, param.column_nr, '...' + mangle(param.zeroth.id));
                }
                if (param.id === '|') {
                    node = source_node(param.line_nr, param.column_nr, [
                        mangle(param.zeroth.id),
                        ' = ',
                        expression(param.wunth)
                    ]);
                }
                node = source_node(param.line_nr, param.column_nr, mangle(param.id));
                if (!is_last(index, thing.zeroth)) {
                    node.add(', ');
                }
                return node;
            }),
            ') ',
            Array.isArray(thing.wunth)
                ? block(thing.wunth)
                : source_node(thing.line_nr, thing.column_nr, ['{return ', expression(thing.wunth), ';}']),
            ')'
        ]);

        return node;

        // return (
        //     '$NEO.stone(function (' +
        //     thing.zeroth
        //         .map(function(param) {
        //             if (param.id === '...') {
        //                 return '...' + mangle(param.zeroth.id);
        //             }
        //             if (param.id === '|') {
        //                 return mangle(param.zeroth.id) + ' = ' + expression(param.wunth);
        //             }
        //             return mangle(param.id);
        //         })
        //         .join(', ') +
        //     ') ' +
        //     (Array.isArray(thing.wunth) ? block(thing.wunth) : '{return ' + expression(thing.wunth) + ';}') +
        //     ')'
        // );
    }
});

const codegen = $NEO.stone(function codegen(the_module) {
    filename = the_module.wunth.filename;
    indentation = 0;
    unique = Object.create(null);
    now_module = {
        id: the_module.zeroth.id,
        children: [],
        parent_path: '',
        parent: null,
        content: '',
        front_matter: ['import $NEO from "./neo.runtime.js"\n']
    };
    module_statement(the_module);
    return modules;
});

export default codegen;
