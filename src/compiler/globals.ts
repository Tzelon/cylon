import { Token } from './neo.tokenize';


let the_error;
let the_filename;
let now_module; // The scope currently being processed. can be inside a function or module
let now_function; // The scope currently being processed. can be inside a function or module
let loop = []; // An array of loop exit status.



