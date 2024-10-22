import { app, BrowserWindow, session, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import Store from 'electron-store';
import dotenv from 'dotenv';
import { analyzeDirectory, initializeParser } from '../src/utils/detector/detector.js';
import { transformToReactFlowData } from '../src/utils/transformToReactFlowData.js';
import { spawn } from 'child_process';
import getPort from 'get-port';
import { URL } from 'url';
import * as http from 'http';
import * as https from 'https';

// Load environment variables from .env file (optional)
dotenv.config();

// **Updated: Read the USE_SERVER_EXECUTABLE flag from .env (case-insensitive)**
// const USE_SERVER_EXECUTABLE = (process.env.USE_SERVER_EXECUTABLE || '').toLowerCase() === 'true';
const USE_SERVER_EXECUTABLE = true;

console.log(`USE_SERVER_EXECUTABLE is set to: ${USE_SERVER_EXECUTABLE}`);

// Function to find an available port starting from a default
const findAvailablePort = async (defaultPort) => {
  try {
    // Manually create an array of ports from defaultPort to defaultPort + 1000
    const portRange = Array.from({ length: 1001 }, (_, i) => defaultPort + i);
    const port = await getPort({ port: portRange });
    return port;
  } catch (error) {
    console.error(`Error finding available port starting from ${defaultPort}:`, error);
    throw error;
  }
};

let serverProcess = null;
let allowedBaseDir = null;
const squirrelStartup = false;

// References to windows
let splashWindow = null;
let mainWindow = null;

// Function to get server executable path
const getServerExecutablePath = () => {
  if (!app.isPackaged) {
    // In development, use the local path
    return path.join(__dirname, 'backend/server/server');
  } else {
    // In production, adjust the path
    // __dirname points to the resources/app directory when packaged
    return path.join(process.resourcesPath, 'server');
  }
};

const SERVER_EXECUTABLE_PATH = getServerExecutablePath();

console.log(`Server executable path: ${SERVER_EXECUTABLE_PATH}`);

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
      preload: path.join(__dirname, '../../src/preload_splash.js'), // Use a separate preload script for splash window
      devTools: !app.isPackaged, // Enable DevTools only in development
    },
  });

  if (!app.isPackaged) {
    splashWindow.webContents.openDevTools(); // Open DevTools for debugging in development
  }

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
          `connect-src 'self' http://127.0.0.1:${global.SERVER_PORT} http://127.0.0.1:${global.OLLAMA_PORT} ` +
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

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools(); // Open DevTools in development
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Function to start the server executable
const startServerExecutable = (SERVER_PORT, OLLAMA_PORT) => {
  console.log('Starting server executable...');
  const logPath = path.join(app.getPath('logs'), 'app.log');

  // Function to log messages
  function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    fs.appendFileSync(logPath, logMessage);
  }

  // Use it like this:
  log('Application started');
  log(`Server path: ${SERVER_EXECUTABLE_PATH}`);

  // Check if the server executable exists
  if (!fs.existsSync(SERVER_EXECUTABLE_PATH)) {
    const errorMsg = `Server executable not found at ${SERVER_EXECUTABLE_PATH}`;
    log(errorMsg);
    dialog.showErrorBox('Server Start Error', errorMsg);
    // Instead of quitting, allow the developer to choose to proceed without the executable
    // Optionally, you can prompt the developer here
    return;
  }

  // Ensure the server executable has execute permissions (only necessary on Unix-like systems)
  fsPromises.access(SERVER_EXECUTABLE_PATH, fs.constants.X_OK)
    .then(() => {
      serverProcess = spawn(
        SERVER_EXECUTABLE_PATH,
        ['--server-port', SERVER_PORT.toString(), '--ollama-port', OLLAMA_PORT.toString()],
        {
          cwd: path.dirname(SERVER_EXECUTABLE_PATH),
          env: {
            ...process.env,
          },
          shell: false,
        }
      );

      serverProcess.stdout.on('data', (data) => {
        const message = `Server stdout: ${data}`;
        console.log(message);
        log(message);
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('server-log', data.toString());
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const message = `Server stderr: ${data}`;
        console.error(message);
        log(message);
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('server-log', data.toString());
        }
      });

      serverProcess.on('close', (code) => {
        const message = `Server executable exited with code ${code}`;
        console.log(message);
        log(message);
        if (code !== 0) {
          dialog.showErrorBox('Server Error', `Server exited with code ${code}`);
          app.quit();
        }
      });

      serverProcess.on('error', (err) => {
        const message = `Failed to start server executable: ${err.message}`;
        console.error(message);
        log(message);
        dialog.showErrorBox('Server Start Error', message);
        app.quit();
      });
    })
    .catch((err) => {
      const message = `Server executable is not accessible or lacks execute permissions: ${err.message}`;
      console.error(message);
      log(message);
      dialog.showErrorBox('Server Start Error', message);
      app.quit();
    });
};

