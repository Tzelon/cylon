// The primordial object contains the object that are buikt into the language.
// This includes constants like true and functions like neg.
const primordial = (function(ids) {
    const result = Object.create(null);
    ids.forEach(function(id) {
        result[id] = Object.freeze({
            id,
            alphameric: true,
            readonly: true // blocks the let statement
        });
    });
    return Object.freeze(result);
})([
    'abs',
    'array',
    'array?',
    'bit and',
    'bit mask',
    'bit or',
    'bit shift down',
    'bit shift up',
    'bit xor',
    'boolean?',
    'char',
    'code',
    'false',
    'fraction',
    'function?',
    'integer',
    'integer?',
    'length',
    'neg',
    'not',
    'number',
    'number?',
    'null',
    'record',
    'record?',
    'stone',
    'stone?',
    'text',
    'text?',
    'true'
]);

export default primordial;