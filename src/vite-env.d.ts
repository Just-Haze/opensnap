/// <reference types="vite/client" />

interface ElectronAPI {
  getSources: () => Promise<{ id: string; name: string; thumbnail: string }[]>
  captureSource: (sourceId: string) => Promise<{ dataUrl: string; width: number; height: number } | null>
  captureFullscreen: () => Promise<{ dataUrl: string; width: number; height: number } | null>
  saveImage: (options: { dataUrl: string; filePath: string; format: string }) => Promise<{ success: boolean; path?: string; error?: string }>
  copyToClipboard: (dataUrl: string) => Promise<{ success: boolean; error?: string }>
  showSaveDialog: () => Promise<{ canceled: boolean; filePath?: string }>
  openExternal: (url: string) => Promise<void>
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  onSourcesAvailable: (callback: (sources: { id: string; name: string; thumbnail: string }[]) => void) => () => void
  onScreenshotCaptured: (callback: (image: { dataUrl: string; width: number; height: number }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
