const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, screen, clipboard, nativeImage, dialog, shell, Tray, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

// Extend app with isQuiting property
declare module 'electron' {
  interface App {
    isQuiting?: boolean
  }
}

// Type for region capture data stored globally
interface RegionCaptureData {
  id: number
  screenshot: string
  width: number
  height: number
  scaleFactor: number
  physicalWidth: number
  physicalHeight: number
}

declare global {
  var regionCaptureData: RegionCaptureData | null
  var allRegionCaptureData: Map<number, RegionCaptureData> | null
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null
let regionCaptureActive = false
const regionCaptureWindows = new Map<number, BrowserWindow>()
let regionRestoreState = { main: false, settings: false }

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
  tray.setToolTip('OpenSnap - Screenshot Tool')
  updateTrayMenu(loadSettings())
  
  // Double-click to show/hide main window
  tray.on('double-click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      showMainWindow()
    }
  })
}

function updateTrayMenu(settings: AppSettings) {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open OpenSnap',
      click: () => {
        showMainWindow()
      }
    },
    {
      label: 'Capture Region',
      accelerator: settings.captureHotkey || undefined,
      click: () => {
        startRegionCapture()
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

  tray.setContextMenu(contextMenu)
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
    frame: false, // Custom title bar
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    show: !settings.startMinimized,
    title: 'OpenSnap - Screenshot Tool',
    icon: resolveIconPath(),
    backgroundColor: '#09090b'
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

  // Track maximize state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-change', true)
  })
  
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-change', false)
  })

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

function hideCaptureWindows() {
  regionRestoreState = {
    main: Boolean(mainWindow && mainWindow.isVisible()),
    settings: Boolean(settingsWindow && settingsWindow.isVisible())
  }

  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.hide()
  }

  if (settingsWindow && settingsWindow.isVisible()) {
    settingsWindow.hide()
  }
}

function restoreCaptureWindows() {
  if (regionRestoreState.main) {
    showMainWindow()
  }

  if (regionRestoreState.settings) {
    showSettingsWindow()
  }
  regionRestoreState = { main: false, settings: false }
}

function closeRegionCaptureWindows() {
  regionCaptureWindows.forEach((window) => {
    window.close()
  })
  regionCaptureWindows.clear()
}

async function startRegionCapture() {
  if (regionCaptureActive) return
  regionCaptureActive = true

  try {
    const allDisplays = screen.getAllDisplays()

    // Capture screenshots for ALL displays
    // Use the maximum physical size across all displays for the thumbnail request
    const maxW = Math.max(...allDisplays.map(d => Math.round(d.size.width * d.scaleFactor)))
    const maxH = Math.max(...allDisplays.map(d => Math.round(d.size.height * d.scaleFactor)))

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxW, height: maxH }
    })

    if (sources.length === 0) {
      console.error('No screen sources found')
      regionCaptureActive = false
      return
    }

    hideCaptureWindows()

    // Build a map of display data keyed by display ID
    const captureMap = new Map<number, RegionCaptureData>()

    for (const display of allDisplays) {
      const source = sources.find(s => s.display_id === String(display.id)) || sources[0]
      const scaleFactor = display.scaleFactor
      const { width, height } = display.size

      // Re-capture at correct resolution for this display
      const exactSources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.round(width * scaleFactor),
          height: Math.round(height * scaleFactor)
        }
      })
      const exactSource = exactSources.find(s => s.display_id === String(display.id)) || source
      const screenshot = exactSource.thumbnail.toDataURL()

      const displayData: RegionCaptureData = {
        id: display.id,
        screenshot,
        width,
        height,
        scaleFactor,
        physicalWidth: Math.round(width * scaleFactor),
        physicalHeight: Math.round(height * scaleFactor)
      }
      captureMap.set(display.id, displayData)
    }

    // Store for IPC retrieval
    global.allRegionCaptureData = captureMap
    // Keep legacy single-display field pointing to primary for compat
    global.regionCaptureData = captureMap.get(screen.getPrimaryDisplay().id) || null

    // Create one overlay window per display
    for (const display of allDisplays) {
      const { width, height } = display.size

      const overlay = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: width,
        height: height,
        show: false,
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        fullscreen: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        focusable: true,
        hasShadow: false,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false
        }
      })

      overlay.setIgnoreMouseEvents(false)
      overlay.setAlwaysOnTop(true, 'screen-saver')

      if (VITE_DEV_SERVER_URL) {
        overlay.loadURL(`${VITE_DEV_SERVER_URL}#region-capture?display=${display.id}`)
      } else {
        const indexPath = resolveIndexPath()
        overlay.loadFile(indexPath, { hash: `region-capture?display=${display.id}` })
      }

      overlay.once('ready-to-show', () => {
        overlay.show()
        // Only focus the primary display overlay
        if (display.id === screen.getPrimaryDisplay().id) {
          overlay.focus()
        }
      })

      overlay.on('closed', () => {
        regionCaptureWindows.delete(display.id)
        if (regionCaptureWindows.size === 0) {
          global.regionCaptureData = null
          global.allRegionCaptureData = null
        }
      })

      regionCaptureWindows.set(display.id, overlay)
    }
  } catch (error) {
    console.error('Failed to start region capture:', error)
    regionCaptureActive = false
    restoreCaptureWindows()
  }
}

