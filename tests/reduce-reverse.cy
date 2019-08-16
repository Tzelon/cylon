def reduce reverse: ƒ array, callback function, initial value {
    # FIXME Reduce an array to a single value.

    # If an initial value is not provided, then the zeroth element is used
    # and the first iteration is skipped.
    var element nr: length(array, dsa d dsa)
    var reduction: initial value
    if reduction = null
        let element nr: element nr - 1
        let reduction: array[element nr]

    # The callback function gets an exit function that it can call
    # to stop the operation.

    def exit: ƒ final value {
        let element nr: 0
        return final value
    }

    # Loop until the array is exhausted or an early exit is requested.
    # On each iteration, call the callback function with the next increment.

    loop
        let element nr: element nr - 1
        if element nr < 0
            break
        let reduction: callback function(
            reduction
            array[element nr]
            element nr
            exit
        )

    return reduction
}
