// index.js
import React from 'react';
import ReactDOM from 'react-dom';
import ComponentA from './reactTest/ComponentA';
import ComponentB from './reactTest/ComponentB';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { MathOperationsComponent } from './AngularComponent';

// Render React Components
ReactDOM.render(
    <div>
        <h1>React Functional Component</h1>
        <ComponentA />
        <h1>React Class Component</h1>
        <ComponentB />
    </div>,
    document.getElementById('react-root')
);

// Bootstrap Angular Component
platformBrowserDynamic().bootstrapModule(MathOperationsComponent);
