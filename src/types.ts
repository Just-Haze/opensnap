export interface ScreenSource {
  id: string
  name: string
  thumbnail: string
  icon?: string  // Base64 encoded app icon
}

export interface Screenshot {
  dataUrl: string
  width: number
  height: number
  logicalWidth?: number
  logicalHeight?: number
}

export interface BackgroundSettings {
  type: 'transparent' | 'solid' | 'gradient'
  color: string
  gradientStart: string
  gradientEnd: string
  gradientAngle: number
}

export interface ShadowSettings {
  enabled: boolean
  blur: number
  offsetX: number
  offsetY: number
  opacity: number
}

export interface BorderSettings {
  enabled: boolean
  radius: number
  width: number
  color: string
}

export interface Annotation {
  id: string
  type: 'text' | 'arrow' | 'rect' | 'circle'
  x: number
  y: number
  endX?: number
  endY?: number
  text?: string
  color: string
  size: number
}
