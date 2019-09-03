def MyModule: module {
    def upper: ƒ {
        return "hello"
    }


    def InnerModule: module {
        def inner_greet: ƒ {
            return "hello Inner"
        }

        def inner_greet2: ƒ {
            return "hello222 Inner"
        }
    }

    def greet: ƒ {
        return "hello"
    }
}