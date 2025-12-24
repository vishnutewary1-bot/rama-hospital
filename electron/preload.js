const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  auth: {
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
    setSession: (session) => ipcRenderer.invoke('auth:setSession', session)
  },

  // Database operations
  db: {
    query: (sql, params) => ipcRenderer.invoke('db:query', { sql, params }),
    get: (sql, params) => ipcRenderer.invoke('db:get', { sql, params }),
    run: (sql, params) => ipcRenderer.invoke('db:run', { sql, params }),
    transaction: (queries) => ipcRenderer.invoke('db:transaction', { queries })
  },

  // Backup & Restore
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (path) => ipcRenderer.invoke('backup:restore', path),
    list: () => ipcRenderer.invoke('backup:list'),
    selectFile: () => ipcRenderer.invoke('backup:selectFile'),
    export: () => ipcRenderer.invoke('backup:export')
  },

  // Utilities
  util: {
    generateUUID: () => ipcRenderer.invoke('util:generateUUID'),
    hashPassword: (password) => ipcRenderer.invoke('util:hashPassword', password),
    getAppInfo: () => ipcRenderer.invoke('util:getAppInfo')
  },

  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  }
});
