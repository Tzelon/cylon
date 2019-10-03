const { __use__ } = require('./Example');

var morining = function(name) {
  return `morning ${name}`;
};



module.exports = {
  morining,
}
__use__(module);