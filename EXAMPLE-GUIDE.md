# Neo Addition Example - Quick Guide

## Your Neo Program: `add-numbers.cy`

This is a simple Neo program that demonstrates adding numbers in the Neo/Cylon programming language.

### Source Code

```neo
# Example Neo program: Adding two numbers

# Declare two numbers
var a: 10
var b: 25

# Add the numbers
var sum: a + b

# Print the result
print(sum)

# You can also do inline addition
var result: 100 + 50
print(result)

# Adding multiple numbers
var x: 5
var y: 15
var z: 30
var total: x + y + z
print(total)
```

### What This Program Does

1. **Declares variables with numbers**: `var a: 10` creates a variable `a` with value 10
2. **Adds two variables**: `var sum: a + b` adds `a` and `b`
3. **Prints the result**: `print(sum)` outputs: `35`
4. **Inline addition**: `var result: 100 + 50` outputs: `150`
5. **Multiple additions**: `x + y + z` outputs: `50`

### Neo Language Features Used

| Feature | Syntax | Description |
|---------|--------|-------------|
| Variable declaration | `var name: value` | Creates a new variable |
| Numbers | `10`, `25`, `100` | Arbitrary precision numbers (BigFloat) |
| Addition | `a + b` | Adds two numbers using the `+` operator |
| Function call | `print(value)` | Calls a built-in function |
| Comments | `# comment` | Single-line comments |

### How It Compiles

Neo compiles to JavaScript. Your program becomes:

```javascript
import $NEO from "./neo.runtime.js"

// Numbers are created as BigFloat constants
const $10 = $NEO.number("10");
const $25 = $NEO.number("25");

// Variables reference these constants
var a = $10;
var b = $25;

// Addition uses the NEO runtime
var sum = $NEO.add(a, b);
$NEO.print(sum);

// ... and so on
```

### Compilation Pipeline

```
Neo Source (.cy)
    ↓ [Tokenizer]
Tokens
    ↓ [Parser]
Abstract Syntax Tree (AST)
    ↓ [Code Generator]
JavaScript Code (.js)
```

### How to Compile and Run

#### Option 1: Using the Test Framework

```bash
# Run the existing test suite (which shows compilation)
npm test
```

#### Option 2: Using ts-node (if you have the compiler built)

```bash
# Install dependencies
npm install

# Compile your Neo program
npx ts-node -O '{"module":"commonjs"}' << 'EOF'
import fs from 'fs';
import tokenizer from './src/compiler/neo.tokenize';
import parser from './src/compiler/neo.parse';
import codegen from './src/compiler/neo.codegen';

const source = fs.readFileSync('add-numbers.cy', 'utf8');
const tokens = tokenizer(source);
const ast = parser(tokens, '');
const jsCode = codegen(ast);

console.log(jsCode);
fs.writeFileSync('add-numbers.compiled.js', jsCode);
EOF
```

#### Option 3: Using the Compiler Modules Directly

See `test/helpers.ts` for the compile function:

```typescript
import tokenizer from './src/compiler/neo.tokenize';
import parser from './src/compiler/neo.parse';
import codegen from './src/compiler/neo.codegen';

function compile(input: string): string {
    const parse = parser(tokenizer(input), '');
    const code = codegen(parse);
    return code;
}
```

## Other Neo Features You Can Try

### Arithmetic Operations

```neo
var a: 10
var b: 3

var addition: a + b       # 13
var subtraction: a - b    # 7
var multiplication: a * b # 30
var division: a / b       # 3.333...
```

### Comparison Operators

```neo
var x: 5
var y: 10

var equal: x = y          # false (note: uses = not ==)
var not_equal: x ≠ y      # true
var less: x < y           # true
var greater: x > y        # false
var less_eq: x ≤ y        # true
var greater_eq: x ≥ y     # false
```

### Functions

```neo
def add_three: ƒ a, b, c {
    return a + b + c
}

var result: add_three(1, 2, 3)
print(result)  # 6
```

### Loops

```neo
var i: 0
loop
    let i: i + 1
    if i > 5
        break
    print(i)
```

## File Reference

| File | Description |
|------|-------------|
| `add-numbers.cy` | Your Neo source program |
| `add-numbers-expected.js` | Expected JavaScript output |
| `src/compiler/neo.tokenize.ts` | Tokenizer (lexer) |
| `src/compiler/neo.parse.ts` | Parser (creates AST) |
| `src/compiler/neo.codegen.ts` | Code generator (AST → JS) |
| `src/runtime/neo.runtime.ts` | Runtime library (add, sub, print, etc.) |
| `test/helpers.ts` | Test utilities with compile() function |

## Next Steps

1. **Explore more examples**: Check `test/statments/` for more Neo examples
2. **Modify the program**: Try different numbers and operations
3. **Learn more operators**: See the parser (`neo.parse.ts`) for all operators
4. **Build something**: Create your own Neo program!

## Questions?

- Check the compiler source code for language features
- Look at test cases for examples
- Experiment with the language!
