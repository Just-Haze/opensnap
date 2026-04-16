import { BackgroundSettings, ShadowSettings, BorderSettings } from './types'

export const GRADIENT_PRESETS = [
  { start: '#667eea', end: '#764ba2', name: 'Purple Dream' },
  { start: '#f093fb', end: '#f5576c', name: 'Pink Sunset' },
  { start: '#4facfe', end: '#00f2fe', name: 'Ocean Blue' },
  { start: '#43e97b', end: '#38f9d7', name: 'Fresh Mint' },
  { start: '#fa709a', end: '#fee140', name: 'Warm Glow' },
  { start: '#a8edea', end: '#fed6e3', name: 'Cotton Candy' },
  { start: '#1a1a2e', end: '#16213e', name: 'Dark Night' },
  { start: '#ee0979', end: '#ff6a00', name: 'Fire' },
  { start: '#11998e', end: '#38ef7d', name: 'Emerald' },
  { start: '#fc466b', end: '#3f5efb', name: 'Vivid' },
  { start: '#c471f5', end: '#fa71cd', name: 'Lavender' },
  { start: '#0052D4', end: '#6FB1FC', name: 'Sky' }
]

export const SOLID_COLORS = [
  '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da',
  '#6c757d', '#495057', '#343a40', '#212529', '#000000',
  '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7',
  '#748ffc', '#da77f2', '#f783ac', '#20c997', '#fd7e14'
]

export const ANNOTATION_COLORS = [
  '#ff0000', '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c',
  '#4dabf7', '#748ffc', '#da77f2', '#ffffff', '#000000'
]

// Default settings
export const DEFAULT_BACKGROUND: BackgroundSettings = {
  type: 'gradient',
  color: '#ffffff',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  gradientAngle: 135
}

export const DEFAULT_SHADOW: ShadowSettings = {
  enabled: true,
  blur: 40,
  offsetX: 0,
  offsetY: 20,
  opacity: 30,
  isShadowBackdrop: false
}

export const DEFAULT_BORDER: BorderSettings = {
  enabled: true,
  radius: 12,
  width: 1,
  color: '#ffffff'
}

export const DEFAULT_PADDING = 32
export const DEFAULT_SCALE = 50
export const DEFAULT_ANNOTATION_COLOR = '#ff0000'

export const STORAGE_KEY = 'opensnap-settings'
