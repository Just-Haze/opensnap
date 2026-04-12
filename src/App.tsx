import { useState, useEffect, useRef, useCallback } from 'react'
import './index.css'

// Types
import { 
  ScreenSource, Screenshot, BackgroundSettings, 
  ShadowSettings, BorderSettings, Annotation 
} from './types'

// Constants
import { 
  DEFAULT_BACKGROUND, DEFAULT_SHADOW, DEFAULT_BORDER, 
  DEFAULT_PADDING, DEFAULT_SCALE, DEFAULT_ANNOTATION_COLOR
} from './constants'

// Utils
import { loadSettings, saveSettings, drawArrow } from './utils'

// Components
import Header from './components/Header'
import SourcePicker from './components/SourcePicker'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import Settings from './components/Settings'
import RegionOverlay from './components/RegionOverlay'
import TitleBar from './components/TitleBar'
import { Toaster, toast } from 'sonner'

export default function App() {
  // Check URL hash for different views
  const [currentView, setCurrentView] = useState<'app' | 'settings' | 'region-capture'>(() => {
    const hash = window.location.hash
    if (hash === '#settings') return 'settings'
    if (hash.startsWith('#region-capture')) return 'region-capture'
    return 'app'
  })
  
  // Load saved settings or use defaults
  const savedSettings = loadSettings()
  
  // App settings state
  const [appSettings, setAppSettings] = useState<any>(null)
  
  // Load app settings on mount
  useEffect(() => {
    const loadAppSettings = async () => {
      const settings = await window.electronAPI?.getSettings()
      if (settings) {
        setAppSettings(settings)
      }
    }
    loadAppSettings()
  }, [])
  
  // State
  const [sources, setSources] = useState<ScreenSource[]>([])
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'picker' | 'editor'>('picker')
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  
  // Editor settings (with persistence)
  const [background, setBackground] = useState<BackgroundSettings>(
    savedSettings?.background ?? DEFAULT_BACKGROUND
  )
  const [shadow, setShadow] = useState<ShadowSettings>(
    savedSettings?.shadow ?? DEFAULT_SHADOW
  )
  const [border, setBorder] = useState<BorderSettings>(
    savedSettings?.border ?? DEFAULT_BORDER
  )
  const [padding, setPadding] = useState(savedSettings?.padding ?? DEFAULT_PADDING)
  const [scale, setScale] = useState(savedSettings?.scale ?? DEFAULT_SCALE)
  
  // Panning state for absolute positioning
  const [pan, setPan] = useState<{ x: number, y: number } | null>(null)
  
  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'arrow' | 'rect' | 'circle' | 'crop' | 'hand'>('select')
  const [annotationColor, setAnnotationColor] = useState(savedSettings?.annotationColor ?? DEFAULT_ANNOTATION_COLOR)
  
  // History for Undo/Redo
  const [history, setHistory] = useState<Annotation[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 })
  const [textInputValue, setTextInputValue] = useState('')
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [draggedAnnotation, setDraggedAnnotation] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Panning state
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Cropping state
  const [isCropping, setIsCropping] = useState(false)
  const [cropRect, setCropRect] = useState<{ x: number, y: number, endX: number, endY: number } | null>(null)

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const pushToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newAnnotations])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setAnnotations([...history[newIndex]])
    }
  }, [history, historyIndex])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setAnnotations([...history[newIndex]])
    }
  }, [history, historyIndex])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'editor') {
        handleCopy(true) // Silent auto-copy on escape
        setView('picker')
        return
      }
      if ((e.ctrlKey || e.metaKey) && !showTextInput) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault()
          if (e.shiftKey) handleRedo()
          else handleUndo()
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault()
          handleRedo()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, showTextInput])

  // ============ FUNCTIONS ============

  const loadSources = async () => {
    setLoading(true)
    try {
      const availableSources = await window.electronAPI?.getSources()
      if (availableSources && availableSources.length > 0) {
        setSources(availableSources)
      } else {
        toast.error('No windows found. Try refreshing.')
      }
    } catch (error) {
      console.error('Failed to load sources:', error)
      toast.error('Failed to load windows')
    } finally {
      setLoading(false)
    }
  }

  const handleCaptureSource = async (sourceId: string) => {
    setLoading(true)
    try {
      const displayInfo = await window.electronAPI?.getPrimaryDisplayInfo()
      if (!displayInfo) return

      const { size: { width, height }, scaleFactor } = displayInfo
      
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: width * scaleFactor,
            maxWidth: width * scaleFactor,
            minHeight: height * scaleFactor,
            maxHeight: height * scaleFactor
          }
        }
      } as any

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const video = document.createElement('video')
      video.srcObject = stream
      
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play()
          resolve(true)
        }
      })

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        
        const captured = {
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          logicalWidth: width,
          logicalHeight: height
        }
        
        setScreenshot(captured)
        setView('editor')
        setAnnotations([])
        setHistory([[]])
        setHistoryIndex(0)
        setPan(null)
        
        const dpr = window.devicePixelRatio || 1
        const availableWidth = window.innerWidth - 320 - 150
        const logicalWidth = captured.logicalWidth || (captured.width / dpr)
        if (logicalWidth > availableWidth) {
          setScale(Math.max(10, Math.floor((availableWidth / logicalWidth) * 100)))
        } else {
          setScale(100)
        }
      }
      
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.error('Capture error:', error)
      toast.error('Failed to capture screen')
    } finally {
      setLoading(false)
    }
  }

  const handleCaptureFullscreen = async () => {
    setLoading(true)
    let stream: MediaStream | null = null
    
    try {
      const displayInfo = await window.electronAPI?.getPrimaryDisplayInfo()
      
      if (!displayInfo) {
        toast.error('Failed to get display info')
        setLoading(false)
        return
      }
      
      const sources = await window.electronAPI?.getScreenSources()
      const primarySource = sources?.find(s => String(s.displayId) === String(displayInfo.id))
      
      if (!primarySource) {
        toast.error('Failed to find screen source')
        setLoading(false)
        return
      }
      
      const captureWidth = displayInfo.size.width * displayInfo.scaleFactor
      const captureHeight = displayInfo.size.height * displayInfo.scaleFactor
      
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          // @ts-ignore - Electron-specific constraints
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: primarySource.id,
            minWidth: captureWidth,
            maxWidth: captureWidth,
            minHeight: captureHeight,
            maxHeight: captureHeight
          }
        }
      }
      
      stream = await navigator.mediaDevices.getUserMedia(constraints)
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = (e) => reject(e)
      })
      
      await video.play()
      
      // Wait for a stable frame
      await new Promise(resolve => setTimeout(resolve, 150))

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        
        const captured = {
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          logicalWidth: displayInfo.size.width,
          logicalHeight: displayInfo.size.height
        }
        
        setScreenshot(captured)
        setView('editor')
        setAnnotations([])
        setHistory([[]])
        setHistoryIndex(0)
        setPan(null)

        const dpr = window.devicePixelRatio || 1
        const availableWidth = window.innerWidth - 320 - 150
        const logicalWidth = captured.logicalWidth || (captured.width / dpr)
        if (logicalWidth > availableWidth) {
          setScale(Math.max(10, Math.floor((availableWidth / logicalWidth) * 100)))
        } else {
          setScale(100)
        }

        toast.success('Fullscreen captured!')
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      stream = null
    } catch (error) {
      console.error('Fullscreen capture error:', error)
      toast.error('Failed to capture fullscreen')
    } finally {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      setLoading(false)
    }
  }

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !screenshot || !img) return

    const ctx = canvas.getContext('2d', { 
      willReadFrequently: true
    })
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    
    // Use logical dimensions from the screenshot object if available.
    const logicalWidth = screenshot.logicalWidth || img.width
    const logicalHeight = screenshot.logicalHeight || img.height
    
    const scaleFactor = scale / 100
    const imgWidth = logicalWidth * scaleFactor
    const imgHeight = logicalHeight * scaleFactor
    const totalPadding = padding * 2
    const canvasWidth = imgWidth + totalPadding
    const canvasHeight = imgHeight + totalPadding

    // Set actual pixel dimensions for the canvas element (sharpness)
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    
    // Set display size in logical pixels
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`

    // Scale context so we can draw using logical coordinates
    ctx.scale(dpr, dpr)
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw background
    drawBackground(ctx, canvasWidth, canvasHeight)

    const x = padding, y = padding, w = imgWidth, h = imgHeight
    // Limit border radius to a maximum of half the smaller dimension
    const maxRadius = Math.min(w, h) / 2
    const r = Math.min(border.radius, maxRadius)
    
    const drawRoundedRect = () => {
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r)
      } else {
        drawRoundedRectOnCtx(ctx, x, y, w, h, r)
      }
      ctx.closePath()
    }

    if (shadow.enabled) {
      // For shadows, we draw the image onto an offscreen canvas first
      const offscreen = document.createElement('canvas')
      offscreen.width = canvasWidth * dpr
      offscreen.height = canvasHeight * dpr
      const offCtx = offscreen.getContext('2d')
      if (!offCtx) return

      offCtx.scale(dpr, dpr)
      offCtx.save()
      
      // Create rounded clipping path for the image
      offCtx.beginPath()
      if (typeof offCtx.roundRect === 'function') {
        offCtx.roundRect(x, y, w, h, r)
      } else {
        drawRoundedRectOnCtx(offCtx, x, y, w, h, r)
      }
      offCtx.clip()
      offCtx.drawImage(img, padding, padding, imgWidth, imgHeight)
      offCtx.restore()
      
      // Draw shadow by rendering the offscreen canvas with shadow effects
      ctx.save()
      ctx.shadowColor = `rgba(0, 0, 0, ${shadow.opacity / 100})`
      ctx.shadowBlur = shadow.blur
      ctx.shadowOffsetX = shadow.offsetX
      ctx.shadowOffsetY = shadow.offsetY
      ctx.drawImage(offscreen, 0, 0, canvasWidth, canvasHeight)
      ctx.restore()
    } else {
      ctx.save()
      drawRoundedRect()
      ctx.clip()
      ctx.drawImage(img, padding, padding, imgWidth, imgHeight)
      ctx.restore()
    }

    if (border.enabled && border.width > 0) {
      drawRoundedRect()
      ctx.strokeStyle = border.color
      ctx.lineWidth = border.width
      ctx.stroke()
    }

    // Draw all annotations
    const allAnnotations = currentAnnotation ? [...annotations, currentAnnotation] : annotations
    drawAnnotations(ctx, padding, allAnnotations)

    // Draw crop rectangle
    if (cropRect) {
      const scaleFactor = scale / 100
      const x = Math.min(cropRect.x, cropRect.endX) * scaleFactor + padding
      const y = Math.min(cropRect.y, cropRect.endY) * scaleFactor + padding
      const w = Math.abs(cropRect.endX - cropRect.x) * scaleFactor
      const h = Math.abs(cropRect.endY - cropRect.y) * scaleFactor
      
      const cropRadius = Math.min(border.radius * scaleFactor, Math.min(w, h) / 2)

      ctx.strokeStyle = '#4f46e5'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, cropRadius)
      } else {
        drawRoundedRectOnCtx(ctx, x, y, w, h, cropRadius)
      }
      ctx.stroke()
      
      ctx.fillStyle = 'rgba(79, 70, 229, 0.1)'
      ctx.fill()
      ctx.setLineDash([])
    }
  }, [screenshot, background, shadow, border, padding, scale, annotations, currentAnnotation, cropRect, isImageLoaded])

  // ============ EFFECTS ============

  // Save settings whenever they change
  useEffect(() => {
    saveSettings({ background, shadow, border, padding, scale, annotationColor })
  }, [background, shadow, border, padding, scale, annotationColor])

  // Load sources on mount and setup Electron IPC listeners
  useEffect(() => {
    loadSources()
    
    // Listen for hash changes for routing
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#settings') setCurrentView('settings')
      else if (hash.startsWith('#region-capture')) setCurrentView('region-capture')
      else setCurrentView('app')
    }
    
    window.addEventListener('hashchange', handleHashChange)
    
    // Listen for events from main process
    const unsubSources = window.electronAPI?.onSourcesAvailable?.((newSources: ScreenSource[]) => {
      setSources(newSources)
      setView('picker')
      setCurrentView('app')
    })
    
    const unsubScreenshot = window.electronAPI?.onScreenshotCaptured?.((image: Screenshot) => {
      setScreenshot(image)
      setView('editor')
      setCurrentView('app')
      setAnnotations([])
      setHistory([[]])
      setHistoryIndex(0)
      setPan(null)
      
      // Auto-fit logic
      const dpr = window.devicePixelRatio || 1
      const availableWidth = window.innerWidth - 320 - 150
      const logicalWidth = image.logicalWidth || (image.width / dpr)
      
      if (logicalWidth > availableWidth) {
        setScale(Math.max(10, Math.floor((availableWidth / logicalWidth) * 100)))
      } else {
        setScale(100)
      }
    })
    
    const unsubTrayScreenshot = window.electronAPI?.onTakeScreenshotFromTray?.(() => {
      loadSources()
      setView('picker')
      setCurrentView('app')
    })
    
    const unsubFullscreenRequest = window.electronAPI?.onRequestFullscreenCapture?.(() => {
      handleCaptureFullscreen()
    })

    const unsubSettingsUpdated = window.electronAPI?.onSettingsUpdated?.((settings: any) => {
      setAppSettings(settings)
    })
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      unsubSources?.()
      unsubScreenshot?.()
      unsubTrayScreenshot?.()
      unsubFullscreenRequest?.()
      unsubSettingsUpdated?.()
    }
  }, [])

  // Pre-load image whenever screenshot changes (Performance Optimization)
  useEffect(() => {
    if (!screenshot?.dataUrl) {
      setIsImageLoaded(false)
      imageRef.current = null
      return
    }

    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setIsImageLoaded(true)
    }
    img.src = screenshot.dataUrl
  }, [screenshot?.dataUrl])

  // Render canvas when UI state/settings change
  useEffect(() => {
    if (screenshot && view === 'editor' && isImageLoaded) {
      renderCanvas()
    }
  }, [screenshot, background, shadow, border, padding, scale, annotations, view, currentAnnotation, isImageLoaded, renderCanvas])

  const drawRoundedRectOnCtx = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (background.type === 'transparent') return
    
    if (background.type === 'solid') {
      ctx.fillStyle = background.color
      ctx.fillRect(0, 0, width, height)
    } else {
      const angle = (background.gradientAngle * Math.PI) / 180
      const centerX = width / 2, centerY = height / 2, length = Math.sqrt(width * width + height * height) / 2
      const x1 = centerX - Math.cos(angle) * length, y1 = centerY - Math.sin(angle) * length
      const x2 = centerX + Math.cos(angle) * length, y2 = centerY + Math.sin(angle) * length
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
      gradient.addColorStop(0, background.gradientStart)
      gradient.addColorStop(1, background.gradientEnd)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }
  }

  const drawAnnotations = (ctx: CanvasRenderingContext2D, offset: number, anns: Annotation[]) => {
    const scaleFactor = scale / 100

    anns.forEach(ann => {
      ctx.save()
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = ann.size * scaleFactor

      // Add highlight effect if this annotation is being dragged
      if (draggedAnnotation === ann.id) {
        ctx.shadowColor = ann.color
        ctx.shadowBlur = 8 * scaleFactor
      }

      const drawX = ann.x * scaleFactor + offset
      const drawY = ann.y * scaleFactor + offset
      const drawEndX = ann.endX !== undefined ? ann.endX * scaleFactor + offset : undefined
      const drawEndY = ann.endY !== undefined ? ann.endY * scaleFactor + offset : undefined

      switch (ann.type) {
        case 'text':
          const fontSize = (16 + ann.size * 2) * scaleFactor
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
          ctx.fillText(ann.text || 'Text', drawX, drawY)
          
          // Add selection outline for text when dragged
          if (draggedAnnotation === ann.id && ann.text) {
            const dimensions = getTextDimensions(ann.text, 16 + ann.size * 2)
            ctx.strokeStyle = ann.color
            ctx.lineWidth = 1 * scaleFactor
            ctx.strokeRect(
              drawX - 2 * scaleFactor, 
              drawY - (dimensions.height * scaleFactor) - 2 * scaleFactor, 
              dimensions.width * scaleFactor + 4 * scaleFactor, 
              dimensions.height * scaleFactor + 4 * scaleFactor
            )
          }
          break
        case 'arrow':
          if (drawEndX !== undefined && drawEndY !== undefined) {
            drawArrow(ctx, drawX, drawY, drawEndX, drawEndY, ann.size * scaleFactor)
          }
          break
        case 'rect':
          if (drawEndX !== undefined && drawEndY !== undefined) {
            ctx.strokeRect(
              Math.min(drawX, drawEndX), 
              Math.min(drawY, drawEndY), 
              Math.abs(drawEndX - drawX), 
              Math.abs(drawEndY - drawY)
            )
          }
          break
        case 'circle':
          if (drawEndX !== undefined && drawEndY !== undefined) {
            ctx.beginPath()
            ctx.ellipse(
              (drawX + drawEndX) / 2, 
              (drawY + drawEndY) / 2, 
              Math.abs(drawEndX - drawX) / 2, 
              Math.abs(drawEndY - drawY) / 2, 
              0, 0, Math.PI * 2
            )
            ctx.stroke()
          }
          break
      }
      ctx.restore()
    })
  }

  // Helper function to get text dimensions
  const getTextDimensions = (text: string, fontSize: number = 16) => {
    // Create a temporary canvas to measure text
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
    const metrics = ctx.measureText(text)
    return {
      width: metrics.width,
      height: fontSize * 1.2 // Approximate line height
    }
  }

  // Helper function to check distance from a point to a line segment
  const pointToSegmentDistance = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
    const dx = bx - ax, dy = by - ay
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.hypot(px - ax, py - ay)
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
  }

  // Helper function to check if point hits an annotation
  const getAnnotationAtPoint = (x: number, y: number): Annotation | null => {
    const HIT_TOLERANCE = 8 // px in logical image space
    // Check in reverse order to prioritize top annotations
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i]
      
      if (ann.type === 'text' && ann.text) {
        const dimensions = getTextDimensions(ann.text, 16 + ann.size * 2)
        const pad = HIT_TOLERANCE
        
        if (x >= ann.x - pad && 
            x <= ann.x + dimensions.width + pad && 
            y >= ann.y - dimensions.height - pad && 
            y <= ann.y + pad) {
          return ann
        }
      } else if (ann.endX !== undefined && ann.endY !== undefined) {
        if (ann.type === 'arrow') {
          // Hit test: distance from pointer to arrow line segment
          const dist = pointToSegmentDistance(x, y, ann.x, ann.y, ann.endX, ann.endY)
          if (dist <= HIT_TOLERANCE + ann.size * 2) return ann
        } else if (ann.type === 'circle') {
          // Hit test: distance from pointer to ellipse outline
          const cx = (ann.x + ann.endX) / 2
          const cy = (ann.y + ann.endY) / 2
          const rx = Math.abs(ann.endX - ann.x) / 2
          const ry = Math.abs(ann.endY - ann.y) / 2
          if (rx > 0 && ry > 0) {
            // Normalize point to unit ellipse
            const nx = (x - cx) / rx
            const ny = (y - cy) / ry
            const distFromEllipse = Math.abs(Math.hypot(nx, ny) - 1) * Math.min(rx, ry)
            if (distFromEllipse <= HIT_TOLERANCE + ann.size) return ann
          }
        } else {
          // rect: check within bounding box with tolerance
          const minX = Math.min(ann.x, ann.endX) - HIT_TOLERANCE
          const maxX = Math.max(ann.x, ann.endX) + HIT_TOLERANCE
          const minY = Math.min(ann.y, ann.endY) - HIT_TOLERANCE
          const maxY = Math.max(ann.y, ann.endY) + HIT_TOLERANCE
          
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            return ann
          }
        }
      }
    }
    return null
  }

  const getLogicalCoordinates = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleFactor = scale / 100
    
    // Calculate logical position on the canvas (0,0 is the top-left of the image)
    // We subtract padding and then un-scale it.
    const x = (clientX - rect.left - padding) / scaleFactor
    const y = (clientY - rect.top - padding) / scaleFactor
    
    return { x, y }
  }

  // Use refs to avoid dependency remounts on every zoom tick
  const panRef = useRef(pan)
  const scaleRef = useRef(scale)
  
  // CRITICAL: Synchronize external state modifications back into the refs
  // (e.g. auto-fit on load, sidebar slider, hand tool panning)
  useEffect(() => {
    panRef.current = pan
    scaleRef.current = scale
  }, [pan, scale])
  

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault()

      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= 20 // line mode
      if (e.deltaMode === 2) delta *= 300 // page mode

      const currentScale = scaleRef.current
      const currentPan = panRef.current

      // Small steps per event — no accumulation, no scroll debt
      const zoomFactor = Math.exp(-delta * 0.0008)
      const rawScale = currentScale * zoomFactor
      const newScale = Math.max(10, Math.min(100, Math.round(rawScale * 100) / 100))

      if (newScale === currentScale) return

      const rect = container.getBoundingClientRect()
      const pointerX = e.clientX - rect.left
      const pointerY = e.clientY - rect.top

      let currentPanX = 0
      let currentPanY = 0

      if (currentPan) {
        currentPanX = currentPan.x
        currentPanY = currentPan.y
      } else {
        const canvasEl = canvasRef.current
        if (canvasEl) {
          currentPanX = rect.width / 2 - canvasEl.offsetWidth / 2
          currentPanY = rect.height / 2 - canvasEl.offsetHeight / 2
        }
      }

      const canvasX = pointerX - currentPanX
      const canvasY = pointerY - currentPanY
      const scaleRatio = newScale / currentScale

      const newCanvasX = (canvasX - padding) * scaleRatio + padding
      const newCanvasY = (canvasY - padding) * scaleRatio + padding

      const newPan = { x: pointerX - newCanvasX, y: pointerY - newCanvasY }

      // Sync refs immediately so next event sees updated values
      panRef.current = newPan
      scaleRef.current = newScale

      setPan(newPan)
      setScale(newScale)
    }

    container.addEventListener('wheel', handleWheelNative, { passive: false })
    return () => container.removeEventListener('wheel', handleWheelNative)
  }, [padding, view, screenshot])

  const startPanning = (clientX: number, clientY: number) => {
    setIsPanning(true)
    setLastMousePos({ x: clientX, y: clientY })
    if (pan === null && containerRef.current && canvasRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPan({
        x: rect.width / 2 - canvasRef.current.offsetWidth / 2,
        y: rect.height / 2 - canvasRef.current.offsetHeight / 2
      })
    }
  }

  // Zoom around the viewport center when using the sidebar slider
  const handleScaleChange = (newScale: number) => {
    if (!containerRef.current || !canvasRef.current) {
      setScale(newScale)
      return
    }

    const currentScale = scaleRef.current
    if (newScale === currentScale) return

    const rect = containerRef.current.getBoundingClientRect()
    // Use the viewport center as the focal point
    const pointerX = rect.width / 2
    const pointerY = rect.height / 2

    const currentPan = panRef.current
    let currentPanX = currentPan ? currentPan.x : rect.width / 2 - canvasRef.current.offsetWidth / 2
    let currentPanY = currentPan ? currentPan.y : rect.height / 2 - canvasRef.current.offsetHeight / 2

    const canvasX = pointerX - currentPanX
    const canvasY = pointerY - currentPanY
    const scaleRatio = newScale / currentScale

    const newCanvasX = (canvasX - padding) * scaleRatio + padding
    const newCanvasY = (canvasY - padding) * scaleRatio + padding

    const newPan = { x: pointerX - newCanvasX, y: pointerY - newCanvasY }

    panRef.current = newPan
    scaleRef.current = newScale

    setPan(newPan)
    setScale(newScale)
  }


  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      startPanning(e.clientX, e.clientY)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    
    const { x, y } = getLogicalCoordinates(e.clientX, e.clientY)

    if (selectedTool === 'hand') {
      startPanning(e.clientX, e.clientY)
      return
    }

    if (selectedTool === 'crop') {
      setIsCropping(true)
      setCropRect({ x, y, endX: x, endY: y })
      return
    }

    if (selectedTool === 'select') {
      const clickedAnnotation = getAnnotationAtPoint(x, y)
      
      if (clickedAnnotation) {
        setIsDragging(true)
        setDraggedAnnotation(clickedAnnotation.id)
        setDragOffset({
          x: x - clickedAnnotation.x,
          y: y - clickedAnnotation.y
        })
      } else {
        startPanning(e.clientX, e.clientY)
      }
      return
    }
    
    setIsDrawing(true)
    
    if (selectedTool === 'text') {
      setTextInputPosition({ x: e.clientX, y: e.clientY })
      setTextInputValue('')
      setShowTextInput(true)
      setIsDrawing(false)
    } else {
      setCurrentAnnotation({
        id: 'current', type: selectedTool, x, y, endX: x, endY: y, color: annotationColor, size: 4
      } as Annotation)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      setPan(prev => prev ? { x: prev.x + dx, y: prev.y + dy } : null)
      setLastMousePos({ x: e.clientX, y: e.clientY })
      return
    }

    if (!canvasRef.current) return
    
    const { x, y } = getLogicalCoordinates(e.clientX, e.clientY)

    if (isCropping && cropRect) {
      setCropRect({ ...cropRect, endX: x, endY: y })
      return
    }

    // Handle dragging annotations
    if (isDragging && draggedAnnotation) {
      setAnnotations(prevAnnotations => 
        prevAnnotations.map(ann => {
          if (ann.id === draggedAnnotation) {
            const newX = x - dragOffset.x
            const newY = y - dragOffset.y
            const dx = newX - ann.x
            const dy = newY - ann.y
            
            return {
              ...ann,
              x: newX,
              y: newY,
              endX: ann.endX !== undefined ? ann.endX + dx : undefined,
              endY: ann.endY !== undefined ? ann.endY + dy : undefined
            }
          }
          return ann
        })
      )
      return
    }

    // Handle drawing new annotations
    if (isDrawing && currentAnnotation) {
      setCurrentAnnotation({ ...currentAnnotation, endX: x, endY: y })
    }
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (isCropping) {
      setIsCropping(false)
      return
    }

    // End dragging
    if (isDragging) {
      setIsDragging(false)
      setDraggedAnnotation(null)
      setDragOffset({ x: 0, y: 0 })
      pushToHistory(annotations)
      return
    }

    // End drawing
    if (isDrawing && currentAnnotation && currentAnnotation.type !== 'text') {
      const width = currentAnnotation.endX !== undefined ? Math.abs(currentAnnotation.endX - currentAnnotation.x) : 0
      const height = currentAnnotation.endY !== undefined ? Math.abs(currentAnnotation.endY - currentAnnotation.y) : 0
      
      if (width > 2 || height > 2) {
        const newAnnotations = [...annotations, { ...currentAnnotation, id: Date.now().toString() }]
        setAnnotations(newAnnotations)
        pushToHistory(newAnnotations)
      }
    }
    setIsDrawing(false)
    setCurrentAnnotation(null)
  }

  const handleCrop = () => {
    if (!cropRect || !screenshot) return

    const minX = Math.min(cropRect.x, cropRect.endX)
    const minY = Math.min(cropRect.y, cropRect.endY)
    const width = Math.abs(cropRect.endX - cropRect.x)
    const height = Math.abs(cropRect.endY - cropRect.y)

    if (width < 5 || height < 5) {
      setCropRect(null)
      return
    }

    const img = new Image()
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1
      const logicalWidth = screenshot.logicalWidth || (img.width / dpr)
      const scaleToPhysical = img.width / logicalWidth

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      const cropX = minX * scaleToPhysical
      const cropY = minY * scaleToPhysical
      const cropW = width * scaleToPhysical
      const cropH = height * scaleToPhysical

      canvas.width = cropW
      canvas.height = cropH
      
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
      
      const newScreenshot: Screenshot = {
        dataUrl: canvas.toDataURL('image/png'),
        width: cropW,
        height: cropH,
        logicalWidth: width,
        logicalHeight: height
      }
      
      setScreenshot(newScreenshot)
      setAnnotations([])
      setHistory([[]])
      setHistoryIndex(0)
      setCropRect(null)
      setSelectedTool('select')

      // Calculate auto-fit scale now that we know the cropped logical dimensions
      const availableWidth = window.innerWidth - 320 - 150
      const logicalW = width
      if (logicalW > availableWidth) {
        setScale(Math.max(10, Math.floor((availableWidth / logicalW) * 100)))
      } else {
        setScale(100)
      }
      // Reset pan last so the centering logic kicks in cleanly on the new scale
      setPan(null)

      toast.success('Image cropped')
    }
    img.src = screenshot.dataUrl
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInputValue.trim()) {
      setShowTextInput(false)
      return
    }

    if (!canvasRef.current) return
    
    const { x, y } = getLogicalCoordinates(textInputPosition.x, textInputPosition.y)

    const newAnnotations: Annotation[] = [...annotations, {
      id: Date.now().toString(),
      type: 'text', 
      x, 
      y, 
      text: textInputValue.trim(), 
      color: annotationColor, 
      size: 4
    }]
    setAnnotations(newAnnotations)
    pushToHistory(newAnnotations)
    
    setShowTextInput(false)
    setTextInputValue('')
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const result = await window.electronAPI?.showSaveDialog()
    if (result && result.filePath) {
      // Export at full resolution (including DPR)
      const dataUrl = canvas.toDataURL('image/png')
      const format = result.filePath.endsWith('.jpg') || result.filePath.endsWith('.jpeg') ? 'jpg' : 'png'
      await window.electronAPI?.saveImage({ 
        dataUrl, 
        filePath: result.filePath,
        format
      })
      toast.success('Screenshot saved!')
    }
  }

  const handleCopy = async (quiet = false) => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Export at full resolution
    const dataUrl = canvas.toDataURL('image/png')
    await window.electronAPI?.copyToClipboard(dataUrl)
    if (!quiet) {
      toast.success('Copied to clipboard!')
      // Hide the window after explicit copy — the image is safe in clipboard
      window.electronAPI?.hideMainWindow()
    }
  }

  const handleCaptureRegion = async () => {
    try {
      await window.electronAPI?.captureRegion()
    } catch (error) {
      console.error('Failed to start region capture:', error)
      toast.error('Failed to start region capture')
    }
  }

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  const onClearAnnotations = () => {
    setAnnotations([])
    pushToHistory([])
  }

  // Show settings view
  if (currentView === 'settings') {
    return (
      <>
        <Toaster position="top-center" expand={false} richColors />
        <Settings
          onClose={() => {
            window.location.hash = ''
            setCurrentView('app')
          }}
        />
      </>
    )
  }

  // Show region capture view
  if (currentView === 'region-capture') {
    const params = new URLSearchParams(window.location.hash.split('?')[1])
    const displayId = params.get('display') || '0'
    
    return (
      <>
        <RegionOverlay displayId={displayId} />
      </>
    )
  }

  if (view === 'editor' && screenshot) {
    return (
      <div className="h-full flex flex-col bg-zinc-950 overflow-hidden selection:bg-indigo-500/30">
        <TitleBar 
          onOpenSettings={() => {
            window.location.hash = 'settings'
            setCurrentView('settings')
          }}
          onCaptureRegion={handleCaptureRegion}
        />
        <Toaster position="top-center" expand={false} richColors />
        
        <div className="flex-1 flex overflow-hidden">
          <div 
            ref={containerRef}
            onMouseDown={handleContainerMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex-1 relative overflow-hidden bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:32px_32px] ${isPanning ? 'cursor-grabbing' : ''}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            
            <div 
              className={`absolute animate-in zoom-in-95 fade-in ${background.type === 'transparent' ? 'transparent-checkerboard' : ''} rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)]`}
              style={{
                left: pan ? pan.x : '50%',
                top: pan ? pan.y : '50%',
                transform: pan ? 'none' : 'translate(-50%, -50%)'
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                className={`block transition-shadow duration-500 ${
                  selectedTool === 'hand' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') :
                  selectedTool === 'select' ? (isDragging ? 'cursor-grabbing' : 'cursor-default') : 
                  'cursor-crosshair'
                }`}
              />

              {/* Crop Actions */}
              {selectedTool === 'crop' && cropRect && !isCropping && (
                <div 
                  className="absolute z-50 flex gap-2 animate-in fade-in zoom-in-95 duration-200"
                  style={{
                    left: Math.min(cropRect.x, cropRect.endX) * (scale / 100) + padding,
                    top: Math.max(cropRect.y, cropRect.endY) * (scale / 100) + padding + 10
                  }}
                >
                  {Math.abs(cropRect.endX - cropRect.x) > 5 && Math.abs(cropRect.endY - cropRect.y) > 5 && (
                    <button
                      onClick={handleCrop}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-500 transition-colors"
                    >
                      Confirm Crop
                    </button>
                  )}
                  <button
                    onClick={() => setCropRect(null)}
                    className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            {/* Text Input Modal */}
            {showTextInput && (
              <div 
                className="fixed bg-zinc-900 border border-white/10 rounded-lg p-3 z-50 shadow-2xl"
                style={{
                  left: textInputPosition.x,
                  top: textInputPosition.y - 50
                }}
              >
                <form onSubmit={handleTextSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    placeholder="Enter text..."
                    className="px-3 py-2 bg-zinc-800 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-500 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTextInput(false)}
                    className="px-3 py-2 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}
            
            <Toolbar 
              selectedTool={selectedTool} setSelectedTool={setSelectedTool}
              annotationColor={annotationColor} setAnnotationColor={setAnnotationColor}
              onSave={handleSave} onCopy={handleCopy}
              onClearAnnotations={onClearAnnotations}
              onBackToPicker={() => {
                handleCopy(true) // Silent auto-copy when going back
                setView('picker')
              }}
              onUndo={handleUndo} onRedo={handleRedo}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
            />
          </div>

          <Sidebar 
            background={background} setBackground={setBackground}
            shadow={shadow} setShadow={setShadow}
            border={border} setBorder={setBorder}
            padding={padding} setPadding={setPadding}
            scale={scale} setScale={handleScaleChange}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950">
      <TitleBar 
        onOpenSettings={() => {
          window.location.hash = 'settings'
          setCurrentView('settings')
        }}
        onCaptureRegion={handleCaptureRegion}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar animate-mesh">
        <div className="min-h-full w-full bg-zinc-950/40 backdrop-blur-[2px]">
          <Toaster position="top-center" expand={false} richColors />
          <Header 
            onCaptureFullscreen={handleCaptureFullscreen}
            onCaptureRegion={handleCaptureRegion}
            loading={loading}
            currentHotkey={appSettings?.captureHotkey || 'Ctrl+Shift+S'}
          />
          <SourcePicker 
            sources={sources} loading={loading} 
            onCaptureSource={handleCaptureSource} onRefresh={loadSources} 
          />
        </div>
      </div>
    </div>
  )
}
