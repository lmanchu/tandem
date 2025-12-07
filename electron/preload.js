const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tandemElectron', {
  // Server management
  startServer: () => ipcRenderer.invoke('start-server'),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  setServerConfig: (config) => ipcRenderer.invoke('set-server-config', config),
  selectDataDirectory: () => ipcRenderer.invoke('select-data-directory'),

  // Event listeners
  onServerLog: (callback) => {
    ipcRenderer.on('server-log', (event, data) => callback(data));
  },
  onServerStopped: (callback) => {
    ipcRenderer.on('server-stopped', () => callback());
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', () => callback());
  },

  // Platform info
  platform: process.platform,
  isElectron: true,
});
