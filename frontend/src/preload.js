// preload.mjs

import { contextBridge, ipcRenderer } from 'electron';
const fs = require('fs');
const path = require('path');


contextBridge.exposeInMainWorld('electronAPI', {
    getConfigs: () => ipcRenderer.invoke('get-configs'),
    saveConfigs: (configs) => ipcRenderer.invoke('save-configs', configs),
    getPastCollections: () => ipcRenderer.invoke('get-past-collections'),
    savePastCollections: (collections) => ipcRenderer.invoke('save-past-collections', collections),
    deleteConfig: (projectId) => ipcRenderer.invoke('delete-config', projectId),
    onConfigsChanged: (callback) =>
        ipcRenderer.on('configs-changed', (event, configs) => callback(configs)),
    removeConfigsChangedListener: (callback) =>
        ipcRenderer.removeListener('configs-changed', callback),
    deleteServiceAccount: (projectId) => ipcRenderer.invoke('delete-service-account', projectId),

    getServiceAccounts: () => ipcRenderer.invoke('get-configs'),
    saveServiceAccounts: (configs) => ipcRenderer.invoke('save-configs', configs),

    // New function for listening to 'configs-changed' event
    onServiceAccountsChanged: (callback) => ipcRenderer.on('configs-changed', callback),

    // Add this new method
    initializeParser: () => ipcRenderer.invoke('initialize-parser'),

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

});
