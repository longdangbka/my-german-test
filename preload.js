const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Theme management
  toggleTheme: () => ipcRenderer.invoke('dark-mode:toggle'),
  getTheme: () => ipcRenderer.invoke('dark-mode:get'),
  
  // Vault file access
  readVaultFile: (filename) => ipcRenderer.invoke('vault:read-file', filename),
  readVaultImage: (filename) => ipcRenderer.invoke('vault:read-image', filename),
  listVaultFiles: () => ipcRenderer.invoke('vault:list-files'),
  
  // Platform information
  platform: process.platform,
  
  // App information
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  
  // Future expansion for other IPC communications
  send: (channel, data) => {
    // Whitelist channels for security
    const validChannels = ['app-ready', 'window-resize'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  receive: (channel, func) => {
    const validChannels = ['theme-changed', 'app-update'];
    if (validChannels.includes(channel)) {
      // Remove all listeners for security
      ipcRenderer.removeAllListeners(channel);
      // Add the new listener
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});

// Security: Remove dangerous globals in renderer process
delete window.require;
delete window.exports;
delete window.module;
