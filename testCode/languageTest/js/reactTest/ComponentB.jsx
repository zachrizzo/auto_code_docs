// File: ComponentB.jsx
import React from 'react';
import ComponentA from './ComponentA.jsx';
import { complexFunction } from './helper.js';

const ComponentB = () => {
    // Arrow function utilizing imported function
    const handleComplexFunction = () => {
        complexFunction(); // Call a function from helper.js
    };

    return (
        <div>
            <h2>Component B</h2>
            <ComponentA /> {/* Using ComponentA inside ComponentB */}
            <button onClick={handleComplexFunction}>Run Complex Function</button>
        </div>
    );
};

// Export default component
export default ComponentB;
