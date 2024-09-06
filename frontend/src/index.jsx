import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const root = createRoot(document.body);

// Do this
// const container = document.createElement('div');
// document.body.appendChild(container);
// const root = createRoot(container);
root.render(<App />);
