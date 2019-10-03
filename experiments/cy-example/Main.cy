module MyExample {
    import App, only: [a as: b, x, y as: d]
    import Avc, as: A
    import More

    def fun2: ƒ  {
        return "Hello"
    }
}


module App {
    def a: "a"
}
module Avc {
    def a: "a"
}
module More {
    def a: "a"
}
