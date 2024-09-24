// main.mjs

import { app, BrowserWindow, session, ipcMain, dialog } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import dotenv from 'dotenv';
import { analyzeDirectory, initializeParser, insertCode } from '../src/utils/detector/detector.js';
import { transformToReactFlowData } from '../src/utils/transformToReactFlowData.js';

// Load environment variables from .env file (optional)
dotenv.config();

// Recreate __filename and __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a CommonJS `require` function for importing CommonJS modules
const require = createRequire(import.meta.url);

// Import CommonJS modules
const electronReload = require('electron-reload');
const squirrelStartup = require('electron-squirrel-startup');

// Define root path for electron-reload
const rootPath = path.resolve(__dirname, '../../..');
let allowedBaseDir = ''; // Store the selected directory dynamically

// Define JSON schema for validation
const schema = {
  firebaseConfigs: {
    type: 'array',
    items: {
      type: 'object', // Keep it as an object
      additionalProperties: true, // Allow any properties
      properties: {
        projectId: { type: 'string' }, // These fields are no longer required
        apiKey: { type: 'string' },
        authDomain: { type: 'string' },
        // You can add more optional properties here
      },
    },
  },
};


// Initialize electron-store with schema and encryption (optional)
const store = new Store({
  name: 'FirebaseConfigManager',
  schema,
  encryptionKey: process.env.ELECTRON_STORE_ENCRYPTION_KEY, // Ensure this is set securely
  defaults: {
    serviceAccounts: [],
    pastCollections: [],
  },
});

// Initialize electron-reload for development (optional)
electronReload(rootPath, {
  // Don't specify the electron path here
  hardResetMethod: 'exit',
});

console.log(
  'Main process started',
  __dirname,
  path.resolve(__dirname, '../'),
  __filename
);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,  // Enable context isolation for security
      nodeIntegration: false,  // Ensure nodeIntegration is disabled for security
    },
  });

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "connect-src 'self' http://127.0.0.1:8000 " +
          'https://*.firebaseio.com ' +
          'https://*.googleapis.com ' +
          'https://*.gstatic.com ' +
          'https://identitytoolkit.googleapis.com ' +
          'https://securetoken.googleapis.com ' +
          'https://firestore.googleapis.com ' +
          'wss://*.firebaseio.com ' +
          'https://us-central1-auto-code-documentation.cloudfunctions.net;', // Add your Firebase Cloud Functions domain
        ],
      },
    });
  });

  // Load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Handle unhandled promise rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  // IPC handler to get service accounts
  ipcMain.handle('get-service-accounts', async () => {
    return store.get('serviceAccounts');
  });

  // IPC handler to save service accounts
  ipcMain.handle('save-service-accounts', async (event, configs) => {
    store.set('serviceAccounts', configs);
    // Notify renderer processes that service accounts have changed
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('service-accounts-changed', configs);
    });
  });

  ipcMain.handle('get-configs', async () => {
    // Return the configs stored in electron-store
    return store.get('firebaseConfigs', []);
  });

  ipcMain.handle('save-configs', async (event, configs) => {
    // Save the configs to electron-store
    store.set('firebaseConfigs', configs);
    // Notify renderer processes that configs have changed
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('configs-changed', configs);
    });

  });



  // IPC handler to delete a specific service account
  ipcMain.handle('delete-service-account', async (event, projectId) => {
    const configs = store.get('serviceAccounts') || [];
    const updatedConfigs = configs.filter(
      (config) => config.content.project_id !== projectId
    );
    store.set('serviceAccounts', updatedConfigs);
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('service-accounts-changed', updatedConfigs);
    });
  });

  // IPC handler for past collections
  ipcMain.handle('get-past-collections', async () => {
    return store.get('pastCollections', []);
  });

  ipcMain.handle('save-past-collections', async (event, collections) => {
    store.set('pastCollections', collections);
  });

  // IPC handler for selecting a directory
  ipcMain.handle('initialize-parser', async () => {
    try {
      await initializeParser();
      return { success: true };
    } catch (error) {
      console.error('Error initializing parser:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analyze-directory', async (event, watchingDir, includeAnonymousFunctions, maxNodes, maxEdges, nodeDependencyDirection) => {
    console.log('Main: analyze-directory invoked', { watchingDir });
    try {
      const results = await analyzeDirectory(watchingDir, includeAnonymousFunctions);
      const elkResults = await transformToReactFlowData(results, maxNodes, maxEdges, nodeDependencyDirection);

      allowedBaseDir = watchingDir; // Update allowedBaseDir

      const serializedResults = JSON.stringify(results);
      const serializedElkResults = JSON.stringify(elkResults);

      return {
        analysisResults: serializedResults,
        graphData: serializedElkResults
      };
    } catch (error) {
      console.error('Error in analyze-directory handler:', error);
      throw error;
    }
  });


  ipcMain.handle('insert-code', async (event, { filePath, declarationInfo, newCode }) => {
    try {
      await insertCode(filePath, declarationInfo, newCode);
      return { success: true };
    } catch (error) {
      console.error('Error inserting code:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-file', async (event, { filePath, content }) => {
    console.log('Main: save-file invoked', { filePath, content }); // Debugging log
    try {
      if (!filePath || typeof content !== 'string') {
        throw new TypeError('Invalid arguments: filePath and content are required.');
      }

      // Optional: Implement security checks to restrict file paths
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(allowedBaseDir)) {
        throw new Error('Access to the specified file is not allowed.', allowedBaseDir);
      }

      await fs.writeFile(resolvedPath, content, 'utf-8');
      console.log(`File saved successfully at ${resolvedPath}`); // Confirmation log
      return { success: true };
    } catch (error) {
      console.error('Error saving file:', error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled) {
      return null;
    } else {
      return result.filePaths[0];
    }
  });

  // IPC handler for getting file content
  ipcMain.handle('get-file-content', async (event, filePath) => {
    console.log('Main: get-file-content invoked', { filePath }); // Debugging log
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new TypeError('Invalid argument: filePath must be a string.');
      }

      // Resolve the absolute path of the file to ensure it's within the allowed directory
      const resolvedPath = path.resolve(filePath);

      // Security check: ensure that the file is within an allowed directory
      if (!resolvedPath.startsWith(allowedBaseDir)) {
        throw new Error('Access to the specified file is not allowed.');
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      console.error('Error reading file content:', error);
      return { success: false, error: error.message };
    }
  });

  // On macOS, recreate a window when the dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
