import { Token } from './compiler/neo.tokenize';
import primordial from './compiler/parser/primordial';

type Scope = {
  name: string;
  level: number;
  type: 'module' | 'function' | 'global';
  parent_scope: ReturnType<typeof create_scope>;
};

// The symbols holds all of the variable created or used in a function or module.
// The parent_scope property points to the scope that created this function.
function create_scope({ name, level, type, parent_scope }: Scope) {
  let symbols = new Map<string, Token>();

  return {
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
  };
}

export default create_scope;
