// File: ComponentA.jsx
import React, { useState } from 'react';
import { helperFunction } from './helper.js';
import ServiceClass from './ServiceClass.js';

const ComponentA = () => {
    const [count, setCount] = useState(0);

    // Traditional function
    function increment() {
        setCount(count + 1);
    }

    // Arrow function
    const doubleIncrement = () => {
        setCount(count + 2);
    };

    // Nested function calling a method from an imported class
    const handleClick = () => {
        const service = new ServiceClass();
        service.performAction();
        increment();
        doubleIncrement();
    };

    const logHelper = () => {
        console.log('Component A rendered');
    }

    return (
        <div>
            <h1>Count: {count}</h1>
            <button onClick={handleClick}>Increment</button>
        </div>
    );
};

// Export default component
export default ComponentA;
