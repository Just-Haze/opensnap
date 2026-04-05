import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// @ts-ignore - Mocking Electron API for browser preview/debugging
if (typeof window !== 'undefined' && !window.electronAPI) {
  console.warn('Electron API not found, injecting browser mock...')
  
  // Minimal placeholder thumbnail for mock mode
  const MOCK_THUMB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAJCAYAAAA799YpAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAMUlEQVR4nGNgYGD4z0AEMDEwMDAwMEBpgAonMPxnIAKYIKmA8YGBIYEhioGBAZ92GBgA9wwBAuAn1YAAAAAASUVORK5CYII='

  const mockSettings = {
    autoStart: false,
    startMinimized: false,
    minimizeToTray: true,
    closeToTray: true,
    showNotifications: true,
    captureFormat: 'png',
    captureQuality: 90,
    defaultSavePath: '',
    captureHotkey: 'Ctrl+Shift+S',
    theme: 'dark'
  }

  window.electronAPI = {
    getSources: async () => [{ id: 'mock', name: 'Mock Desktop Screen', thumbnail: MOCK_THUMB }],
    getSettings: async () => mockSettings,
    getPrimaryDisplayInfo: async () => ({ id: 0, scaleFactor: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, size: { width: 1920, height: 1080 } }),
    getDisplayInfo: async () => ({ id: 0, scaleFactor: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, size: { width: 1920, height: 1080 } }),
    onSourcesAvailable: (_cb: any) => { console.log('Mock onSourcesAvailable'); return () => {} },
    onScreenshotCaptured: (_cb: any) => { console.log('Mock onScreenshotCaptured'); return () => {} },
    onRequestFullscreenCapture: (_cb: any) => { console.log('Mock onRequestFullscreenCapture'); return () => {} },
    onSettingsUpdated: (_cb: any) => { console.log('Mock onSettingsUpdated'); return () => {} },
    onTakeScreenshotFromTray: (_cb: any) => { console.log('Mock onTakeScreenshotFromTray'); return () => {} },
    onWindowMaximizedChange: (_cb: any) => { console.log('Mock onWindowMaximizedChange'); return () => {} },
    windowIsMaximized: async () => false,
    saveSettings: async () => true,
    openExternal: async (url: string) => window.open(url, '_blank'),
    copyToClipboard: async () => true,
    showSaveDialog: async () => ({ canceled: true }),
    saveImage: async () => ({ success: true }),
  } as any

  // Diagnosis tools for browser debugging
  window.onerror = (msg, url, line, col, error) => {
    console.error(`GLOBAL ERROR: ${msg} at ${line}:${col} (URL: ${url})`, error)
  }
  window.onunhandledrejection = (event) => {
    console.error('UNHANDLED REJECTION:', event.reason)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
