import { walk } from '../../utils/ast-visitor';
import create_scope from '../scope.tree';
import { SourceNode } from 'source-map';
import $NEO from '../runtime/neo.runtime';

let filename = 'Dummy.cy';

function source_node(
  line_nr: number,
  column_nr: number,
  chunks?: string | SourceNode | (string | SourceNode)[]
) {
  return new SourceNode(line_nr + 1, column_nr, filename, chunks);
}

const rx_exclamation_question = /[\\!?]/g;
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
  '\\/',
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
  'yield',
]);

function mangle(name) {
  // JavaScript does not allow ! or '?' in identifiers, so we
  // replace them with '_'. We give reserved words a '$' prefix.

  //  So 'what_me_worry?' becomes 'what_me_worry_', and 'class' becomes '$class'.

  return reserved[name] === true
    ? '$' + name
    : name.replace(rx_exclamation_question, '_');
}

function is_last(array: any[], index) {
  return index + 1 === array.length;
}

export default function codegen(tree) {
  let now_scope: ReturnType<typeof create_scope> = create_scope({
    name: 'program',
    type: 'module',
    parent_scope: null,
  });

  let code = source_node(null, null, ['import $NEO from "./neo.runtime.js"\n']);

  walk(tree, {
    FunctionLiteralExpression: {
      enter(node, parent) {
        this.skip(); //because we want to control the flow we skip children nodes
        now_scope.register(parent.zeroth);
        parent.zeroth.parent = now_scope;
        now_scope = create_scope({
          name: parent.zeroth.id,
          parent_scope: now_scope,
          type: 'function',
        });

        node.zeroth.forEach(param => {
          now_scope.register(param);
        });

        const str = source_node(node.line_nr, node.column_nr, [
          '$NEO.stone(function (',
          node.zeroth.map(function(param, index) {
            let param_str;
            if (param.id === '...') {
              param_str = source_node(
                param.line_nr,
                param.column_nr,
                '...' + mangle(param.zeroth.id)
              );
            }
            if (param.id === '|') {
              param_str = source_node(param.line_nr, param.column_nr, [
                mangle(param.zeroth.id),
                ' = ',
                this.visit(param.wunth).content,
              ]);
            }
            param_str = source_node(
              param.line_nr,
              param.column_nr,
              mangle(param.id)
            );
            if (!is_last(index, node.zeroth)) {
              param_str.add(', ');
            }
            return param_str;
          }),
          ') ',
          Array.isArray(node.wunth)
            ? source_node(null, null, [
                '{',
                this.visit(node.wunth).content,
                '}',
              ])
            : source_node(node.line_nr, node.column_nr, [
                '{return ',
                this.visit(node.wunth).content,
                ';}',
              ]),
          ')',
        ]);

        // this.visit(node.wunth); // and call recursively to them

        now_scope = parent.zeroth.parent;
      },
    },
    VarStatement: {
      enter(node) {
        this.skip();
        now_scope.register(node.zeroth);
        this.code(
          source_node(node.line_nr, node.column_nr, [
            'var ',
            this.visit(node.zeroth, null).content,
            node.wunth === undefined
              ? ';'
              : ' = ' + this.visit(node.wunth, null).content + ';',
          ]),
          co => code.add(co)
        );

        console.log('---')
      },
    },
    BinaryExpression: {
      enter(node) {
        console.log(node.id);
        return node.id;
      },
    },
    ReturnStatement: {
      enter(node) {
        return 'return';
      },
    },
    Identifier: {
      enter(node) {
        return node.id;
      },
    },
    TextLiteral: {
      enter(node) {
        return node.text;
      },
    },
  });
}
