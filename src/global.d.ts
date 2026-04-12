declare global {
  interface Window {
    electronAPI?: {
      // Screenshot Capture
      getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string; icon?: string; displayId?: string }>>
      captureRegion: () => Promise<boolean>
      regionCaptureHide: () => Promise<boolean>
      regionCaptureReady: (displayId: number) => Promise<boolean>
      regionCaptureComplete: (payload: { dataUrl: string; width: number; height: number; logicalWidth: number; logicalHeight: number }) => Promise<{ success: boolean }>
      regionCaptureCancel: () => Promise<boolean>
      getRegionCaptureData: (displayId?: number) => Promise<{ id: number; screenshot: string; width: number; height: number; scaleFactor: number; physicalWidth: number; physicalHeight: number } | null>
      getDisplayInfo: (displayId: number) => Promise<{ id: number; scaleFactor: number; bounds: { x: number; y: number; width: number; height: number }; size: { width: number; height: number } } | null>
      getPrimaryDisplayInfo: () => Promise<{ id: number; scaleFactor: number; bounds: { x: number; y: number; width: number; height: number }; size: { width: number; height: number } }>
      getScreenSources: () => Promise<Array<{ id: string; name: string; displayId: string }>>
      getWindowInfo: (sourceId: string) => Promise<{ id: string; name: string; width: number; height: number; scaleFactor: number } | null>
      
      // Window Controls (for custom title bar)
      windowMinimize: () => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>
      windowIsMaximized: () => Promise<boolean>
      hideMainWindow: () => Promise<void>
      
      // File Operations
      saveImage: (options: { dataUrl: string; filePath: string; format: string }) => Promise<boolean>
      copyToClipboard: (dataUrl: string) => Promise<void>
      showSaveDialog: () => Promise<{ filePath?: string; format?: string } | null>
      showOpenDialog: (options: { properties: string[]; title: string }) => Promise<{ canceled: boolean; filePaths: string[] } | null>
      
      // Settings Management
      getSettings: () => Promise<{
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
      } | null>
      saveSettings: (settings: {
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
      }) => Promise<boolean>
      resetSettings: () => Promise<{
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
      } | null>
      updateTrayMenu: (settings: any) => Promise<boolean>
      
      // External Links
      openExternal: (url: string) => Promise<void>
      
      // Event Listeners
      onSourcesAvailable?: (callback: (sources: Array<{ id: string; name: string; thumbnail: string; icon?: string }>) => void) => () => void
      onScreenshotCaptured?: (callback: (image: { dataUrl: string; width: number; height: number; logicalWidth?: number; logicalHeight?: number }) => void) => () => void
      onRequestFullscreenCapture?: (callback: () => void) => () => void
      onSettingsUpdated?: (callback: (settings: any) => void) => () => void
      onTakeScreenshotFromTray?: (callback: () => void) => () => void
      onWindowMaximizedChange?: (callback: (isMaximized: boolean) => void) => () => void
    }
  }
}

export {}