import { Token } from './compiler/neo.tokenize';
import primordial from './compiler/parser/primordial';

type Scope = {
  name: string;
  type: 'module' | 'function';
  parent_scope: ReturnType<typeof create_scope>;
};

function create_scope({ name, type, parent_scope }: Scope) {
  let symbols = {};

  return {
    get symbols() {
        return symbols;
    },
    get parent_scope() {
        return parent_scope;
    },
    // The register function declares a new variable in a function's or module scope.
    register(the_token: Token, readonly = false) {
      // Add a variable to the current scope.

      if (symbols[the_token.id] !== undefined) {
        console.error(the_token, 'already defined');
        throw 'already defined'
      }

      
      // The origin property capture the function that created the variable.
      // The symbols holds all of the variable created or used in a function.
      // The parent_scope property points to the function that created this function.
      
      the_token.readonly = readonly;
      the_token.origin = create_scope;
      symbols[the_token.id] = the_token;
    },
    // The lookup function finds a variable in the most relevant scope.
    lookup(id: string) {
      // Look for the definition in the current scope.

      let definition = symbols[id];

      // If that fails, search the ancestor scopes.

      if (definition === undefined) {
        let parent = parent_scope;
        while (parent !== undefined) {
          definition = parent.symbols[id];
          if (definition !== undefined) {
            break;
          }
          parent = parent.parent_scope;
        }

        // If that fails, search the primordials.

        if (definition === undefined) {
          definition = primordial[id];
        }

        // Remember that the current function used this definition.

        // if (definition !== undefined) {
        //   this.now_function.scope[id] = definition;
        // }
      }
      return definition;
    },
  };
}

export default create_scope;
