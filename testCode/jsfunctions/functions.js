// // Node.js example functions

// // Regular function
// function add(a, b) {
//     return a + b;
// }

// // Arrow function
// const subtract = (a, b) => {
//     return a - b;
// };

// // Anonymous function
// const multiply = function (a, b) {
//     return a * b;
// };

// // IIFE (Immediately Invoked Function Expression)
// (function () {
//     console.log('This is an IIFE');
// })();

// // Asynchronous function
// async function fetchData(url) {
//     try {
//         const response = await fetch(url);
//         return await response.json();
//     } catch (error) {
//         console.error('Error fetching data:', error);
//     }
// }

// // Higher-order function
// function withLogging(fn) {
//     return function (...args) {
//         console.log('Arguments:', args);
//         return fn(...args);
//     };
// }

// // Node.js example using CommonJS module
// const fs = require('fs');

// function readFile(filePath) {
//     return fs.readFileSync(filePath, 'utf8');
// }

// module.exports = { add, subtract, multiply, fetchData, withLogging, readFile };

// // React example functions

// React Functional Component
import React, { useState, useEffect } from 'react';

function MyFunctionalComponent() {
    const [count, setCount] = useState(0);

    const handleClick = () => {
        setCount(count + 1);
    }


    useEffect(() => {
        document.title = `You clicked ${count} times`;
    }, [count]);

    return (
        <div>
            <p>You clicked {count} times</p>
            <button onClick={() => setCount(count + 1)}>Click me</button>
        </div>
    );
}

// // React Class Component
// class MyClassComponent extends React.Component {
//     constructor(props) {
//         super(props);
//         this.state = { count: 0 };
//     }

//     componentDidMount() {
//         document.title = `You clicked ${this.state.count} times`;
//     }

//     componentDidUpdate() {
//         document.title = `You clicked ${this.state.count} times`;
//     }

//     handleClick = () => {
//         this.setState({ count: this.state.count + 1 });
//     };

//     render() {
//         return (
//             <div>
//                 <p>You clicked {this.state.count} times</p>
//                 <button onClick={this.handleClick}>Click me</button>
//             </div>
//         );
//     }
// }

// export { MyFunctionalComponent, MyClassComponent };
