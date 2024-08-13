// utilities.js
export function add(a, b) {
    return a + b;
}

export function subtract(a, b) {
    return a - b;
}

// mathOperations.js
import { add, subtract } from './utilities';

export function multiply(a, b) {
    return a * b;
}

export function divide(a, b) {
    if (b === 0) {
        throw new Error("Division by zero");
    }
    return a / b;
}


export class Calculator {
    constructor() {
        this.history = [];
    }

    calculate(operation, a, b) {
        let result;
        switch (operation) {
            case 'add':
                result = add(a, b);
                break;
            case 'subtract':
                result = subtract(a, b);
                break;
            case 'multiply':
                result = multiply(a, b);
                break;
            case 'divide':
                result = divide(a, b);
                break;
            default:
                throw new Error("Unknown operation");
        }
        this.history.push({ operation, a, b, result });
        return result;
    }

    getHistory() {
        return this.history;
    }
}

// app.js
import { Calculator } from './mathOperations';

class Application {
    constructor() {
        this.calculator = new Calculator();
    }

    run() {
        const a = 10;
        const b = 5;

        console.log("Addition:", this.calculator.calculate('add', a, b));
        console.log("Subtraction:", this.calculator.calculate('subtract', a, b));
        console.log("Multiplication:", this.calculator.calculate('multiply', a, b));
        console.log("Division:", this.calculator.calculate('divide', a, b));

        console.log("Calculation History:", this.calculator.getHistory());
    }
}

const app = new Application();
app.run();
