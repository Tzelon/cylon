import { Token } from './compiler/neo.tokenize';
import primordial from './compiler/parser/primordial';

export type Scope = ReturnType<typeof create_scope>;

type ScopeParams = {
  name: string;
  level: number;
  type: 'module' | 'function' | 'global';
  parent_scope: Scope;
};

// The symbols holds all of the variable created or used in a function or module.
// The parent_scope property points to the scope that created this function.
function create_scope({ name, level, type, parent_scope }: ScopeParams) {
  let symbols = new Map<string, Token | Scope>();

  return {
    get name() {
      return name;
    },
    get symbols() {
      return symbols;
    },
    get parent_scope() {
      return parent_scope;
    },
    get level() {
      return level;
    },
    // The register function declares a new variable in a function's or module scope.
    register(the_token: Token, readonly = false) {
      // Add a variable to the current scope.

      if (symbols.get(the_token.id) !== undefined) {
        console.error(the_token, 'already defined');
        throw 'already defined';
      }

      the_token.readonly = readonly;
      symbols.set(the_token.id, the_token);
    },

    // The lookup function finds a variable in the most relevant scope.
    lookup(id: string) {
      // Look for the definition in the current scope.

      let definition = symbols.get(id);

      // If that fails, search the ancestor scopes.

      if (definition === undefined) {
        let parent = parent_scope;
        while (parent !== undefined) {
          definition = parent.symbols.get(id);
          if (definition !== undefined) {
            break;
          }
          parent = parent.parent_scope;
        }

        // If that fails, search the primordials.

        if (definition === undefined) {
          definition = primordial[id];
        }

        if (definition === undefined) {
          console.error(id, 'is not defined');
          throw 'not defined';
        }
      }
      return definition;
    },
    // The register function declares a new variable in a function's or module scope.
    register_scope(the_scope) {
      // Add a variable to the current scope.

      if (symbols.get(the_scope.name) !== undefined) {
        console.error(the_scope, 'already defined');
        throw 'already defined';
      }

      symbols.set(the_scope.name, the_scope);
    },

    lookup_scope(parents: string[]) {
      const parents_paths = create_parents_paths(parents);
      let scope;

      //Find module immediate parent
      while (parents_paths.length > 0) {
        const parent = parents_paths.shift();

        scope = (scope ? scope.symbols.get(parent) : symbols.get(parent)) as Scope;
        if (scope === undefined) {
          throw 'Cannot find module path';
        }
      }
      return scope;
    },
  };
}

function create_parents_paths(parents: string[]) {
  return parents.map((name, index) => {
    return parents.slice(0, index + 1).join('.');
  });
}

export default create_scope;
