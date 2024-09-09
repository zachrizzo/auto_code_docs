// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


// preload.js
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
    readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
    listFiles: (dirPath) => fs.readdirSync(dirPath),
    getFileStats: (filePath) => fs.statSync(filePath),
    joinPath: (...args) => path.join(...args),
    existsSync: (filePath) => fs.existsSync(filePath),

    ipcRenderer: {
        on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
        once: (channel, func) => ipcRenderer.once(channel, (event, ...args) => func(...args)),
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        removeListener: (channel, func) => ipcRenderer.removeListener(channel, func),
        removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
    },

    // Add this new method
    initializeParser: () => ipcRenderer.invoke('initialize-parser')
});
