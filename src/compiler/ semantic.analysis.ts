import { walk } from '../../utils/ast-visitor';
import create_scope from '../scope.tree';

export default function semantic_analysis(trees: any[]) {
  let modules = new Set(trees.map(mod => mod.zeroth.id));

  let global_scope = create_scope({
    level: 0,
    name: 'global',
    parent_scope: undefined,
    type: 'global',
  });

  let now_scope = global_scope;

  walk(trees, {
    ModuleStatement: {
      enter(node, parent) {
        this.skip(); //because we want to control the flow we skip children nodes
        const module_scope = create_scope({
          name: node.zeroth.id,
          level: 1,
          parent_scope: now_scope,
          type: 'module',
        });
        now_scope = module_scope;
        this.visit(node.wunth, node);
        now_scope = global_scope;
      },
    },
    FunctionLiteralExpression: {
      enter(node, parent) {
        this.skip();
        const module_scope = create_scope({
          name: node.zeroth.id,
          level: now_scope.level + 1,
          parent_scope: now_scope,
          type: 'function',
        });

        now_scope = module_scope;
        this.visit(node.wunth, node);
        now_scope = now_scope.parent_scope;
      },
    },
    ImportNameBinding: {
      enter(node) {
        if (node.id === 'as') {
          now_scope.register(node.binds, true);
        }
      },
    },
    ImportSpecifier: {
      enter(node) {
        if (node.alias) {
          now_scope.register(node.alias);
        } else {
          now_scope.register(node.name);
        }
      },
    },
    VarStatement: {
      enter(node) {
        now_scope.register(node.zeroth);
      },
    },
    DefStatement: {
      enter(node) {
        now_scope.register(node.zeroth, true);
      },
    },
    Identifier: {
      enter(node) {
        if (node.isModule) {
          if (!modules.has(node.id)) {
            throw 'module not found';
          }
        } else {
          now_scope.lookup(node.id);
        }
      },
    },
  });
}
