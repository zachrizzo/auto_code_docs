// main.js

const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { analyzeDirectory, initializeParser } = require('./utils/detector/detector.js');
const { transformToReactFlowData } = require('./utils/transformToReactFlowData.js');
const electronReload = require('electron-reload');
const rootPath = path.resolve(__dirname, '../../..');
const { insertCode } = require('./utils/codeInserter.js');
let allowedBaseDir = ''; // Store the selected directory dynamically


electronReload(rootPath, {
  // Don't specify the electron path here
  hardResetMethod: 'exit'
});

console.log('Main process started', __dirname, path.resolve(__dirname, '../'), __filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
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
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:3000; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:3000 http://127.0.0.1:8000 https://identitytoolkit.googleapis.com https://*.firebaseio.com https://www.googleapis.com"
        ]
      }
    });
  });

  // Load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('initialize-parser', async () => {
    try {
      await initializeParser();
      return { success: true };
    } catch (error) {
      console.error('Error initializing parser:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analyze-directory', async (event, watchingDir, includeAnonymousFunctions) => {
    console.log('Main: analyze-directory invoked', { watchingDir });
    try {
      const results = await analyzeDirectory(watchingDir, includeAnonymousFunctions);
      const elkResults = await transformToReactFlowData(results);

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

  // Add the 'get-file-content' handler
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
        throw new Error('Access to the specified file is not allowed.', allowedBaseDir, resolvedPath);
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      console.error('Error reading file content:', error);
      return { success: false, error: error.message };
    }
  });


  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
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
