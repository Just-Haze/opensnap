const { contextBridge, ipcRenderer } = require('electron')

const electronAPI = {
  // Screenshot Capture
  getSources: () => ipcRenderer.invoke('get-sources'),
  captureSource: (sourceId) => ipcRenderer.invoke('capture-source', sourceId),
  captureFullscreen: () => ipcRenderer.invoke('capture-fullscreen'),
  
  // File Operations
  saveImage: (options) => ipcRenderer.invoke('save-image', options),
  copyToClipboard: (dataUrl) => ipcRenderer.invoke('copy-to-clipboard', dataUrl),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Settings Management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  
  // External Links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Event Listeners
  onSourcesAvailable: (callback) => {
    const handler = (_event, sources) => callback(sources)
    ipcRenderer.on('sources-available', handler)
    return () => ipcRenderer.removeListener('sources-available', handler)
  },
  
  onScreenshotCaptured: (callback) => {
    const handler = (_event, image) => callback(image)
    ipcRenderer.on('screenshot-captured', handler)
    return () => ipcRenderer.removeListener('screenshot-captured', handler)
  },
  
  onTakeScreenshotFromTray: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('take-screenshot-from-tray', handler)
    return () => ipcRenderer.removeListener('take-screenshot-from-tray', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
