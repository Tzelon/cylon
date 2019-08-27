const $NEO = require( "../bin/src/runtime/neo.runtime").default

var my_module = $NEO.stone(function () {
    var greet = $NEO.stone(function () {
        return "hello world";
    });
    var greet2 = $NEO.stone(function () {
        return "hello world2";
    });
    var greet3 = $NEO.stone(function (my_name) {
        return $NEO.cat("hello", my_name);
    });
return $NEO.stone({ greet, greet2, greet3})})();

console.log($NEO.get(my_module, "greet")());