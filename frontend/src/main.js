// main.js

import { app, BrowserWindow, session, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { promises as fs } from 'fs';
import Store from 'electron-store';
import dotenv from 'dotenv';
import { analyzeDirectory, initializeParser, insertCode } from '../src/utils/detector/detector.js';
import { transformToReactFlowData } from '../src/utils/transformToReactFlowData.js';
import { spawn } from 'child_process';

// Load environment variables from .env file (optional)
dotenv.config()
const OLLAMA_PORT = 11434; // Ensure this matches Ollama's port
const SERVER_PORT = 8001;

console.log('Encryption Key:', process.env.ELECTRON_STORE_ENCRYPTION_KEY);

const SERVER_SCRIPT_PATH = path.join(__dirname, 'backend/server/server');  // Adjust path if necessary
let pythonProcess = null;
let allowedBaseDir = null;
const squirrelStartup = false;

// References to windows
let splashWindow = null;
let mainWindow = null;

// Function to create the splash window
const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    frame: false, // Remove window frame for a cleaner splash screen
    alwaysOnTop: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.webContents.openDevTools(); // Open DevTools for debugging (remove in production)

  // Load the splash.html file
  splashWindow.loadFile(path.join(__dirname, './static/splash.html'));
};

// Function to create the main application window
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
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
          "http://127.0.0.1:8001 " +
          'https://*.firebaseio.com ' +
          'https://*.googleapis.com ' +
          'https://*.gstatic.com ' +
          'https://identitytoolkit.googleapis.com ' +
          'https://securetoken.googleapis.com ' +
          'https://firestore.googleapis.com ' +
          'wss://*.firebaseio.com ' +
          'https://us-central1-auto-code-documentation.cloudfunctions.net;',
        ],
      },
    });
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools (remove in production)
  mainWindow.webContents.openDevTools();

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Function to start the Python server
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
        console.log(`Server at ${url} is up and running.`);
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${url} did not start within the expected time.`);
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  app.quit();
}

// Register IPC handlers after the app is ready
const registerIpcHandlers = () => {
  // IPC Handlers for Service Accounts
  ipcMain.handle('get-service-accounts', async () => {
    return store.get('serviceAccounts');
  });

  ipcMain.handle('save-service-accounts', async (event, configs) => {
    store.set('serviceAccounts', configs);
    // Notify renderer processes that service accounts have changed
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('service-accounts-changed', configs);
    });
  });

  ipcMain.handle('delete-service-account', async (event, projectId) => {
    console.log(`Attempting to delete service account with projectId: ${projectId}`);
    const configs = store.get('serviceAccounts') || [];
    console.log('Current Service Accounts:', configs);
    const updatedConfigs = configs.filter(
      (config) => config.content.project_id !== projectId // or config.content.projectId
    );
    console.log('Updated Service Accounts:', updatedConfigs);
    store.set('serviceAccounts', updatedConfigs);
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('service-accounts-changed', updatedConfigs);
    });
  });

  // IPC Handlers for Past Collections
  ipcMain.handle('get-past-collections', async () => {
    return store.get('pastCollections', []);
  });

  ipcMain.handle('save-past-collections', async (event, collections) => {
    store.set('pastCollections', collections);
  });

  // **Initialize Parser IPC Handler**
  console.log('Registering initialize-parser handler');
  ipcMain.handle('initialize-parser', async () => {
    try {
      console.log('initialize-parser invoked');
      await initializeParser();
      console.log('Parser initialized successfully');
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

  // ipcMain.handle('insert-code', async (event, { filePath, declarationInfo, newCode }) => {
  //   try {
  //     await insertCode(filePath, declarationInfo, newCode);
  //     return { success: true };
  //   } catch (error) {
  //     console.error('Error inserting code:', error);
  //     return { success: false, error: error.message };
  //   }
  // });

  ipcMain.handle('save-file', async (event, { filePath, content }) => {
    console.log('Main: save-file invoked', { filePath, content }); // Debugging log
    try {
      if (!filePath || typeof content !== 'string') {
        throw new TypeError('Invalid arguments: filePath and content are required.');
      }

      // Optional: Implement security checks to restrict file paths
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(allowedBaseDir)) {
        throw new Error('Access to the specified file is not allowed.');
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
};

// Initialize electron-store with schema and encryption (optional)
const initializeStore = () => {
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

  let store;
  try {
    const encryptionKey = process.env.ELECTRON_STORE_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Missing ELECTRON_STORE_ENCRYPTION_KEY');
    }

    store = new Store({
      name: 'FirebaseConfigManager',
      schema,
      encryptionKey,
      defaults: {
        serviceAccounts: [],
        pastCollections: [],
      },
    });
    console.log('Store initialized successfully');
  } catch (error) {
    console.error('Error initializing store:', error);
    // Optionally, reinitialize store without encryption or alert the user
    store = new Store({
      name: 'FirebaseConfigManager',
      schema,
      // Remove encryptionKey or set a default one (not recommended for sensitive data)
      defaults: {
        serviceAccounts: [],
        pastCollections: [],
      },
    });
  }
  return store;
};

const store = initializeStore();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  app.quit();
}

// App ready event
app.whenReady().then(async () => {
  // Create and show the splash window
  createSplashWindow();

  // Register IPC handlers
  registerIpcHandlers();

  // Start the Python FastAPI server
  startPythonServer();

  // Optionally, wait for the server to be ready
  try {
    await waitForServer(`http://127.0.0.1:${SERVER_PORT}/`);
    await waitForServer(`http://127.0.0.1:${OLLAMA_PORT}/`);

    // Once the server is ready, create the main window
    createMainWindow();

    // Close the splash window
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
  } catch (error) {
    console.error(error);
    // Show an error dialog to the user
    dialog.showErrorBox('Server Initialization Failed', error.message);
    // Quit the application
    app.quit();
    return;
  }


  // Re-create a window in the app when the dock icon is clicked (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Gracefully shut down the Python server when Electron app quits
app.on('before-quit', gracefulShutdown);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
