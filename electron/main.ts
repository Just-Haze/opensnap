const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, screen, clipboard, nativeImage, dialog, shell, Tray, Menu, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

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

// ── Platform helpers ──
const isMac          = process.platform === 'darwin'
const isLinuxWayland = process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland'

// ── Lazy path getters ──
// app.getPath('userData') must NOT be called before app.ready — doing so throws on Windows.
let _settingsPath: string | null = null
let _historyPath:  string | null = null

function getSettingsPath(): string {
  if (!_settingsPath) _settingsPath = path.join(app.getPath('userData'), 'settings.json')
  return _settingsPath
}

function getHistoryPath(): string {
  if (!_historyPath) _historyPath = path.join(app.getPath('userData'), 'history.json')
  return _historyPath
}

// ── Path resolution ──
function resolveIconPath(): string {
  if (VITE_DEV_SERVER_URL) {
    return path.join(__dirname, '..', 'public', 'icon.png')
  }
  return path.join(process.resourcesPath, 'icon.png')
}

// Cache the index path so we don't do N×4 sync stat() calls per window creation.
let _resolvedIndexPath: string | null = null
function resolveIndexPath(): string {
  if (_resolvedIndexPath) return _resolvedIndexPath
  const candidates = [
    path.join(process.resourcesPath, 'index.html'),
    path.join(process.resourcesPath, 'dist', 'index.html'),
    path.join(app.getAppPath(), 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html')
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      _resolvedIndexPath = candidate
      return candidate
    }
  }
  _resolvedIndexPath = candidates[0]
  return _resolvedIndexPath
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

// Platform-appropriate default hotkey ('Command' only exists on macOS)
const defaultSettings: AppSettings = {
  autoStart: false,
  startMinimized: false,
  minimizeToTray: true,
  closeToTray: true,
  showNotifications: true,
  captureFormat: 'png',
  captureQuality: 90,
  defaultSavePath: '',   // resolved lazily inside app.whenReady
  captureHotkey: isMac ? 'Command+Shift+S' : 'Ctrl+Shift+S',
  theme: 'system'
}

// ── Settings I/O ──
// Synchronous version kept only for the bootstrap path where async is awkward.
function loadSettings(): AppSettings {
  try {
    const p = getSettingsPath()
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf8')
      return { ...defaultSettings, ...JSON.parse(data) }
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
  return { ...defaultSettings, defaultSavePath: app.getPath('pictures') }
}

// Async version used in IPC handlers so main-thread event loop is not blocked.
async function loadSettingsAsync(): Promise<AppSettings> {
  try {
    const data = await fs.promises.readFile(getSettingsPath(), 'utf8')
    return { ...defaultSettings, ...JSON.parse(data) }
  } catch {
    return { ...defaultSettings, defaultSavePath: app.getPath('pictures') }
  }
}

async function saveSettingsAsync(settings: AppSettings): Promise<void> {
  try {
    const dir = path.dirname(getSettingsPath())
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8')
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

// ── Auto-startup ──
function setAutoStart(enable: boolean, startMinimized = false) {
  app.setLoginItemSettings({
    openAtLogin:  enable,
    openAsHidden: startMinimized,
    // 'name' is macOS-only; passing it on Windows emits deprecation warnings in Electron 33+
    ...(isMac ? { name: 'OpenSnap' } : {}),
    path: process.execPath
  })
}

// ── Tray ──
function createTray() {
  tray = new Tray(resolveIconPath())
  tray.setToolTip('OpenSnap - Screenshot Tool')
  updateTrayMenu(loadSettings())

  tray.on('double-click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      showMainWindow()
    }
  })
}

let _prevTraySettings: AppSettings | null = null
function updateTrayMenu(settings: AppSettings) {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open OpenSnap',
      click: () => showMainWindow()
    },
    {
      label: 'Capture Region',
      accelerator: settings.captureHotkey || undefined,
      click: () => startRegionCapture()
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => showSettingsWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit OpenSnap',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)
  _prevTraySettings = settings
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

  // Transparent windows crash some Wayland compositors; fall back to opaque there.
  const supportsTransparency = !isLinuxWayland

  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration:  false,
      contextIsolation: true
      // sandbox defaults to true in Electron >= 20; do NOT set sandbox: false
    },
    // macOS: keep the native frame so traffic lights render correctly,
    // then use hiddenInset so the title bar is transparent.
    frame:                !isMac,
    titleBarStyle:        isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 12, y: 16 } : undefined,
    titleBarOverlay:      false,
    show:                 !settings.startMinimized,
    title:                'OpenSnap - Screenshot Tool',
    icon:                 resolveIconPath(),
    transparent:          supportsTransparency,
    backgroundColor:      supportsTransparency ? '#00000000' : '#1a1a2e'
  })

  mainWindow.once('ready-to-show', () => {
    if (!settings.startMinimized) {
      mainWindow?.show()
      mainWindow?.focus()
    }

    // Defer tray creation until after first paint so it doesn't block startup.
    if (!tray) createTray()

    // Register shortcuts after content is loaded (not behind a fixed 1-second timer).
    registerGlobalShortcuts()
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(resolveIndexPath())
  }

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-change', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-change', false)
  })

  mainWindow.on('close', (event) => {
    const settings = loadSettings()
    if (settings.closeToTray && !app.isQuiting) {
      event.preventDefault()
      mainWindow?.hide()

      if (settings.showNotifications) {
        const notification = new Notification({
          title: 'OpenSnap',
          body:  'OpenSnap is still running in the system tray'
        })
        notification.show()
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

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
    width:    800,
    height:   600,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration:  false,
      contextIsolation: true
    },
    frame:     true,
    show:      false,
    title:     'OpenSnap - Settings',
    icon:      resolveIconPath(),
    parent:    mainWindow || undefined,
    modal:     true,
    resizable: true
  })

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
    settingsWindow?.focus()
  })

  if (VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(VITE_DEV_SERVER_URL + '#settings')
  } else {
    settingsWindow.loadFile(resolveIndexPath(), { hash: 'settings' })
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
    main:     Boolean(mainWindow     && mainWindow.isVisible()),
    settings: Boolean(settingsWindow && settingsWindow.isVisible())
  }
  if (mainWindow     && mainWindow.isVisible())     mainWindow.hide()
  if (settingsWindow && settingsWindow.isVisible()) settingsWindow.hide()
}

