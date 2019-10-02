import { walk } from '../../utils/ast-visitor';
import create_scope, { Scope } from '../scope.tree';

export default function semantic_analysis(trees: any[]) {
  // we first sort the modules trees, it will help us to resovle the modules making sure we first register parents before children
  const sorted_trees = trees.sort((a, b) => {
    const left = a.zeroth.parents === undefined ? 0 : a.zeroth.parents.length;
    const right = b.zeroth.parents === undefined ? 0 : b.zeroth.parents.length;
    return left - right;
  });

  let global_scope = create_scope({
    level: 0,
    name: 'global',
    parent_scope: undefined,
    type: 'global',
  });

  let now_scope = global_scope;

  walk(sorted_trees, {
    ModuleStatement: {
      enter(node, parent) {
        this.skip(); //because we want to control the flow we skip children nodes
        let module_scope;
        // Root modules
        if (node.zeroth.parents === undefined) {
          module_scope = create_scope({
            name: node.zeroth.id,
            level: 1,
            parent_scope: now_scope,
            type: 'module',
          });
          now_scope.register_scope(module_scope);
        } else {
          // Nested modules
          now_scope = now_scope.lookup_scope(node.zeroth.parents);

          module_scope = create_scope({
            name: node.zeroth.id,
            level: node.zeroth.parents.length + 1,
            parent_scope: now_scope,
            type: 'module',
          });
          now_scope.register_scope(module_scope);
        }
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
        now_scope.lookup(node.id);
      },
    },
  });
}
