// index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { MyFunctionalComponent, MyClassComponent } from './MyReactComponents';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { MathOperationsComponent } from './AngularComponent';

// Render React Components
ReactDOM.render(
    <div>
        <h1>React Functional Component</h1>
        <MyFunctionalComponent />
        <h1>React Class Component</h1>
        <MyClassComponent />
    </div>,
    document.getElementById('react-root')
);

// Bootstrap Angular Component
platformBrowserDynamic().bootstrapModule(MathOperationsComponent);
