 var __use__ = function(mod) {
  // console.log(mod)
  mod.exports.greeting = greeting;
}

 var greeting = function(name) {
  return `hello ${name}`;
};


module.exports = {
  __use__,
  greeting
}