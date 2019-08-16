import $NEO from "./neo.runtime.js"

var say_hi = $NEO.stone(function () {return "hi";});
var is_vowel_ = $NEO.stone(function (c) {
    if ((((($NEO.eq(c, "a") || $NEO.eq(c, "e")) || $NEO.eq(c, "i")) || $NEO.eq(c, "o")) || $NEO.assert_boolean("u"))) {
        return true;
    } else {
        return false;
    }
});