// Function to gracefully shut down the server executable
const gracefulShutdown = () => {
  if (serverProcess) {
    console.log('Terminating server executable...');
    serverProcess.kill('SIGTERM');
  }
};

// Updated waitForServer function using http and https modules
const waitForServer = async (url, timeout = 60000) => { // 1 minute timeout
  const startTime = Date.now();
  const parsedUrl = new URL(url);
  const protocol = parsedUrl.protocol === 'https:' ? https : http;
  while (Date.now() - startTime < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = protocol.get(url, (res) => {
          res.on('data', () => { }); // Consume data to allow 'end' event to be emitted
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
              resolve();
            } else {
              reject(new Error(`Status code ${res.statusCode}`));
            }
          });
        });
        req.on('error', (err) => {
          reject(err);
        });
      });
      console.log(`Server at ${url} is up and running.`);
      return true;
    } catch (error) {
      // Server not ready yet
      const errorMsg = `Error connecting to ${url}: ${error.message}`;
      console.error(errorMsg);
      // Log to splash window
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('server-log', `Waiting for server: ${error.message}`);
      }

      // Check if the server process has exited
      if (serverProcess && serverProcess.exitCode !== null) {
        const exitMessage = `Server process exited with code ${serverProcess.exitCode}`;
        console.error(exitMessage);
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('server-log', exitMessage);
        }
        throw new Error(exitMessage);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const finalErrorMsg = `Server at ${url} did not start within the expected time.`;
  console.error(finalErrorMsg);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('server-log', finalErrorMsg);
  }
  throw new Error(finalErrorMsg);
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  app.quit();
}

// Register IPC handlers after the app is ready
const registerIpcHandlers = () => {
  ipcMain.handle('get-ports', async () => {
    return {
      OLLAMA_PORT: global.OLLAMA_PORT,
      SERVER_PORT: global.SERVER_PORT,
    };
  });

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
      (config) => config.content.project_id !== projectId // Adjust based on actual data structure
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

      await fsPromises.writeFile(resolvedPath, content, 'utf-8');
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

      const content = await fsPromises.readFile(resolvedPath, 'utf-8');
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

  let storeInstance;
  try {
    const encryptionKey = process.env.ELECTRON_STORE_ENCRYPTION_KEY || 'default_encryption_key';
    if (!encryptionKey) {
      throw new Error('Missing ELECTRON_STORE_ENCRYPTION_KEY');
    }

    storeInstance = new Store({
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
    storeInstance = new Store({
      name: 'FirebaseConfigManager',
      schema,
      // Remove encryptionKey or set a default one (not recommended for sensitive data)
      defaults: {
        serviceAccounts: [],
        pastCollections: [],
      },
    });
  }
  return storeInstance;
};

const store = initializeStore();

// App ready event
app.whenReady().then(async () => {
  // Create and show the splash window
  createSplashWindow();

  // Register IPC handlers
  registerIpcHandlers();

  // **Initialize ports based on USE_SERVER_EXECUTABLE flag**
  let OLLAMA_PORT, SERVER_PORT;

  if (USE_SERVER_EXECUTABLE) {
    // **When using the server executable:**
    try {
      OLLAMA_PORT = await findAvailablePort(11434);
      SERVER_PORT = await findAvailablePort(8001);
    } catch (error) {
      console.error('Failed to find available ports:', error);
      dialog.showErrorBox('Port Allocation Error', `Failed to find available ports: ${error.message}`);
      app.quit();
      return;
    }

    // Store the ports in global variables
    global.OLLAMA_PORT = OLLAMA_PORT;
    global.SERVER_PORT = SERVER_PORT;

    // Start the server executable, passing the ports as arguments
    startServerExecutable(SERVER_PORT, OLLAMA_PORT);
  } else {
    // **When connecting to an external server:**
    // **Read ports from .env file or set defaults**
    OLLAMA_PORT = parseInt(process.env.OLLAMA_PORT, 10) || 11434;
    SERVER_PORT = parseInt(process.env.SERVER_PORT, 10) || 8001;

    // Store the ports in global variables
    global.OLLAMA_PORT = OLLAMA_PORT;
    global.SERVER_PORT = SERVER_PORT;
  }

  // **Wait for the server to be ready:**
  try {
    console.log('Waiting for server to be ready on port', SERVER_PORT);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('server-log', `Waiting for server on port ${SERVER_PORT}`);
    }

    // **Construct the server URL based on the USE_SERVER_EXECUTABLE flag**
    const serverURL = `http://127.0.0.1:${SERVER_PORT}/`;

    await waitForServer(serverURL);

    // Once the server is ready, create the main window
    createMainWindow();

    // Close the splash window
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }

    // Send the port information to the renderer process
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('ports-ready', {
        OLLAMA_PORT,
        SERVER_PORT,
      });
    });
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

// Gracefully shut down the server executable when Electron app quits
app.on('before-quit', gracefulShutdown);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
