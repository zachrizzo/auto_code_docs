// MyReactComponents.jsx
import React, { useState, useEffect } from 'react';
import { add, subtract, withLogging, MathOperations } from './test2';

// React Functional Component
export function MyFunctionalComponent() {
    const [count, setCount] = useState(0);
    const [result, setResult] = useState(null);

    useEffect(() => {
        document.title = `Count is ${count}`;
    }, [count]);

    const handleAdd = () => {
        const operation = new MathOperations(count, 1);
        setResult(operation.add());
        setCount(count + 1);
    };

    return (
        <div>
            <p>Count: {count}</p>
            <p>Result after addition: {result}</p>
            <button onClick={handleAdd}>Add</button>
        </div>
    );
}

// React Class Component
export class MyClassComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            count: 0,
            result: null,
        };
    }

    handleSubtract = () => {
        const operation = new MathOperations(this.state.count, 1);
        this.setState({
            result: operation.subtract(),
            count: this.state.count - 1,
        });
    };

    render() {
        return (
            <div>
                <p>Count: {this.state.count}</p>
                <p>Result after subtraction: {this.state.result}</p>
                <button onClick={this.handleSubtract}>Subtract</button>
            </div>
        );
    }
}
