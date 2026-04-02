const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, screen, clipboard, nativeImage, dialog, shell, Tray, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

// Extend app with isQuiting property
declare module 'electron' {
  interface App {
    isQuiting?: boolean
  }
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null

// Get Vite dev server URL from environment
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Settings management
const settingsPath = path.join(app.getPath('userData'), 'settings.json')

function resolveIconPath(): string {
  if (VITE_DEV_SERVER_URL) {
    return path.join(__dirname, '..', 'public', 'icon.png')
  }

  return path.join(process.resourcesPath, 'icon.png')
}

function resolveIndexPath(): string {
  const candidates = [
    path.join(process.resourcesPath, 'index.html'),
    path.join(process.resourcesPath, 'dist', 'index.html'),
    path.join(app.getAppPath(), 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html')
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

interface AppSettings {
  autoStart: boolean
  startMinimized: boolean
  minimizeToTray: boolean
  closeToTray: boolean
  showNotifications: boolean
  captureFormat: 'png' | 'jpg'
  captureQuality: number
  defaultSavePath: string
  captureHotkey: string
  theme: 'light' | 'dark' | 'system'
}

const defaultSettings: AppSettings = {
  autoStart: false,
  startMinimized: false,
  minimizeToTray: true,
  closeToTray: true,
  showNotifications: true,
  captureFormat: 'png',
  captureQuality: 90,
  defaultSavePath: app.getPath('pictures'),
  captureHotkey: 'CommandOrControl+Shift+S',
  theme: 'system'
}

// Load settings from file
function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      return { ...defaultSettings, ...JSON.parse(data) }
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
  return defaultSettings
}

// Save settings to file
function saveSettings(settings: AppSettings) {
  try {
    const dir = path.dirname(settingsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

// Auto-startup management
function setAutoStart(enable: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    name: 'OpenSnap',
    path: process.execPath
  })
}

// Create system tray
function createTray() {
  tray = new Tray(resolveIconPath())
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open OpenSnap',
      click: () => {
        showMainWindow()
      }
    },
    {
      label: 'Take Screenshot',
      accelerator: 'CommandOrControl+Shift+S',
      click: () => {
        takeScreenshot()
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        showSettingsWindow()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit OpenSnap',
      click: () => {
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('OpenSnap - Screenshot Tool')
  tray.setContextMenu(contextMenu)
  
  // Double-click to show/hide main window
  tray.on('double-click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      showMainWindow()
    }
  })
}

function showMainWindow() {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createMainWindow()
  }
}

function createMainWindow() {
  const settings = loadSettings()
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    frame: true,
    show: !settings.startMinimized,
    title: 'OpenSnap - Screenshot Tool',
    icon: resolveIconPath()
  })

  // Show window when ready (unless starting minimized)
  mainWindow.once('ready-to-show', () => {
    if (!settings.startMinimized) {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    const indexPath = resolveIndexPath()
    mainWindow.loadFile(indexPath)
  }

  // Handle window close
  mainWindow.on('close', (event) => {
    const settings = loadSettings()
    if (settings.closeToTray && !app.isQuiting) {
      event.preventDefault()
      mainWindow?.hide()
      
      if (settings.showNotifications) {
        // Show notification that app is still running
        const notification = new (require('electron').Notification)({
          title: 'OpenSnap',
          body: 'OpenSnap is still running in the system tray'
        })
        notification.show()
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle minimize to tray
  mainWindow.on('minimize', (event) => {
    const settings = loadSettings()
    if (settings.minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    frame: true,
    show: false,
    title: 'OpenSnap - Settings',
    icon: resolveIconPath(),
    parent: mainWindow || undefined,
    modal: true,
    resizable: true
  })

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
    settingsWindow?.focus()
  })

  // Load settings page
  if (VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(VITE_DEV_SERVER_URL + '#settings')
  } else {
    const indexPath = resolveIndexPath()
    settingsWindow.loadFile(indexPath, { hash: 'settings' })
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

function showSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show()
    settingsWindow.focus()
  } else {
    createSettingsWindow()
  }
}

// Quick screenshot function for tray
function takeScreenshot() {
  // This will trigger the same screenshot logic as the main app
  if (mainWindow) {
    mainWindow.webContents.send('take-screenshot-from-tray')
  } else {
    // If main window is not open, create it temporarily hidden and take screenshot
    createMainWindow()
    mainWindow?.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('take-screenshot-from-tray')
    })
  }
}



// Get all available screens and windows  
async function getSources(): Promise<Array<{ id: string; name: string; thumbnail: string; icon?: string }>> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 400, height: 300 },
    fetchWindowIcons: true
  })
  
  // Filter out system windows and improve window names
  const filteredSources = sources.filter(source => {
    // Skip minimized windows and system windows
    if (source.name === '' || source.name.includes('Task Switching')) {
      return false
    }
    // Skip very small windows (likely system UI elements)
    if (source.thumbnail.getSize().width < 100 || source.thumbnail.getSize().height < 100) {
      return false
    }
    return true
  })
  
  return filteredSources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
    icon: source.appIcon ? source.appIcon.toDataURL() : undefined
  }))
}

