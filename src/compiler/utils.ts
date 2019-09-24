import $NEO from '../runtime/neo.runtime';

export function make_set(array, value = true) {
  const object = Object.create(null);
  array.forEach(function(element) {
    object[element] = value;
  });
  return $NEO.stone(object);
}
