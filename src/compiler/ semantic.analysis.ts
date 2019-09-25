import { walk } from '../../utils/ast-visitor';
import create_scope from '../scope.tree';

export default function semantic_analysis(tree) {
  let now_scope = create_scope({
    level: 0,
    name: 'global',
    parent_scope: undefined,
    type: 'global'
  })

  walk(tree, {
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
        now_scope = now_scope.parent_scope;
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
