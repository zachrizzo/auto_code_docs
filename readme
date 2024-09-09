# My Electron, React, and Firebase Project

## Project Overview

This project is an Electron application integrated with React and Firebase, designed to create a modern desktop application with features like user authentication, dark/light theme toggle, and a code analyzer using `tree-sitter` for detecting and resolving cross-file dependencies.

The frontend is built with React using Material UI for styling, and Firebase handles user authentication. Electron is used to provide a desktop environment, and `tree-sitter` is utilized to analyze and parse code files, written in C++ for native bindings.

## Table of Contents

- [My Electron, React, and Firebase Project](#my-electron-react-and-firebase-project)
  - [Project Overview](#project-overview)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Installing Electron Rebuild](#installing-electron-rebuild)
  - [Xcode Command Line Tools (macOS)](#xcode-command-line-tools-macos)
  - [Usage](#usage)
  - [Features](#features)
  - [Code Example (Electron Main Process)](#code-example-electron-main-process)
  - [C++ and tree-sitter Integration](#c-and-tree-sitter-integration)
  - [Steps Taken](#steps-taken)
  - [Firebase Integration](#firebase-integration)
  - [Dark Mode Example](#dark-mode-example)
- [Tree-sitter Integration in Electron with Webpack](#tree-sitter-integration-in-electron-with-webpack)
  - [1. Project Structure](#1-project-structure)
  - [2. Webpack Configuration for Electron](#2-webpack-configuration-for-electron)
    - [Webpack for Handling WebAssembly (WASM) Files](#webpack-for-handling-webassembly-wasm-files)
  - [Handling .wasm Files](#handling-wasm-files)
    - [3. Electron Forge Configuration](#3-electron-forge-configuration)
    - [4. Tree-sitter Parser Initialization](#4-tree-sitter-parser-initialization)
    - [Key Takeaways](#key-takeaways)
    - [5. Debugging Common Issues](#5-debugging-common-issues)
    - [6. Running the Application](#6-running-the-application)
    - [7. Conclusion](#7-conclusion)
  - [License](#license)

## Installation

To get started, clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/your-project.git
cd your-project
npm install
```

## Installing Electron Rebuild

Since this project involves native modules like tree-sitter, you need to ensure they are rebuilt for Electron:

```bash
npm install --save-dev @electron/rebuild
npx electron-rebuild
```

Make sure you have the required C++ compiler and development environment installed.

## Xcode Command Line Tools (macOS)

If you are on macOS, make sure you have the Xcode Command Line Tools installed:

`xcode-select --install`
You may also need to update the tools:

`sudo softwareupdate --all --install --force`

## Usage

To run the application in development mode:

`npm run start`
This will launch the Electron app and serve the React frontend.

## Features

1. Firebase Authentication
   Firebase handles user authentication using email and password.
   Authentication state is tracked within React and managed using onAuthStateChanged from Firebase.
1. Code Analyzer using tree-sitter
   The app includes a file analyzer that parses JavaScript, Python, and JSX files for class and function declarations using tree-sitter.
   It also resolves cross-file dependencies to show connections between different code files.
1. Theming and UI
   The app supports both dark and light themes using Material UI.
   The theme can be toggled by users dynamically.
   Scripts
   Here are the key NPM scripts defined in the package.json:

npm start: Starts the Electron app in development mode.
npm run rebuild: Rebuilds native modules using electron-rebuild, particularly necessary for tree-sitter.
npm run package: Packages the app for distribution using electron-forge.
npm run make: Builds the app into an installer.
npm run publish: Publishes the app to an online repository.
Electron Integration
The Electron app is configured with the following features:

Preload Script: The app uses a preload script for secure communication between the renderer and the main process.
Content Security Policy: The app enforces a strict content security policy to prevent code injection attacks.
File Analysis: The app listens for file selection and code analysis via IPC communication between the Electron main process and React.

## Code Example (Electron Main Process)

```javascript
const { app, BrowserWindow, session, ipcMain, dialog } = require("electron");
const {
  detectClassesAndFunctions,
  resolveCrossFileDependencies,
} = require("./utils/detector/detector.js");
app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("analyze-directory", async (event, watchingDir, language) => {
    // File analysis logic here...
  });

  ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.filePaths[0];
  });
});
```

## C++ and tree-sitter Integration

In this project, tree-sitter is used to analyze source code for class and function definitions and to resolve cross-file dependencies. Since tree-sitter has native bindings written in C++, we faced some challenges during the build process that required the following steps:

## Steps Taken

Rebuilding tree-sitter: To ensure compatibility with Electron, we had to rebuild tree-sitter using electron-rebuild and configure the build to use C++20.

Setting C++ Flags: Since tree-sitter requires C++20, we had to manually set the environment flag for the build process:

```bash
export CXXFLAGS="--std=c++20"
npx electron-rebuild -f -w tree-sitter
```

Xcode Configuration (macOS): On macOS, we ensured that the Xcode Command Line Tools were installed and up to date to allow for C++ compilation.

These steps ensure that tree-sitter can be properly rebuilt and used within the Electron app to analyze code files.

## Firebase Integration

The app uses Firebase for user authentication. The following Firebase services are used:

Firebase Auth: Handles user sign-in and sign-out functionality.
Firebase Firestore: Can be used to store user data (not implemented in this snippet, but easy to add).
Firebase Configuration Example

```javascript
import { auth } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
  });
  return () => unsubscribe();
}, []);
```

Theming and Styling
Material UI is used to handle the styling of the React components. The app supports both dark and light themes, which can be toggled by the user.

## Dark Mode Example

```javascript
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#0C1826" },
    primary: { main: "#7C64F9" },
    text: { primary: "#ffffff" },
  },
});
```

# Tree-sitter Integration in Electron with Webpack

This document provides a detailed overview of integrating Tree-sitter into an Electron project using Webpack, handling WebAssembly (WASM) files for JavaScript and Python parsers. It includes setup steps, Webpack configuration, Electron Forge modifications, and problem-solving techniques used during the process.

## 1. Project Structure

Make sure the `.wasm` files for Tree-sitter (JavaScript and Python) are stored in the correct directory:

frontend/ ├── .wasm/ │ ├── tree-sitter-javascript.wasm │ └── tree-sitter-python.wasm ├── src/ │ ├── main.js │ └── renderer.js ├── webpack.main.config.js ├── webpack.renderer.config.js ├── forge.config.js └── package.json

## 2. Webpack Configuration for Electron

### Webpack for Handling WebAssembly (WASM) Files

The following Webpack configuration ensures that the `.wasm` files are correctly loaded and used within the Electron app:

```javascript
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path"); // Required for resolving file paths

module.exports = {
  entry: "./src/main.js",

  module: {
    rules: require("./webpack.rules"), // Custom Webpack rules
  },

  // Enable WebAssembly
  experiments: {
    asyncWebAssembly: true,
  },

  plugins: [
    new NodePolyfillPlugin(), // Handle Node.js polyfills
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "../frontend/.wasm"), // Source folder with .wasm files
          to: path.resolve(__dirname, "../frontend/.webpack/main"), // Destination folder in .webpack/main
        },
      ],
    }),
  ],

  externals: {
    "tree-sitter": "commonjs tree-sitter", // Exclude from bundling
  },

  resolve: {
    fallback: {
      fs: false, // Disable fs module for frontend
      path: require.resolve("path-browserify"), // Use path-browserify
    },
  },
};
```

## Handling .wasm Files

The .wasm files are copied from the frontend/.wasm/ directory into the .webpack/main/ folder using the CopyWebpackPlugin. This ensures the WebAssembly files are accessible in the correct location during runtime.

### 3. Electron Forge Configuration

We used Electron Forge with Webpack. In the forge.config.js file, we ensured that .wasm files are unpacked when building the Electron app:

```javascript
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  packagerConfig: {
    asar: true,
    asarUnpack: "**/*.wasm", // Ensure WASM files are not packed in ASAR
  },
  plugins: [
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/index.html",
              js: "./src/renderer.js",
              name: "main_window",
              preload: {
                js: "./src/preload.js",
              },
            },
          ],
        },
        plugins: [
          new NodePolyfillPlugin(), // Polyfill Node.js modules
        ],
        resolve: {
          fallback: {
            fs: false, // Disable fs
            path: require.resolve("path-browserify"), // Use path-browserify
          },
        },
      },
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
```

### 4. Tree-sitter Parser Initialization

We faced issues initializing the Tree-sitter parsers, particularly regarding loading the language-specific .wasm files. The following function successfully initializes the parsers for JavaScript and Python:

```javascript
import Parser from "web-tree-sitter";
import { join } from "path"; // Required for path resolution

let parsers = {}; // To store initialized parsers

// Initialize the parsers for JavaScript and Python
export async function initializeParser() {
  await Parser.init(); // Initialize WebAssembly for Tree-sitter

  const parser = new Parser();

  // Load WebAssembly files for JavaScript and Python
  const JavaScript = await Parser.Language.load(
    join(__dirname, "../../.wasm/tree-sitter-javascript.wasm")
  );
  const Python = await Parser.Language.load(
    join(__dirname, "../../.wasm/tree-sitter-python.wasm")
  );

  // Set the language for the parser
  parser.setLanguage(JavaScript); // Set to JavaScript by default

  // Return parser configurations
  parsers = {
    main: parser,
    javascript: JavaScript,
    python: Python,
  };

  return parsers;
}
```

### Key Takeaways

- Tree-sitter Language Loading: The correct way to load a language is by calling Parser.Language.load() directly on the Parser class. Ensure you're not using an instance of parser to call load().
- Setting Language: After loading a language, it must be explicitly set for the parser using parser.setLanguage().

### 5. Debugging Common Issues

TypeError: Cannot Read Property 'load' of Undefined
This error occurred because we mistakenly called parser.Language.load(). The correct approach is to call Parser.Language.load() directly.

Missing tree-sitter.wasm
If the tree-sitter.wasm file is missing, install the web-tree-sitter package and copy the file manually from node_modules/web-tree-sitter to your .wasm directory.

```bash
cp node_modules/web-tree-sitter/tree-sitter.wasm .wasm/tree-sitter.wasm
```

### 6. Running the Application

To clean and rebuild the project after changes:

```bash
rm -rf .webpack
npm run make  # Or the equivalent command in your setup\
```

### 7. Conclusion

This setup allows you to integrate Tree-sitter into an Electron application with Webpack, handle .wasm files for language parsers like JavaScript and Python, and avoid common pitfalls. Ensure that the WebAssembly files are correctly copied and loaded, and adjust the paths based on your project structure.

## License