function restoreCaptureWindows() {
  if (regionRestoreState.main)     showMainWindow()
  if (regionRestoreState.settings) showSettingsWindow()
  regionRestoreState = { main: false, settings: false }
}

function closeRegionCaptureWindows() {
  regionCaptureWindows.forEach((window) => window.close())
  regionCaptureWindows.clear()
}

async function startRegionCapture() {
  if (regionCaptureActive) return
  regionCaptureActive = true

  try {
    const allDisplays = screen.getAllDisplays()

    // Single getSources call for all displays (not N parallel calls each returning N sources).
    const maxW = Math.max(...allDisplays.map((d: any) => Math.round(d.size.width  * d.scaleFactor)))
    const maxH = Math.max(...allDisplays.map((d: any) => Math.round(d.size.height * d.scaleFactor)))

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxW, height: maxH }
    })

    hideCaptureWindows()

    const captureMap = new Map<number, RegionCaptureData>()
    for (const display of allDisplays) {
      const { width, height, scaleFactor } = display
      const source = sources.find((s: any) => String(s.display_id) === String(display.id)) || sources[0]
      captureMap.set(display.id, {
        id:            display.id,
        screenshot:    source.thumbnail.toDataURL(),
        width,
        height,
        scaleFactor,
        physicalWidth:  Math.round(width  * scaleFactor),
        physicalHeight: Math.round(height * scaleFactor)
      })
    }

    global.allRegionCaptureData = captureMap
    global.regionCaptureData    = captureMap.get(screen.getPrimaryDisplay().id) || null

    // Create overlay windows
    for (const display of allDisplays) {
      const { width, height } = display.size

      const overlay = new BrowserWindow({
        x:          display.bounds.x,
        y:          display.bounds.y,
        width,
        height,
        show:        false,
        frame:       false,
        transparent: true,
        resizable:   false,
        movable:     false,
        fullscreen:  false,
        skipTaskbar: true,
        alwaysOnTop: true,
        focusable:   true,
        hasShadow:   false,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          nodeIntegration:  false,
          contextIsolation: true
        }
      })

      overlay.setIgnoreMouseEvents(false)
      overlay.setAlwaysOnTop(true, 'screen-saver')

      // Register in map BEFORE loadURL so cleanup always finds the window even if loading throws
      regionCaptureWindows.set(display.id, overlay)

      if (VITE_DEV_SERVER_URL) {
        overlay.loadURL(`${VITE_DEV_SERVER_URL}#region-capture?display=${display.id}`)
      } else {
        overlay.loadFile(resolveIndexPath(), { hash: `region-capture?display=${display.id}` })
      }

      overlay.once('ready-to-show', () => {
        overlay.show()
        if (display.id === screen.getPrimaryDisplay().id) {
          overlay.focus()
        }
      })

      overlay.on('closed', () => {
        regionCaptureWindows.delete(display.id)
        if (regionCaptureWindows.size === 0) {
          global.regionCaptureData    = null
          global.allRegionCaptureData = null
        }
      })
    }
  } catch (error) {
    console.error('Failed to start region capture:', error)
    regionCaptureActive         = false
    global.regionCaptureData    = null  // clear any partially-captured data
    global.allRegionCaptureData = null
    restoreCaptureWindows()
  }
}

