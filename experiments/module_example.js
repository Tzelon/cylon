//simple module
const Example_Simple_Module = (function Example() {
  function greeting(your_name) {
    return 'Hello ' + your_name;
  }

  return Object.freeze({
    greeting,
  });
})();

// console.log(Example_Simple_Module.greeting("Tzelon"))

//nested modules
const Example_Nested_Modules = (function Example() {
  function greeting(your_name) {
    return 'Hello ' + your_name;
  }

  return Object.freeze({
    greeting,
  });
})();

Example_Nested_Modules.__proto__.Day_time = (function Example() {
  function morning(your_name) {
    return 'Good Morning ' + your_name;
  }

  function evening(your_name) {
    return 'Good Evening ' + your_name;
  }

  return Object.freeze({
    morning,
    evening,
  });
})();

// console.log(Example_Nested_Modules.Day_time.morning("Tzelon"))
// console.log(Example_Nested_Modules.greeting("Tzelon"))

//alias
const Example_Saying = (function Example() {
  return Object.freeze({});
})();

Example_Saying.__proto__.Greetings = (function Example() {
  function basic(your_name) {
    return 'Hello ' + your_name;
  }

  return Object.freeze({
    basic,
  });
})();

const Example_Alias_Modules = (function Example() {
  const Greetings = Example_Saying.Greetings;

  function greeting(your_name) {
    return Greetings.basic(your_name);
  }

  return Object.freeze({
    greeting,
  });
})();

console.log(Example_Alias_Modules.greeting('Tzelon'));
