// app/frontend/src/preload.mjs

import { contextBridge, ipcRenderer } from 'electron';

let ports = null;

// Listen for 'ports-ready' event from main process
ipcRenderer.on('ports-ready', (event, receivedPorts) => {
    ports = receivedPorts;
});

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Service Accounts
    getServiceAccounts: () => ipcRenderer.invoke('get-service-accounts'),
    saveServiceAccounts: (configs) => ipcRenderer.invoke('save-service-accounts', configs),
    deleteServiceAccount: (projectId) => ipcRenderer.invoke('delete-service-account', projectId),

    // Past Collections
    getPastCollections: () => ipcRenderer.invoke('get-past-collections'),
    savePastCollections: (collections) => ipcRenderer.invoke('save-past-collections', collections),

    // Directory Operations
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    getFileContent: (filePath) => ipcRenderer.invoke('get-file-content', filePath),
    saveFile: ({ filePath, content }) => ipcRenderer.invoke('save-file', { filePath, content }),
    saveDirectory: (directory) => ipcRenderer.invoke('save-directory', directory),
    getSavedDirectory: () => ipcRenderer.invoke('get-saved-directory'),
    saveAnalysis: (results) => ipcRenderer.invoke('save-analysis', results),
    getSavedAnalysis: () => ipcRenderer.invoke('get-saved-analysis'),

    // Listen to Service Accounts Changes
    onServiceAccountsChanged: (callback) => ipcRenderer.on('configs-changed', callback),

    // Initialize Parser
    initializeParser: () => ipcRenderer.invoke('initialize-parser'),

    // File System Operations (Use with caution)
    readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
    listFiles: (dirPath) => fs.readdirSync(dirPath),
    getFileStats: (filePath) => fs.statSync(filePath),
    joinPath: (...args) => path.join(...args),
    existsSync: (filePath) => fs.existsSync(filePath),

    // Expose IPC Renderer Methods
    ipcRenderer: {
        on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
        once: (channel, func) => ipcRenderer.once(channel, (event, ...args) => func(...args)),
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        removeListener: (channel, func) => ipcRenderer.removeListener(channel, func),
        removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
    },

    // Expose Ports Information via a Function
    getPorts: () => ports
});
