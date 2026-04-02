declare global {
  interface Window {
    electronAPI?: {
      // Screenshot Capture
      getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string; icon?: string }>>
      captureSource: (sourceId: string) => Promise<{ dataUrl: string; width: number; height: number; logicalWidth: number; logicalHeight: number } | null>
      captureFullscreen: () => Promise<{ dataUrl: string; width: number; height: number; logicalWidth: number; logicalHeight: number } | null>
      
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
      
      // External Links
      openExternal: (url: string) => Promise<void>
      
      // Event Listeners
      onSourcesAvailable?: (callback: (sources: Array<{ id: string; name: string; thumbnail: string; icon?: string }>) => void) => () => void
      onScreenshotCaptured?: (callback: (image: { dataUrl: string; width: number; height: number; logicalWidth?: number; logicalHeight?: number }) => void) => () => void
      onTakeScreenshotFromTray?: (callback: () => void) => () => void
    }
  }
}

export {}