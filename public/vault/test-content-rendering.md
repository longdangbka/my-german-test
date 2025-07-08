## Test Content Rendering

### Questions

--- start-question
TYPE: T-F

Q: This question tests **all content formats**:

Here's some LaTeX math: $x = \frac{a}{b}$ and also display math:

$$y = \int_{0}^{\infty} e^{-x^2} dx$$

Here's an image:
![[a282db8dc65a5a98beb88413d7f1d57d549d65882c3e5d4e2250c39dd1953480e22d3d864280d3600dc36b5495d860da4a627cd1991450ea92e721eccfe045f2.jpg]]

Here's a code block in JavaScript:
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return `Welcome, ${name}`;
}

// Test the function
greet("World");
```

And here's a table:

| Feature | Support | Status |
|---------|---------|--------|
| LaTeX | ✅ | Working |
| Images | ✅ | Working |
| Code | ✅ | Working |
| Tables | ✅ | Working |

A: R

E: This explanation also contains **all formats**:

Inline LaTeX: $a^2 + b^2 = c^2$

Display LaTeX:
$$E = mc^2$$

Another code block (CSS):
```css
.question-block {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}
```

And a table:

| Component | Purpose |
|-----------|---------|
| CodeBlock | Syntax highlighting |
| TableWithLatex | LaTeX in tables |

--- end-question

--- start-question
TYPE: CLOZE

Q: Fill in the blanks with code and math:

The function {{c::console.log}} is used for {{c::debugging}} in JavaScript.

Here's some code:
```python
def calculate(x):
    return {{c::x * 2}}

result = calculate(5)
print(result)  # This prints {{c::10}}
```

The quadratic formula is: $x = \frac{-b \pm \sqrt{{{c::b^2 - 4ac}}}}{2a}$

A: console.log, debugging, x * 2, 10, b^2 - 4ac

--- end-question

--- start-question
TYPE: Short

Q: What programming language is this code written in?

```rust
fn main() {
    let message = "Hello, world!";
    println!("{}", message);
}
```

A: Rust

E: This is **Rust** code. Key indicators:
- `fn` keyword for functions
- `let` for variable declaration  
- `println!` macro for printing

More Rust code:
```rust
struct Point {
    x: f64,
    y: f64,
}

impl Point {
    fn distance(&self) -> f64 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}
```

--- end-question