// ── Bounded icon cache — prevents unbounded growth when many apps are running ──
const ICON_CACHE_MAX = 50
const iconCache = new Map<string, string>()

function cacheIcon(key: string, value: string): void {
  if (iconCache.size >= ICON_CACHE_MAX) {
    // Evict the oldest entry (Map preserves insertion order)
    iconCache.delete(iconCache.keys().next().value as string)
  }
  iconCache.set(key, value)
}

async function getSources(): Promise<Array<{ id: string; name: string; thumbnail: string; icon?: string; displayId?: string }>> {
  const thumbnailWidth  = 400
  const thumbnailHeight = 225

  let sources: any[] = []
  try {
    sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: thumbnailWidth, height: thumbnailHeight },
      fetchWindowIcons: true
    })
  } catch (error) {
    console.error('getSources error:', error)
    return []
  }

  const filteredSources = sources.filter((source: any) => {
    if (source.name === '' || source.name === 'OpenSnap' || source.name.includes('Task Switching')) return false
    const thumbSize = source.thumbnail.getSize()
    if (thumbSize.width < 5 || thumbSize.height < 5) return false
    if (source.name === 'Program Manager' ||
        source.name.includes('Windows Input Experience') ||
        source.name.includes('TextInputHost')) return false
    return true
  })

  return filteredSources.map((source: any) => {
    let iconData: string | undefined
    if (source.appIcon) {
      const iconKey = source.name || source.id
      if (iconCache.has(iconKey)) {
        iconData = iconCache.get(iconKey)
      } else {
        iconData = source.appIcon.toDataURL()
        cacheIcon(iconKey, iconData!)
      }
    }

    return {
      id:        source.id,
      name:      source.name,
      thumbnail: source.thumbnail.toDataURL({ quality: 70 }),
      icon:      iconData,
      displayId: source.display_id
    }
  })
}

