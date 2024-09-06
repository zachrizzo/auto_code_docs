const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
// const path = require('node:path');

const path = require('path');
const fs = require('fs').promises;
const { detectClassesAndFunctions, resolveCrossFileDependencies } = require('./utils/detector/detector.js');


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}



const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:3000; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:3000 https://identitytoolkit.googleapis.com https://*.firebaseio.com https://www.googleapis.com"
        ]
      }
    });
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};







// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();


  console.log('Main: Setting up analyze-directory handler');
  ipcMain.handle('analyze-directory', async (event, watchingDir, language) => {
    console.log('Main: analyze-directory invoked', { watchingDir, language });
    let aggregatedResults = {};

    console.log('Analyzing')

    const analyzeFile = async (filePath) => {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath);

      const analysisResults = await detectClassesAndFunctions(fileContent, filePath, fileExtension, watchingDir);

      console.log(`Analysis results for ${filePath}:`, analysisResults);

      aggregatedResults[filePath] = analysisResults;
    };

    const walkDirectory = async (dir) => {
      const files = await fs.readdir(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);

        console.log('stat', stat)

        if (stat.isDirectory()) {
          await walkDirectory(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.jsx')) {
          await analyzeFile(filePath);
        }
      }
    };



    await walkDirectory(watchingDir);

    console.log("Aggregated Results Before Dependency Resolution:", aggregatedResults);

    const resolvedResults = resolveCrossFileDependencies(aggregatedResults);

    console.log("Aggregated Results After Dependency Resolution:", resolvedResults);

    return resolvedResults;
  });



  // Add this new handler
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



  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

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
