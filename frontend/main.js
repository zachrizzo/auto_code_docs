const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const chokidar = require('chokidar');
const fs = require('fs');

let mainWindow;  // Define mainWindow at the top level

app.commandLine.appendSwitch('remote-debugging-port', '9222');

async function createWindow() {
    const isDev = (await import('electron-is-dev')).default;

    mainWindow = new BrowserWindow({
        width: 1500,
        height: 1000,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // mainWindow.webContents.openDevTools();
    // mainWindow.loadURL('http://localhost:3001');



    mainWindow.loadURL(
        isDev
            ? 'http://localhost:3001'
            : `file://${path.join(__dirname, './index.html')}`
    );

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }


    // mainWindow.webContents.on('did-fail-load', () => {
    //     mainWindow.loadURL('http://localhost:3001');
    // });

    // mainWindow.webContents.on('crashed', (event) => {
    //     console.error('Renderer process crashed:', event);
    // });

    // process.on('uncaughtException', (error) => {
    //     console.error('Uncaught exception:', error);
    // });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const selectedDir = result.filePaths[0];

        // Watch the selected directory
        const watcher = chokidar.watch(selectedDir, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });

        watcher.on('change', (filePath) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading file:', err);
                    return;
                }

                // Ensure that mainWindow and its webContents are available
                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.send('file-changed', { filePath, content: data });
                } else {
                    console.error('mainWindow or webContents is not available.');
                }
            });
        });

        return selectedDir;
    }

    return null;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


