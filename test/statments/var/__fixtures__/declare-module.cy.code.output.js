import $NEO from "./neo.runtime.js"

var my_module = $NEO.stone(function () {
    var greet = $NEO.stone(function () {
        return "hello world";
    });
return $NEO.stone({ greet})})();