// Get all available screens and windows  
async function getSources(): Promise<Array<{ id: string; name: string; thumbnail: string; icon?: string; displayId?: string }>> {
  // Get display info for proper scaling
  const primaryDisplay = screen.getPrimaryDisplay()
  const scaleFactor = primaryDisplay.scaleFactor || 1
  
  // Use larger thumbnail size for better quality previews (scaled for high DPI)
  const thumbnailWidth = Math.round(640 * scaleFactor)
  const thumbnailHeight = Math.round(400 * scaleFactor)
  
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: thumbnailWidth, height: thumbnailHeight },
    fetchWindowIcons: true
  })
  
  // Filter out system windows and improve window names
  const filteredSources = sources.filter(source => {
    // Skip minimized windows and system windows
    if (source.name === '' || source.name.includes('Task Switching')) {
      return false
    }
    // Skip windows with no content (likely minimized or system UI)
    const thumbSize = source.thumbnail.getSize()
    if (thumbSize.width < 50 || thumbSize.height < 50) {
      return false
    }
    // Skip specific system windows on Windows
    if (source.name === 'Program Manager' || 
        source.name.includes('Windows Input Experience') ||
        source.name.includes('TextInputHost')) {
      return false
    }
    return true
  })
  
  return filteredSources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
    icon: source.appIcon ? source.appIcon.toDataURL() : undefined,
    displayId: source.display_id
  }))
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
        startRegionCapture()
      })
    }

    // Capture full screen immediately
    if (currentShortcuts.captureFullScreen) {
      globalShortcut.register(currentShortcuts.captureFullScreen, async () => {
        if (mainWindow) {
          mainWindow.webContents.send('request-fullscreen-capture')
          mainWindow.show()
          mainWindow.focus()
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
          mainWindow.webContents.send('request-fullscreen-capture')
          mainWindow.show()
          mainWindow.focus()
        }
      })
    }
  } catch (error) {
    // Failed to register shortcuts
  }
}

// ============ IPC HANDLERS ============

// Window control handlers (for custom title bar)
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false
})

ipcMain.handle('get-sources', async () => {
  return await getSources()
})

ipcMain.handle('get-screen-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1, height: 1 }
  })
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    displayId: source.display_id
  }))
})

