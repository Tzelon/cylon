// This is what add-numbers.cy should compile to:

import $NEO from "./neo.runtime.js"
const $10 = $NEO.number("10");
const $25 = $NEO.number("25");
const $100 = $NEO.number("100");
const $50 = $NEO.number("50");
const $5 = $NEO.number("5");
const $15 = $NEO.number("15");
const $30 = $NEO.number("30");

var a = $10;
var b = $25;
var sum = $NEO.add(a, b);
$NEO.print(sum);

var result = $NEO.add($100, $50);
$NEO.print(result);

var x = $5;
var y = $15;
var z = $30;
var total = $NEO.add($NEO.add(x, y), z);
$NEO.print(total);
