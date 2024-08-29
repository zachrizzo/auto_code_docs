// moduleA.js

// Regular function
function add(a, b) {
    return a + b;
}

// Arrow function
const subtract = (a, b) => a - b;

// Anonymous function
const multiply = function (a, b) {
    return a * b;
};

// Higher-order function
function withLogging(fn) {
    return function (...args) {
        console.log('Arguments:', args);
        return fn(...args);
    };
}

// A class with a method
class MathOperations {
    constructor(a, b) {
        this.a = a;
        this.b = b;
    }

    add() {
        return add(this.a, this.b);
    }

    subtract() {
        return subtract(this.a, this.b);
    }
}

// Exporting functions and class
module.exports = { add, subtract, multiply, withLogging, MathOperations };
