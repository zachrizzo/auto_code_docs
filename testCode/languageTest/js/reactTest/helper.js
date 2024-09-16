// File: helper.js

import ServiceClass from './ServiceClass.js';

// Regular function
export function helperFunction() {
    console.log('Helper function called');
}

// Arrow function with nested function
export const complexFunction = () => {
    console.log('Complex function called');

    function innerFunction() {
        console.log('Inner function inside complex function');
    }

    const innerArrowFunction = () => {
        innerFunction();
        console.log('Inner arrow function inside complex function');
    };


    innerArrowFunction();
};

// Function utilizing the class from another file
export function useServiceClass() {
    const service = new ServiceClass();
    service.performAction();
    complexFunction();
}
