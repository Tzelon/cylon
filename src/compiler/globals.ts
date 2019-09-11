import { Token } from './neo.tokenize';
import primordial from './parser/primordial';

let the_error;
let the_filename;
let now_module; // The scope currently being processed. can be inside a function or module
let now_function; // The scope currently being processed. can be inside a function or module
let loop = []; // An array of loop exit status.

type LoopStatus = 'break' | 'return' | 'infinite';

export function is_in_loop() {
  return loop.length === 0;
}

export function is_in_function() {
  return now_function === undefined;
}

export function set_top_loop_status(status: LoopStatus) {
  loop[loop.length - 1] = status;
}

export function add_loop(status: LoopStatus) {
  loop.push(status);
}

export function pop_loop(): LoopStatus {
  return loop.pop();
}

export function set_infinite_loops_to_return() {
  loop.forEach(function(element, element_nr) {
    if (element === 'infinite') {
      loop[element_nr] = 'return';
    }
  });
}

export function error(zeroth, wunth): never {
  the_error = {
    id: '(error)',
    zeroth,
    wunth,
  };
  throw 'fail';
}

// The register function declares a new variable in a function's scope.
// The lookup function finds a veriable in the most relevant scope.
export function register(the_token: Token, readonly = false) {
  // Add a variable to the current scope.

  if (is_in_function()) {
    error(the_token, 'must be inside a function');
  }

  if (now_function.scope[the_token.id] !== undefined) {
    error(the_token, 'already defined');
  }

  // The origin property capture the function that created the variable.
  // The scope property holds all of the variable created or used in a function.
  // The parent property points to the function that created this function.

  the_token.readonly = readonly;
  the_token.origin = now_function;
  now_function.scope[the_token.id] = the_token;
}

export function lookup(id: string) {
  // Look for the definition in the current scope.

  let definition = now_function.scope[id];

  // If that fails, search the ancestor scopes.

  if (definition === undefined) {
    let parent = now_function.parent;
    while (parent !== undefined) {
      definition = parent.scope[id];
      if (definition !== undefined) {
        break;
      }
      parent = parent.parent;
    }

    // If that fails, search the primordials.

    if (definition === undefined) {
      definition = primordial[id];
    }

    // Remember that the current function used this definition.

    if (definition !== undefined) {
      now_function.scope[id] = definition;
    }
  }
  return definition;
}
