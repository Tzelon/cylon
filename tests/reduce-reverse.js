import $NEO from "./neo.runtime.js"
const $1 = $NEO.number("1");
const $0 = $NEO.number("0");

var reduce_reverse = $NEO.stone(function (array, callback_function, initial_value) {
    var element_nr = $NEO.length(array);
    var reduction = initial_value;
    if ($NEO.eq(reduction, undefined)) {
        element_nr = $NEO.sub(element_nr, $1);
        reduction = $NEO.get(array, element_nr);
    }
    var exit = $NEO.stone(function (final_value) {
        element_nr = $0;
        return final_value;
    });
    while (true) {
        element_nr = $NEO.sub(element_nr, $1);
        if ($NEO.lt(element_nr, $0)) {
            break;
        }
        reduction = callback_function(reduction, $NEO.get(array, element_nr), element_nr, exit);
    }
    return reduction;
});