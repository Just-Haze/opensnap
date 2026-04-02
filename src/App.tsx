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
import { Toaster, toast } from 'sonner'

export default function App() {
  // Check if we should show settings (from URL hash)
  const [currentView, setCurrentView] = useState<'app' | 'settings'>(() => {
    return window.location.hash === '#settings' ? 'settings' : 'app'
  })
  
  // Load saved settings or use defaults
  const savedSettings = loadSettings()
  
  // State
  const [sources, setSources] = useState<ScreenSource[]>([])
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'picker' | 'editor'>('picker')
  
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
  
  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'arrow' | 'rect' | 'circle'>('select')
  const [annotationColor, setAnnotationColor] = useState(savedSettings?.annotationColor ?? DEFAULT_ANNOTATION_COLOR)
  
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

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // ============ EFFECTS ============

  // Save settings whenever they change
  useEffect(() => {
    saveSettings({ background, shadow, border, padding, scale, annotationColor })
  }, [background, shadow, border, padding, scale, annotationColor])

  // Load sources on mount
  useEffect(() => {
    loadSources()
    
    // Listen for hash changes for routing
    const handleHashChange = () => {
      setCurrentView(window.location.hash === '#settings' ? 'settings' : 'app')
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
      
      // Auto-fit logic:
      // Calculate how much space we have (window width - sidebar - margins)
      // Sidebar is 320px, we use p-12 (48px) each side.
      const dpr = window.devicePixelRatio || 1
      const availableWidth = window.innerWidth - 320 - 150 // subtract extra margin
      const logicalWidth = image.logicalWidth || (image.width / dpr)
      
      if (logicalWidth > availableWidth) {
        const fitScale = Math.floor((availableWidth / logicalWidth) * 100)
        setScale(Math.max(10, fitScale)) // Don't go below 10%
      } else {
        setScale(100)
      }
    })
    
    const unsubTrayScreenshot = window.electronAPI?.onTakeScreenshotFromTray?.(() => {
      // Handle tray screenshot request - show source picker
      loadSources()
      setView('picker')
      setCurrentView('app')
    })
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      unsubSources?.()
      unsubScreenshot?.()
      unsubTrayScreenshot?.()
    }
  }, [])

  // Render canvas when settings change
  useEffect(() => {
    if (screenshot && view === 'editor') {
      renderCanvas()
    }
  }, [screenshot, background, shadow, border, padding, scale, annotations, view, currentAnnotation])

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
      toast.error('Failed to load sources')
    }
    setLoading(false)
  }

  const handleCaptureSource = async (sourceId: string) => {
    setLoading(true)
    try {
      const captured = await window.electronAPI?.captureSource(sourceId) as Screenshot | null
      if (captured) {
        setScreenshot(captured)
        setView('editor')
        setAnnotations([])
        
        // Auto-fit logic
        const dpr = window.devicePixelRatio || 1
        const availableWidth = window.innerWidth - 320 - 150
        const logicalWidth = captured.logicalWidth || (captured.width / dpr)
        if (logicalWidth > availableWidth) {
          setScale(Math.floor((availableWidth / logicalWidth) * 100))
        } else {
          setScale(100)
        }
        
        toast.success('Screenshot captured!')
      } else {
        toast.error('Failed to capture screenshot')
      }
    } catch (error) {
      toast.error('Failed to capture screenshot')
    }
    setLoading(false)
  }

  const handleCaptureFullscreen = async () => {
    setLoading(true)
    try {
      const captured = await window.electronAPI?.captureFullscreen() as Screenshot | null
      if (captured && captured.dataUrl) {
        setScreenshot(captured)
        setView('editor')
        setAnnotations([])

        // Auto-fit logic
        const dpr = window.devicePixelRatio || 1
        const availableWidth = window.innerWidth - 320 - 150
        const logicalWidth = captured.logicalWidth || (captured.width / dpr)
        if (logicalWidth > availableWidth) {
          setScale(Math.floor((availableWidth / logicalWidth) * 100))
        } else {
          setScale(100)
        }

        toast.success('Fullscreen captured!')
      } else {
        toast.error('Failed to capture')
      }
    } catch (error) {
      toast.error('Failed to capture fullscreen')
    }
    setLoading(false)
  }

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !screenshot) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Load image
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      
      const dpr = window.devicePixelRatio || 1
      
      // Use logical dimensions from the screenshot object if available.
      // If not available, use the image's natural dimensions as logical size.
      // The screenshot capture should have provided correct logical dimensions.
      const logicalWidth = screenshot.logicalWidth || img.width
      const logicalHeight = screenshot.logicalHeight || img.height
      
      // On first load of a screenshot, if it's too big for the current window,
      // we can automatically scale it down so it fits nicely.
      // But for now, let's just use the 'scale' state.
      
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

      if (background.type === 'transparent' && shadow.enabled) {
        // Create offscreen canvas with proper high-DPI handling
        const offscreen = document.createElement('canvas')
        offscreen.width = canvas.width
        offscreen.height = canvas.height
        const offCtx = offscreen.getContext('2d')!
        offCtx.scale(dpr, dpr)
        
        // Draw the image with rounded corners to the offscreen canvas
        offCtx.save()
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
        if (shadow.enabled) {
          ctx.save()
          ctx.shadowColor = `rgba(0, 0, 0, ${shadow.opacity / 100})`
          ctx.shadowBlur = shadow.blur
          ctx.shadowOffsetX = shadow.offsetX
          ctx.shadowOffsetY = shadow.offsetY
          drawRoundedRect()
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.restore()
        }

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
    }
    img.src = screenshot.dataUrl
  }, [screenshot, background, shadow, border, padding, scale, annotations, currentAnnotation])

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
    anns.forEach(ann => {
      ctx.save()
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = ann.size

      // Add highlight effect if this annotation is being dragged
      if (draggedAnnotation === ann.id) {
        ctx.shadowColor = ann.color
        ctx.shadowBlur = 8
      }

      switch (ann.type) {
        case 'text':
          ctx.font = `bold ${16 + ann.size * 2}px system-ui, -apple-system, sans-serif`
          ctx.fillText(ann.text || 'Text', ann.x + offset, ann.y + offset)
          
          // Add selection outline for text when dragged
          if (draggedAnnotation === ann.id && ann.text) {
            const dimensions = getTextDimensions(ann.text, 16 + ann.size * 2)
            ctx.strokeStyle = ann.color
            ctx.lineWidth = 1
            ctx.strokeRect(
              ann.x + offset - 2, 
              ann.y + offset - dimensions.height - 2, 
              dimensions.width + 4, 
              dimensions.height + 4
            )
          }
          break
        case 'arrow':
          if (ann.endX !== undefined && ann.endY !== undefined) {
            drawArrow(ctx, ann.x + offset, ann.y + offset, ann.endX + offset, ann.endY + offset, ann.size)
          }
          break
        case 'rect':
          if (ann.endX !== undefined && ann.endY !== undefined) {
            ctx.strokeRect(
              Math.min(ann.x, ann.endX) + offset, 
              Math.min(ann.y, ann.endY) + offset, 
              Math.abs(ann.endX - ann.x), 
              Math.abs(ann.endY - ann.y)
            )
          }
          break
        case 'circle':
          if (ann.endX !== undefined && ann.endY !== undefined) {
            ctx.beginPath()
            ctx.ellipse(
              (ann.x + ann.endX) / 2 + offset, 
              (ann.y + ann.endY) / 2 + offset, 
              Math.abs(ann.endX - ann.x) / 2, 
              Math.abs(ann.endY - ann.y) / 2, 
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

  // Helper function to check if point hits an annotation
  const getAnnotationAtPoint = (x: number, y: number): Annotation | null => {
    // Check in reverse order to prioritize top annotations
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i]
      
      if (ann.type === 'text' && ann.text) {
        const dimensions = getTextDimensions(ann.text, 16 + ann.size * 2)
        const padding = 4 // Add some padding for easier clicking
        
        if (x >= ann.x - padding && 
            x <= ann.x + dimensions.width + padding && 
            y >= ann.y - dimensions.height - padding && 
            y <= ann.y + padding) {
          return ann
        }
      } else if (ann.endX !== undefined && ann.endY !== undefined) {
        // For shapes, check if within bounds
        const minX = Math.min(ann.x, ann.endX)
        const maxX = Math.max(ann.x, ann.endX)
        const minY = Math.min(ann.y, ann.endY)
        const maxY = Math.max(ann.y, ann.endY)
        
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return ann
        }
      }
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const x = (e.clientX - rect.left) * scaleX - padding
    const y = (e.clientY - rect.top) * scaleY - padding

    if (selectedTool === 'select') {
      const clickedAnnotation = getAnnotationAtPoint(x, y)
      
      if (clickedAnnotation) {
        // Start dragging the annotation
        setIsDragging(true)
        setDraggedAnnotation(clickedAnnotation.id)
        setDragOffset({
          x: x - clickedAnnotation.x,
          y: y - clickedAnnotation.y
        })
      } else {
        // Clear any existing selection
        setDraggedAnnotation(null)
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
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const x = (e.clientX - rect.left) * scaleX - padding
    const y = (e.clientY - rect.top) * scaleY - padding

    // Handle dragging annotations
    if (isDragging && draggedAnnotation) {
      setAnnotations(prevAnnotations => 
        prevAnnotations.map(ann => 
          ann.id === draggedAnnotation 
            ? { ...ann, x: x - dragOffset.x, y: y - dragOffset.y }
            : ann
        )
      )
      return
    }

    // Handle drawing new annotations
    if (isDrawing && currentAnnotation) {
      setCurrentAnnotation({ ...currentAnnotation, endX: x, endY: y })
    }
  }

  const handleMouseUp = () => {
    // End dragging
    if (isDragging) {
      setIsDragging(false)
      setDraggedAnnotation(null)
      setDragOffset({ x: 0, y: 0 })
      return
    }

    // End drawing
    if (isDrawing && currentAnnotation && currentAnnotation.type !== 'text') {
      setAnnotations([...annotations, { ...currentAnnotation, id: Date.now().toString() }])
    }
    setIsDrawing(false)
    setCurrentAnnotation(null)
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInputValue.trim()) {
      setShowTextInput(false)
      return
    }

    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const x = (textInputPosition.x - rect.left) * scaleX - padding
    const y = (textInputPosition.y - rect.top) * scaleY - padding

    setAnnotations([...annotations, {
      id: Date.now().toString(),
      type: 'text', 
      x, 
      y, 
      text: textInputValue.trim(), 
      color: annotationColor, 
      size: 4
    }])
    
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

  const handleCopy = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Export at full resolution
    const dataUrl = canvas.toDataURL('image/png')
    window.electronAPI?.copyToClipboard(dataUrl)
    toast.success('Copied to clipboard!')
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

  if (view === 'editor' && screenshot) {
    return (
      <div className="h-full flex flex-col bg-zinc-950 overflow-hidden selection:bg-indigo-500/30">
        <Toaster position="top-center" expand={false} richColors />
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative flex flex-col items-center justify-center p-12 overflow-auto bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:32px_32px]">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            
            <div className={`relative transition-all duration-700 ease-out animate-in zoom-in-95 fade-in ${background.type === 'transparent' ? 'transparent-checkerboard' : ''} rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)]`}>
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`block transition-shadow duration-500 ${
                  isDragging ? 'cursor-grabbing' : 
                  selectedTool === 'select' ? 'cursor-grab' : 
                  'cursor-crosshair'
                }`}
              />
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
              onClearAnnotations={() => setAnnotations([])}
              onBackToPicker={() => setView('picker')}
            />
          </div>

          <Sidebar 
            background={background} setBackground={setBackground}
            shadow={shadow} setShadow={setShadow}
            border={border} setBorder={setBorder}
            padding={padding} setPadding={setPadding}
            scale={scale} setScale={setScale}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-zinc-950 animate-mesh">
      <div className="min-h-full w-full bg-zinc-950/40 backdrop-blur-[2px]">
        <Toaster position="top-center" expand={false} richColors />
        <Header 
          onCaptureFullscreen={handleCaptureFullscreen} 
          loading={loading}
        />
        <SourcePicker 
          sources={sources} loading={loading} 
          onCaptureSource={handleCaptureSource} onRefresh={loadSources} 
        />
      </div>
    </div>
  )
}