// ── Global shortcut management ──
let currentShortcuts = {
  captureScreen:          isMac ? 'Command+Shift+S' : 'Ctrl+Shift+S',
  captureFullScreen:      isMac ? 'Command+Shift+F' : 'Ctrl+Shift+F',
  showSourcePicker:       'Alt+S',
  captureFullScreenQuick: 'Alt+F'
}

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll()
  const failures: string[] = []

  const tryRegister = (accelerator: string, handler: () => void) => {
    if (!accelerator) return
    const ok = globalShortcut.register(accelerator, handler)
    if (!ok) failures.push(accelerator)
  }

  tryRegister(currentShortcuts.captureScreen, () => startRegionCapture())

  tryRegister(currentShortcuts.captureFullScreen, () => {
    if (mainWindow) {
      mainWindow.webContents.send('request-fullscreen-capture')
      mainWindow.show()
      mainWindow.focus()
    }
  })

  tryRegister(currentShortcuts.showSourcePicker, async () => {
    if (mainWindow) {
      const sources = await getSources()
      mainWindow.webContents.send('sources-available', sources)
      mainWindow.show()
      mainWindow.focus()
    }
  })

  tryRegister(currentShortcuts.captureFullScreenQuick, () => {
    if (mainWindow) {
      mainWindow.webContents.send('request-fullscreen-capture')
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Notify renderer of any hotkeys that couldn't be registered (already taken by another app)
  if (failures.length) {
    mainWindow?.webContents.send('shortcut-registration-failed', failures)
  }
}

// ============ IPC HANDLERS ============

// Window controls (custom title bar)
ipcMain.handle('window-minimize', () => mainWindow?.minimize())

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})

ipcMain.handle('window-close', () => mainWindow?.close())

ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() || false)

ipcMain.handle('get-sources', async () => getSources())

ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 }
    })
    return sources.map((source: any) => ({
      id:        source.id,
      name:      source.name,
      displayId: source.display_id
    }))
  } catch (error) {
    console.error('get-screen-sources error:', error)
    return []
  }
})

