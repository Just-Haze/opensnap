const { contextBridge, ipcRenderer } = require('electron')

const electronAPI = {
  // Screenshot Capture
  getSources: () => ipcRenderer.invoke('get-sources'),
  captureRegion: () => ipcRenderer.invoke('capture-region'),
  regionCaptureHide: () => ipcRenderer.invoke('region-capture-hide'),
  regionCaptureReady: (displayId) => ipcRenderer.invoke('region-capture-ready', displayId),
  regionCaptureComplete: (payload) => ipcRenderer.invoke('region-capture-complete', payload),
  regionCaptureCancel: () => ipcRenderer.invoke('region-capture-cancel'),
  getRegionCaptureData: () => ipcRenderer.invoke('get-region-capture-data'),
  getDisplayInfo: (displayId) => ipcRenderer.invoke('get-display-info', displayId),
  getPrimaryDisplayInfo: () => ipcRenderer.invoke('get-primary-display-info'),
  getWindowInfo: (sourceId) => ipcRenderer.invoke('get-window-info', sourceId),
  
  // Window Controls (for custom title bar)
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // File Operations
  saveImage: (options) => ipcRenderer.invoke('save-image', options),
  copyToClipboard: (dataUrl) => ipcRenderer.invoke('copy-to-clipboard', dataUrl),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Settings Management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  updateTrayMenu: (settings) => ipcRenderer.invoke('update-tray-menu', settings),
  
  // Capture helpers
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  captureSourceFrame: (sourceId) => ipcRenderer.invoke('capture-source-frame', sourceId),
  
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

  onRequestFullscreenCapture: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('request-fullscreen-capture', handler)
    return () => ipcRenderer.removeListener('request-fullscreen-capture', handler)
  },

  onSettingsUpdated: (callback) => {
    const handler = (_event, settings) => callback(settings)
    ipcRenderer.on('settings-updated', handler)
    return () => ipcRenderer.removeListener('settings-updated', handler)
  },
  
  onTakeScreenshotFromTray: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('take-screenshot-from-tray', handler)
    return () => ipcRenderer.removeListener('take-screenshot-from-tray', handler)
  },
  
  onWindowMaximizedChange: (callback) => {
    const handler = (_event, isMaximized) => callback(isMaximized)
    ipcRenderer.on('window-maximized-change', handler)
    return () => ipcRenderer.removeListener('window-maximized-change', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
