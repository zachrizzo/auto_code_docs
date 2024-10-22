// app/frontend/src/preload_splash.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onServerLog: (callback) => ipcRenderer.on('server-log', (event, data) => callback(data)),
});
