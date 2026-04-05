import { STORAGE_KEY } from './constants'

export function loadSettings() {
  try {
    if (typeof localStorage === 'undefined') return null
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    // Failed to load settings, return null
  }
  return null
}

export function saveSettings(settings: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    // Failed to save settings, silently handle
  }
}

export const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) => {
  const headLength = 15 + size * 2
  const angle = Math.atan2(y2 - y1, x2 - x1)
  
  // Draw line
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  
  // Draw arrowhead
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6))
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6))
  ctx.stroke()
}
