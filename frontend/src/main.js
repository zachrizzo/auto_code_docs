import { app, BrowserWindow, session, ipcMain, dialog } from 'electron';

import path from 'node:path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import dotenv from 'dotenv';
import { analyzeDirectory, initializeParser, insertCode } from '../src/utils/detector/detector.js';
import { transformToReactFlowData } from '../src/utils/transformToReactFlowData.js';
import { spawn } from 'child_process'; // Import spawn


// Load environment variables from .env file (optional)
dotenv.config();
const OLLAMA_PORT = 11434; // Ensure this matches Ollama's port
const SERVER_PORT = 8001



const SERVER_SCRIPT_PATH = path.join(__dirname, 'backend/server/server');  // Adjust path if necessary
let pythonProcess = null;

const startPythonServer = () => {
  console.log('Starting Python server at ...', SERVER_SCRIPT_PATH);
  pythonProcess = spawn(SERVER_SCRIPT_PATH, [], {
    cwd: path.dirname(SERVER_SCRIPT_PATH),
    env: {
      ...process.env,
    },
    shell: false,
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python stdout: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python server exited with code ${code}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python server:', err);
  });
};


// Function to gracefully shut down the Python server
const gracefulShutdown = () => {
  if (pythonProcess) {
    console.log('Terminating Python server...');
    pythonProcess.kill('SIGTERM');
  }
};

// Optional: Wait for the server to be ready
const waitForServer = async (url, timeout = 50000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('Python FastAPI server is up and running.');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Python FastAPI server did not start within the expected time.');
};


// Conditionally load `electron-reload` only during development
if (process.env.NODE_ENV === 'development') {
  import('electron-reload').then((electronReload) => {
    const rootPath = path.resolve(__dirname, '../../..');
    electronReload.default(rootPath, {
      hardResetMethod: 'exit',
    });
  });
}

// Replace require('electron-squirrel-startup') with dynamic import
let squirrelStartup = false;
let allowedBaseDir = ''; // Initialize allowedBaseDir


// Define JSON schema for validation
const schema = {
  firebaseConfigs: {
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: true,
      properties: {
        projectId: { type: 'string' },
        apiKey: { type: 'string' },
        authDomain: { type: 'string' },
      },
    },
  },
};

console.log('Loading URL:', path.join(__dirname, './index.html'));


// Initialize electron-store with schema and encryption (optional)
let store;
try {
  store = new Store({
    name: 'FirebaseConfigManager',
    schema,
    encryptionKey: process.env.ELECTRON_STORE_ENCRYPTION_KEY,
    defaults: {
      serviceAccounts: [],
      pastCollections: [],
      firebaseConfigs: [],
    },
  });
  console.log('Store initialized successfully');
} catch (error) {
  console.error('Error initializing store:', error);
  // Optionally, reset the store or notify the user
  store = new Store({
    name: 'FirebaseConfigManager',
    schema,
    encryptionKey: process.env.ELECTRON_STORE_ENCRYPTION_KEY,
    defaults: {
      serviceAccounts: [],
      pastCollections: [],
      firebaseConfigs: [],
    },
  });
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'Fractal X',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,  // Enable context isolation for security
      nodeIntegration: false,  // Ensure nodeIntegration is disabled for security
    },
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "connect-src 'self' http://127.0.0.1:8000 " +
          "connect-src 'self' http://127.0.0.1:8001 " +
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


  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Start the Python FastAPI server
  startPythonServer();

  // Optionally, wait for the server to be ready
  try {
    await waitForServer(`http://127.0.0.1:${OLLAMA_PORT}/`);
  } catch (error) {
    console.error(error);
    app.quit();
    return;
  }

  createWindow();

  // On OS X it's common to re-create a window in the app when the
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
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Gracefully shut down the Python server when Electron app quits
app.on('before-quit', gracefulShutdown);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