// Attempt to crop window decorations from captured image
function cropWindowDecorations(thumbnail: Electron.NativeImage): Electron.NativeImage {
  try {
    const size = thumbnail.getSize()
    
    // On Windows, typical window decorations are:
    // - Title bar: ~30-32px at top
    // - Borders: ~8px on sides and bottom (varies with DPI scaling)
    
    // Get the scale factor for DPI awareness
    const scaleFactor = screen.getPrimaryDisplay().scaleFactor
    
    // Estimate decoration sizes (these are typical Windows 10/11 values)
    const titleBarHeight = Math.round(31 * scaleFactor)
    const borderWidth = Math.round(8 * scaleFactor)
    
    // Only crop if the window is large enough to have meaningful content after cropping
    const minContentWidth = 200
    const minContentHeight = 150
    
    const croppedWidth = size.width - (borderWidth * 2)
    const croppedHeight = size.height - titleBarHeight - borderWidth
    
    if (croppedWidth >= minContentWidth && croppedHeight >= minContentHeight) {
      // Create a cropped version
      const cropRect = {
        x: borderWidth,
        y: titleBarHeight,
        width: croppedWidth,
        height: croppedHeight
      }
      
      return thumbnail.crop(cropRect)
    }
  } catch (error) {
    // Failed to crop window decorations, return original
  }
  
  // Return original if cropping fails or isn't suitable
  return thumbnail
}

// Capture a specific source at full resolution
async function captureSource(sourceId: string): Promise<{ dataUrl: string; width: number; height: number; logicalWidth: number; logicalHeight: number } | null> {
  try {
    const isWindowSource = sourceId.startsWith('window:')
    const primaryDisplay = screen.getPrimaryDisplay()
    const scaleFactor = primaryDisplay.scaleFactor
    
    if (isWindowSource) {
      // For window capture, use a high resolution but consistent approach
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 2560, height: 1440 } // Fixed high resolution
      })
      
      const source = sources.find(s => s.id === sourceId)
      if (source && source.thumbnail) {
        let thumbnail = source.thumbnail
        const size = thumbnail.getSize()
        
        // Try to crop window decorations for better consistency
        thumbnail = cropWindowDecorations(thumbnail)
        const finalSize = thumbnail.getSize()
        
        return {
          dataUrl: thumbnail.toDataURL('image/png'),
          width: finalSize.width,
          height: finalSize.height,
          // For windows, we use the captured size as logical since cropping removes scale variations
          logicalWidth: finalSize.width,
          logicalHeight: finalSize.height
        }
      }
    } else {
      // Screen capture - use actual screen resolution scaled appropriately
      const displays = screen.getAllDisplays()
      const targetDisplay = displays.find(display => `screen:${display.id}` === sourceId) || primaryDisplay
      
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: targetDisplay.size.width * targetDisplay.scaleFactor,
          height: targetDisplay.size.height * targetDisplay.scaleFactor
        }
      })
      
      const source = sources.find(s => s.id === sourceId)
      if (source && source.thumbnail) {
        const thumbnail = source.thumbnail
        const size = thumbnail.getSize()
        return {
          dataUrl: thumbnail.toDataURL('image/png'),
          width: size.width,
          height: size.height,
          logicalWidth: targetDisplay.size.width,
          logicalHeight: targetDisplay.size.height
        }
      }
    }
  } catch (error) {
    // Failed to capture source
  }
  
  return null
}

// Capture full screen
async function captureFullScreen(): Promise<{ dataUrl: string; width: number; height: number; logicalWidth: number; logicalHeight: number } | null> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size // Logical size
    const scaleFactor = primaryDisplay.scaleFactor
    
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: width * scaleFactor, height: height * scaleFactor }
    })

    if (sources.length > 0) {
      const thumbnail = sources[0].thumbnail
      const size = thumbnail.getSize()
      return {
        dataUrl: thumbnail.toDataURL('image/png'),
        width: size.width,   // Physical pixels
        height: size.height, // Physical pixels
        logicalWidth: width,  // Logical pixels
        logicalHeight: height // Logical pixels
      }
    }
  } catch (error) {
    // Failed to capture full screen
  }
  
  return null
}

// Default shortcuts
let currentShortcuts = {
  captureScreen: 'CommandOrControl+Shift+S',
  captureFullScreen: 'CommandOrControl+Shift+F',
  showSourcePicker: 'Alt+S',
  captureFullScreenQuick: 'Alt+F'
}