// Get window-specific capture info for high quality capture
ipcMain.handle('get-window-info', async (_, sourceId: string) => {
  try {
    // For window sources, we need to get the actual window bounds
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 },
      fetchWindowIcons: false
    })
    
    const source = sources.find(s => s.id === sourceId)
    if (!source) return null
    
    const thumbSize = source.thumbnail.getSize()
    const primaryDisplay = screen.getPrimaryDisplay()
    
    return {
      id: source.id,
      name: source.name,
      width: thumbSize.width,
      height: thumbSize.height,
      scaleFactor: primaryDisplay.scaleFactor
    }
  } catch (error) {
    console.error('Error getting window info:', error)
    return null
  }
})

ipcMain.handle('capture-region', async () => {
  startRegionCapture()
  return true
})

ipcMain.handle('region-capture-hide', async () => {
  regionCaptureWindows.forEach((window) => window.hide())
  return true
})

ipcMain.handle('region-capture-ready', async (_event, displayId) => {
  const overlay = regionCaptureWindows.get(Number(displayId))
  if (!overlay) return false
  overlay.showInactive()
  overlay.focus()
  return true
})

// Get pre-captured screenshot data for region selection (per-display)
ipcMain.handle('get-region-capture-data', async (_event, displayId?: number) => {
  if (displayId !== undefined && global.allRegionCaptureData) {
    return global.allRegionCaptureData.get(Number(displayId)) || global.regionCaptureData || null
  }
  return global.regionCaptureData || null
})

ipcMain.handle('region-capture-cancel', async () => {
  if (!regionCaptureActive) return true
  regionCaptureActive = false
  global.regionCaptureData = null
  closeRegionCaptureWindows()
  restoreCaptureWindows()
  return true
})

ipcMain.handle('region-capture-complete', async (_, payload) => {
  if (!regionCaptureActive) return { success: false }

  regionCaptureActive = false
  global.regionCaptureData = null
  global.allRegionCaptureData = null
  closeRegionCaptureWindows()
  restoreCaptureWindows()

  if (payload && payload.dataUrl) {
    // Second clipboard safety net — renderer already copies on confirm,
    // but this guarantees it if something went wrong on the renderer side.
    try {
      const img = nativeImage.createFromDataURL(payload.dataUrl)
      clipboard.writeImage(img)
    } catch (_) { /* best-effort */ }

    mainWindow?.webContents.send('screenshot-captured', payload)
    showMainWindow()
    return { success: true }
  }

  return { success: false }
})

ipcMain.handle('get-display-info', async (_event, displayId) => {
  const displays = screen.getAllDisplays()
  const display = displays.find(item => String(item.id) === String(displayId))
  if (!display) return null
  return {
    id: display.id,
    scaleFactor: display.scaleFactor,
    bounds: display.bounds,
    size: display.size
  }
})

ipcMain.handle('get-primary-display-info', async () => {
  const display = screen.getPrimaryDisplay()
  return {
    id: display.id,
    scaleFactor: display.scaleFactor,
    bounds: display.bounds,
    size: display.size
  }
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

ipcMain.handle('hide-main-window', () => {
  mainWindow?.hide()
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

ipcMain.handle('update-tray-menu', async (_, settings: AppSettings) => {
  updateTrayMenu(settings)
  return true
})

// Settings IPC Handlers
ipcMain.handle('get-settings', () => {
  return loadSettings()
})

ipcMain.handle('save-settings', (_, settings: AppSettings) => {
  saveSettings(settings)
  
  // Apply settings that affect the app immediately
  setAutoStart(settings.autoStart)
  updateTrayMenu(settings)
  mainWindow?.webContents.send('settings-updated', settings)
  
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
  updateTrayMenu(defaultSettings)
  registerGlobalShortcuts()
  mainWindow?.webContents.send('settings-updated', defaultSettings)
  return defaultSettings
})

// ============ APP LIFECYCLE ============

app.whenReady().then(() => {
  const settings = loadSettings()
  
  // Apply auto-start setting
  setAutoStart(settings.autoStart)
  updateTrayMenu(settings)
  
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
