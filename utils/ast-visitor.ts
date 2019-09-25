import { SyntaxKind } from '../src/compiler/NodesTypes';

type Methods = {
  [Tkey in SyntaxKind]?: {
    enter: (this: typeof context, node, parent, prop, index) => void;
    leave?: (this: typeof context, node, parent, prop, index) => void;
  };
};

let methods = null;
let should_skip = false;
let replacement = null;

const context = {
  skip: () => (should_skip = true),
  replace: node => (replacement = node),
  code: (code, fun) => fun(code),
  visit,
};

function walk(ast, the_methods: Methods) {
  methods = the_methods;
  return visit(ast, null);
}

const childKeys = {};

function replace(parent, prop, index, node) {
  if (parent) {
    if (index !== null) {
      parent[prop][index] = node;
    } else {
      parent[prop] = node;
    }
  }
}

function visit(node, parent, prop?, index?) {
  if (node) {
    const { enter, leave } = methods[node.syntaxKind] || {};
    if (enter) {
      const _should_skip = should_skip;
      const _replacement = replacement;
      should_skip = false;
      replacement = null;

      enter.call(context, node, parent, prop, index);

      if (replacement) {
        node = replacement;
        replace(parent, prop, index, node);
      }

      const skipped = should_skip;

      should_skip = _should_skip;
      replacement = _replacement;

      if (skipped) return node;
    }

    const keys =
      (node.syntaxKind && childKeys[node.syntaxKind]) ||
      (childKeys[node.syntaxKind] = Object.keys(node).filter(
        key => typeof node[key] === 'object'
      ));

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const value = node[key];

      if (Array.isArray(value)) {
        for (let j = 0; j < value.length; j += 1) {
          value[j] && value[j].syntaxKind && visit(value[j], node, key, j);
        }
      } else if (value && value.syntaxKind) {
        visit(value, node, key, null);
      }
    }

    if (leave) {
      const _replacement = replacement;
      replacement = null;

      leave.call(context, node, parent, prop, index);

      if (replacement) {
        node = replacement;
        replace(parent, prop, index, node);
      }

      replacement = _replacement;
    }
  }

  return node;
}

export { walk, childKeys };
