def my module: module {
    def greet: ƒ {
        return "hello world"
    }

    def greet2: ƒ {
        return "hello world2"
    }


    def greet3: ƒ my name {
        return "hello" ~ my name
    }
}

call my module.greet()
