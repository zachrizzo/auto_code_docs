// File: ServiceClass.js
import { helperFunction } from './helper.js';

// Class declaration
class ServiceClass {
    constructor() {
        this.name = 'ServiceClass';
    }

    // Method within a class
    performAction() {
        console.log(`${this.name} performing an action`);
        helperFunction(); // Calling function from another file
    }

    // Static method
    static staticMethod() {
        console.log('Static method in ServiceClass');
    }

    // Method with a nested function
    nestedMethod() {
        console.log('Nested method in ServiceClass');

        function innerMethod() {
            console.log('Inner method inside nestedMethod');
        }

        const innerArrowMethod = () => {
            console.log('Inner arrow function inside nestedMethod');
        };

        innerMethod();
        innerArrowMethod();
    }
}

// Export default class
export default ServiceClass;