ipcMain.handle('get-window-info', async (_, sourceId: string) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 },
      fetchWindowIcons: false
    })
    const source = sources.find((s: any) => s.id === sourceId)
    if (!source) return null
    const thumbSize       = source.thumbnail.getSize()
    const primaryDisplay  = screen.getPrimaryDisplay()
    return {
      id:          source.id,
      name:        source.name,
      width:       thumbSize.width,
      height:      thumbSize.height,
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

ipcMain.handle('get-region-capture-data', async (_event, displayId?: number) => {
  if (displayId !== undefined && global.allRegionCaptureData) {
    return global.allRegionCaptureData.get(Number(displayId)) || global.regionCaptureData || null
  }
  return global.regionCaptureData || null
})

ipcMain.handle('region-capture-cancel', async () => {
  if (!regionCaptureActive) return true
  regionCaptureActive         = false
  global.regionCaptureData    = null
  global.allRegionCaptureData = null
  closeRegionCaptureWindows()
  restoreCaptureWindows()
  return true
})

ipcMain.handle('region-capture-complete', async (_, payload) => {
  if (!regionCaptureActive) return { success: false }

  regionCaptureActive         = false
  global.regionCaptureData    = null
  global.allRegionCaptureData = null
  closeRegionCaptureWindows()
  restoreCaptureWindows()

  if (payload && payload.dataUrl) {
    // The renderer already wrote to the clipboard via copyToClipboard() before calling this.
    // We intentionally skip the redundant main-process clipboard write to avoid decoding
    // a ~30 MB NativeImage unnecessarily on every region-capture completion.

    if (payload.screenX !== undefined && payload.screenY !== undefined && mainWindow) {
      const padW = 400
      const padH = 200
      const newWidth  = Math.round(payload.logicalWidth  + padW)
      const newHeight = Math.round(payload.logicalHeight + padH)
      const finalWidth  = Math.max(900, newWidth)
      const finalHeight = Math.max(600, newHeight)

      mainWindow.setBounds({
        x:      Math.round(payload.screenX - (finalWidth  - payload.logicalWidth)  / 2),
        y:      Math.round(payload.screenY - (finalHeight - payload.logicalHeight) / 2),
        width:  finalWidth,
        height: finalHeight
      })
    }

    mainWindow?.webContents.send('screenshot-captured', payload)
    showMainWindow()
    return { success: true }
  }

  return { success: false }
})

ipcMain.handle('get-display-info', async (_event, displayId) => {
  const display = screen.getAllDisplays().find((item: any) => String(item.id) === String(displayId))
  if (!display) return null
  return {
    id:          display.id,
    scaleFactor: display.scaleFactor,
    bounds:      display.bounds,
    size:        display.size
  }
})

ipcMain.handle('get-primary-display-info', async () => {
  const display = screen.getPrimaryDisplay()
  return {
    id:          display.id,
    scaleFactor: display.scaleFactor,
    bounds:      display.bounds,
    size:        display.size
  }
})

ipcMain.handle('update-shortcuts', async (_, shortcuts) => {
  currentShortcuts = shortcuts
  registerGlobalShortcuts()
  return true
})

// ── Save image ──
// Classic dataUrl path kept for backward compat; new zero-copy buffer path also exposed.
ipcMain.handle('save-image', async (_, { dataUrl, filePath, format }: { dataUrl: string; filePath: string; format: string }) => {
  try {
    const image  = nativeImage.createFromDataURL(dataUrl)
    const buffer = (format === 'jpg' || format === 'jpeg') ? image.toJPEG(95) : image.toPNG()
    await fs.promises.writeFile(filePath, buffer) // async — does not block event loop
    return { success: true, path: filePath }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Zero-copy path: renderer sends Uint8Array (already encoded PNG/JPEG), no double encode/decode.
ipcMain.handle('save-image-buffer', async (_, { data, filePath }: { data: Uint8Array; filePath: string }) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(data))
    return { success: true, path: filePath }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Accepts both a base64 dataUrl string (legacy) and a Uint8Array (new zero-copy path).
ipcMain.handle('copy-to-clipboard', async (_, payload: string | Uint8Array) => {
  try {
    const img = typeof payload === 'string'
      ? nativeImage.createFromDataURL(payload)
      : nativeImage.createFromBuffer(Buffer.from(payload))
    clipboard.writeImage(img)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('hide-main-window', () => mainWindow?.hide())

ipcMain.handle('show-save-dialog', async () => {
  if (!mainWindow) return { canceled: true }
  return dialog.showSaveDialog(mainWindow, {
    title:       'Save Screenshot',
    defaultPath: `opensnap-${Date.now()}.png`,
    filters: [
      { name: 'PNG Image',  extensions: ['png'] },
      { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
      { name: 'WebP Image', extensions: ['webp'] }
    ]
  })
})

ipcMain.handle('show-open-dialog', async (_, options) => {
  if (!mainWindow) return { canceled: true }
  return dialog.showOpenDialog(mainWindow, options)
})

// Allowlist-gated shell.openExternal — prevents renderer from opening file://, smb://, etc.
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

ipcMain.handle('open-external', async (_, url: string) => {
  let parsed: URL
  try { parsed = new URL(url) } catch { return }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    console.warn(`open-external blocked: ${parsed.protocol}`)
    return
  }
  await shell.openExternal(url)
})

ipcMain.handle('update-tray-menu', async (_, settings: AppSettings) => {
  updateTrayMenu(settings)
  return true
})

// ── Settings IPC ──
ipcMain.handle('get-settings', async () => loadSettingsAsync())

let _lastSavedSettings: AppSettings | null = null

ipcMain.handle('save-settings', async (_, settings: AppSettings) => {
  await saveSettingsAsync(settings)
  setAutoStart(settings.autoStart, settings.startMinimized)

  // Only rebuild tray menu when relevant fields actually changed
  const prev = _lastSavedSettings
  if (!prev ||
      settings.captureHotkey   !== prev.captureHotkey ||
      settings.minimizeToTray  !== prev.minimizeToTray ||
      settings.closeToTray     !== prev.closeToTray) {
    updateTrayMenu(settings)
  }
  _lastSavedSettings = settings

  mainWindow?.webContents.send('settings-updated', settings)

  if (settings.captureHotkey !== currentShortcuts.captureScreen) {
    currentShortcuts.captureScreen = settings.captureHotkey
    registerGlobalShortcuts()
  }

  return true
})

ipcMain.handle('reset-settings', async () => {
  const fresh = { ...defaultSettings, defaultSavePath: app.getPath('pictures') }
  await saveSettingsAsync(fresh)
  setAutoStart(fresh.autoStart, fresh.startMinimized)
  currentShortcuts.captureScreen = fresh.captureHotkey
  updateTrayMenu(fresh)
  registerGlobalShortcuts()
  mainWindow?.webContents.send('settings-updated', fresh)
  return fresh
})

// ── Pin to Screen ──
// Previously used a data: URI URL which caused ~20 MB of percent-encoded data to be parsed
// by the Chromium URL machinery. Now writes to a temp file and uses loadFile().
ipcMain.handle('pin-to-screen', async (_, dataUrl: string) => {
  try {
    const image = nativeImage.createFromDataURL(dataUrl)
    const size  = image.getSize()

    const pinWindow = new BrowserWindow({
      width:       size.width  || 400,
      height:      size.height || 300,
      frame:       false,
      transparent: true,
      alwaysOnTop: true,
      resizable:   true,
      hasShadow:   true,
      webPreferences: {
        nodeIntegration:  false,
        contextIsolation: true
      }
    })

    const tmpFile = path.join(app.getPath('temp'), `opensnap-pin-${crypto.randomUUID()}.html`)
    // Sanitise the dataUrl before embedding to prevent attribute injection
    const safeHtml = `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:transparent;-webkit-app-region:drag"><img src="${dataUrl.replace(/"/g, '&quot;')}" style="width:100%;height:100%;object-fit:contain;pointer-events:none"></body></html>`
    await fs.promises.writeFile(tmpFile, safeHtml, 'utf8')

    pinWindow.loadFile(tmpFile)
    pinWindow.once('ready-to-show', () => pinWindow.show())
    pinWindow.once('closed', () => fs.unlink(tmpFile, () => {}))

    pinWindow.webContents.on('before-input-event', (_ev, input) => {
      if (input.key === 'Escape') pinWindow.close()
    })

    return true
  } catch (error) {
    console.error('Error pinning to screen:', error)
    return false
  }
})

// ── History ──
interface HistoryItem {
  id: string
  dataUrl: string
  timestamp: number
}

ipcMain.handle('get-history', async () => {
  try {
    const p = getHistoryPath()
    if (fs.existsSync(p)) {
      const data = await fs.promises.readFile(p, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading history:', error)
  }
  return []
})

ipcMain.handle('save-history', async (_, item: HistoryItem) => {
  try {
    const p = getHistoryPath()
    let history: HistoryItem[] = []
    if (fs.existsSync(p)) {
      const data = await fs.promises.readFile(p, 'utf8')
      history    = JSON.parse(data)
    }
    history.unshift(item)
    if (history.length > 50) history = history.slice(0, 50)
    await fs.promises.writeFile(p, JSON.stringify(history), 'utf8')
    return true
  } catch (error) {
    console.error('Error saving history:', error)
    return false
  }
})

ipcMain.handle('get-window-bounds', async () => null)

// ============ APP LIFECYCLE ============

app.whenReady().then(() => {
  const settings = loadSettings()

  setAutoStart(settings.autoStart, settings.startMinimized)

  if (settings.captureHotkey) {
    currentShortcuts.captureScreen = settings.captureHotkey
  }

  Menu.setApplicationMenu(null)

  // Tray and shortcuts are deferred to the 'ready-to-show' event inside createMainWindow
  // so they don't block the initial window paint.
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  // macOS: remain active until the user explicitly quits via Cmd+Q
  if (process.platform === 'darwin') return

  const settings = loadSettings()
  if (!settings.closeToTray) {
    // will-quit handler below unregisters all shortcuts
    app.quit()
  }
  // closeToTray=true: app stays alive in the tray; shortcuts remain registered
})

app.on('before-quit', () => {
  app.isQuiting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