// Register global keyboard shortcuts
function registerGlobalShortcuts() {
  // Unregister all first to avoid duplicates
  globalShortcut.unregisterAll()
  
  try {
    // Capture screen - Open source picker
    if (currentShortcuts.captureScreen) {
      globalShortcut.register(currentShortcuts.captureScreen, async () => {
        if (mainWindow) {
          const sources = await getSources()
          mainWindow.webContents.send('sources-available', sources)
          mainWindow.show()
          mainWindow.focus()
        }
      })
    }

    // Capture full screen immediately
    if (currentShortcuts.captureFullScreen) {
      globalShortcut.register(currentShortcuts.captureFullScreen, async () => {
        if (mainWindow) {
          const screenshot = await captureFullScreen()
          if (screenshot) {
            mainWindow.webContents.send('screenshot-captured', screenshot)
            mainWindow.show()
            mainWindow.focus()
          }
        }
      })
    }

    // Show source picker (alternative shortcut)
    if (currentShortcuts.showSourcePicker) {
      globalShortcut.register(currentShortcuts.showSourcePicker, async () => {
        if (mainWindow) {
          const sources = await getSources()
          mainWindow.webContents.send('sources-available', sources)
          mainWindow.show()
          mainWindow.focus()
        }
      })
    }

    // Quick full screen capture (alternative shortcut)
    if (currentShortcuts.captureFullScreenQuick) {
      globalShortcut.register(currentShortcuts.captureFullScreenQuick, async () => {
        if (mainWindow) {
          const screenshot = await captureFullScreen()
          if (screenshot) {
            mainWindow.webContents.send('screenshot-captured', screenshot)
            mainWindow.show()
            mainWindow.focus()
          }
        }
      })
    }
  } catch (error) {
    // Failed to register shortcuts
  }
}

// IPC Handlers
// ============ IPC HANDLERS ============

ipcMain.handle('get-sources', async () => {
  return await getSources()
})

ipcMain.handle('capture-source', async (_, sourceId: string) => {
  return await captureSource(sourceId)
})

ipcMain.handle('capture-fullscreen', async () => {
  return await captureFullScreen()
})

// Add handler for updating shortcuts
ipcMain.handle('update-shortcuts', async (_, shortcuts) => {
  currentShortcuts = shortcuts
  registerGlobalShortcuts()
  return true
})

ipcMain.handle('save-image', async (_, { dataUrl, filePath, format }: { dataUrl: string; filePath: string; format: string }) => {
  try {
    const image = nativeImage.createFromDataURL(dataUrl)
    let buffer: Buffer

    if (format === 'jpg' || format === 'jpeg') {
      buffer = image.toJPEG(95)
    } else {
      buffer = image.toPNG()
    }

    fs.writeFileSync(filePath, buffer)
    return { success: true, path: filePath }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('copy-to-clipboard', async (_, dataUrl: string) => {
  try {
    const image = nativeImage.createFromDataURL(dataUrl)
    clipboard.writeImage(image)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('show-save-dialog', async () => {
  if (!mainWindow) return { canceled: true }
  
  return await dialog.showSaveDialog(mainWindow, {
    title: 'Save Screenshot',
    defaultPath: `opensnap-${Date.now()}.png`,
    filters: [
      { name: 'PNG Image', extensions: ['png'] },
      { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
      { name: 'WebP Image', extensions: ['webp'] }
    ]
  })
})

ipcMain.handle('show-open-dialog', async (_, options) => {
  if (!mainWindow) return { canceled: true }
  
  return await dialog.showOpenDialog(mainWindow, options)
})

ipcMain.handle('open-external', async (_, url: string) => {
  await shell.openExternal(url)
})

// Settings IPC Handlers
ipcMain.handle('get-settings', () => {
  return loadSettings()
})

ipcMain.handle('save-settings', (_, settings: AppSettings) => {
  saveSettings(settings)
  
  // Apply settings that affect the app immediately
  setAutoStart(settings.autoStart)
  
  // Update global shortcuts if hotkey changed
  if (settings.captureHotkey !== currentShortcuts.captureScreen) {
    currentShortcuts.captureScreen = settings.captureHotkey
    registerGlobalShortcuts()
  }
  
  return true
})

ipcMain.handle('reset-settings', () => {
  saveSettings(defaultSettings)
  setAutoStart(defaultSettings.autoStart)
  currentShortcuts.captureScreen = defaultSettings.captureHotkey
  registerGlobalShortcuts()
  return defaultSettings
})

// ============ APP LIFECYCLE ============

app.whenReady().then(() => {
  const settings = loadSettings()
  
  // Apply auto-start setting
  setAutoStart(settings.autoStart)
  
  // Update shortcuts from settings
  if (settings.captureHotkey) {
    currentShortcuts.captureScreen = settings.captureHotkey
  }
  
  // Create tray first
  createTray()

  // Remove default application menu (File/Edit/View/Window/Help)
  Menu.setApplicationMenu(null)
  
  // Create main window (may be hidden if startMinimized is true)
  createMainWindow()
  
  // Register shortcuts after window is created
  setTimeout(() => {
    registerGlobalShortcuts()
  }, 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, don't quit when all windows are closed if tray is enabled
  // On other platforms, only quit if not closing to tray
  const settings = loadSettings()
  
  if (process.platform === 'darwin') {
    // On macOS, typically don't quit when all windows are closed
    globalShortcut.unregisterAll()
    return
  }
  
  if (!settings.closeToTray) {
    globalShortcut.unregisterAll()
    app.quit()
  }
  // If closeToTray is true, don't quit - app continues running in tray
})

app.on('before-quit', () => {
  // Set flag to allow windows to close when quitting
  app.isQuiting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
