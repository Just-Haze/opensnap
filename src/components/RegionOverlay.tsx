import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Check } from 'lucide-react'
import { toast } from 'sonner'

interface RegionCaptureData {
  id: number
  screenshot: string
  width: number
  height: number
  scaleFactor: number
  physicalWidth: number
  physicalHeight: number
}

interface RegionOverlayProps {
  displayId: string
}

export default function RegionOverlay({ displayId }: RegionOverlayProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 })
  const [captureData, setCaptureData] = useState<RegionCaptureData | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const magnifierRef = useRef<HTMLDivElement>(null)
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null)

  // Get pre-captured screenshot on mount
  useEffect(() => {
    let mounted = true

    const loadCaptureData = async () => {
      try {
        const data = await window.electronAPI?.getRegionCaptureData?.(Number(displayId))
        if (!mounted) return
        
        if (data) {
          setCaptureData(data)
          
          const img = new Image()
          img.onload = () => {
            if (mounted) {
              setSourceImage(img)
              setIsReady(true)
            }
          }
          img.onerror = () => {
            console.error('Failed to load screenshot image')
            if (mounted) setIsReady(true)
          }
          img.src = data.screenshot
        } else {
          console.error('No capture data available')
          window.electronAPI?.regionCaptureCancel()
        }
      } catch (error) {
        console.error('Failed to get capture data:', error)
        window.electronAPI?.regionCaptureCancel()
      }
    }

    loadCaptureData()

    return () => {
      mounted = false
    }
  }, [displayId])

  const updateMagnifier = useCallback((x: number, y: number) => {
    if (!sourceImage || !magnifierCanvasRef.current || !captureData) return
    
    const canvas = magnifierCanvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const scale = captureData.scaleFactor
    const physicalX = Math.round(x * scale)
    const physicalY = Math.round(y * scale)

    const zoom = 3
    const loupeSize = 140
    const halfLoupe = loupeSize / 2

    ctx.clearRect(0, 0, loupeSize, loupeSize)

    const srcSize = loupeSize / zoom
    const srcX = physicalX - srcSize / 2
    const srcY = physicalY - srcSize / 2

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      sourceImage,
      srcX, srcY, srcSize, srcSize,
      0, 0, loupeSize, loupeSize
    )

    // Center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, halfLoupe)
    ctx.lineTo(loupeSize, halfLoupe)
    ctx.moveTo(halfLoupe, 0)
    ctx.lineTo(halfLoupe, loupeSize)
    ctx.stroke()
    
    // Center pixel outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.strokeRect(halfLoupe - zoom/2, halfLoupe - zoom/2, zoom, zoom)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.strokeRect(halfLoupe - zoom/2 - 1, halfLoupe - zoom/2 - 1, zoom + 2, zoom + 2)
    
    if (magnifierRef.current) {
      const offset = 20
      let left = x + offset
      let top = y + offset
      if (left + loupeSize > window.innerWidth) left = x - loupeSize - offset
      if (top + loupeSize > window.innerHeight) top = y - loupeSize - offset
      
      magnifierRef.current.style.left = `${left}px`
      magnifierRef.current.style.top = `${top}px`
    }
  }, [sourceImage, captureData])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isReady) return
    
    e.preventDefault()
    setIsSelecting(true)
    setHasSelection(false)
    
    const x = e.clientX
    const y = e.clientY
    setStartPoint({ x, y })
    setEndPoint({ x, y })
    mousePosRef.current = { x, y }
    
    setTimeout(() => {
      updateMagnifier(x, y)
    }, 0)
  }, [isReady, updateMagnifier])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const x = Math.max(0, Math.min(e.clientX, window.innerWidth))
    const y = Math.max(0, Math.min(e.clientY, window.innerHeight))
    mousePosRef.current = { x, y }
    
    if (isSelecting) {
      setEndPoint({ x, y })
      updateMagnifier(x, y)
    }
  }, [isSelecting, updateMagnifier])

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return
    
    setIsSelecting(false)
    
    const width = Math.abs(endPoint.x - startPoint.x)
    const height = Math.abs(endPoint.y - startPoint.y)
    
    if (width >= 10 && height >= 10) {
      setHasSelection(true)
    } else {
      setStartPoint({ x: 0, y: 0 })
      setEndPoint({ x: 0, y: 0 })
      setHasSelection(false)
    }
  }, [isSelecting, startPoint, endPoint])

  const handleConfirm = useCallback(async () => {
    if (!captureData || !hasSelection) return

    const rect = {
      x: Math.min(startPoint.x, endPoint.x),
      y: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - startPoint.x),
      height: Math.abs(endPoint.y - startPoint.y)
    }

    // Convert to physical pixels
    const scale = captureData.scaleFactor
    const physicalRect = {
      x: Math.round(rect.x * scale),
      y: Math.round(rect.y * scale),
      width: Math.round(rect.width * scale),
      height: Math.round(rect.height * scale)
    }

    // Crop the screenshot
    const img = sourceImage || new Image()
    
    const performCrop = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = physicalRect.width
      canvas.height = physicalRect.height
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        window.electronAPI?.regionCaptureCancel()
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      ctx.drawImage(
        img,
        physicalRect.x, physicalRect.y, physicalRect.width, physicalRect.height,
        0, 0, physicalRect.width, physicalRect.height
      )

      const croppedDataUrl = canvas.toDataURL('image/png')

      // Auto-copy to clipboard immediately before the annotation editor opens.
      // This ensures the raw screenshot is always on the clipboard even if the
      // user closes the annotation window without clicking Copy (like ShareX).
      await window.electronAPI?.copyToClipboard(croppedDataUrl)

      window.electronAPI?.regionCaptureComplete({
        dataUrl: croppedDataUrl,
        width: physicalRect.width,
        height: physicalRect.height,
        logicalWidth: rect.width,
        logicalHeight: rect.height,
        screenX: window.screenX + rect.x,
        screenY: window.screenY + rect.y
      })
    }

    if (img.complete) {
      performCrop()
    } else {
      img.onload = performCrop
      img.onerror = () => {
        console.error('Failed to load image for cropping')
        window.electronAPI?.regionCaptureCancel()
      }
      img.src = captureData.screenshot
    }
  }, [captureData, hasSelection, startPoint, endPoint, sourceImage])

  const handleCancel = useCallback(() => {
    window.electronAPI?.regionCaptureCancel()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      } else if (e.key === 'Enter' && hasSelection) {
        handleConfirm()
      } else if (e.key.toLowerCase() === 'c' && sourceImage && captureData) {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          const scale = captureData.scaleFactor
          const physicalX = Math.round(mousePosRef.current.x * scale)
          const physicalY = Math.round(mousePosRef.current.y * scale)
          
          ctx.drawImage(sourceImage, physicalX, physicalY, 1, 1, 0, 0, 1, 1)
          const data = ctx.getImageData(0, 0, 1, 1).data
          const hex = '#' + [data[0], data[1], data[2]].map(x => {
            const hexStr = x.toString(16)
            return hexStr.length === 1 ? '0' + hexStr : hexStr
          }).join('').toUpperCase()
          
          try {
            await navigator.clipboard.writeText(hex)
            toast.success(`Copied color: ${hex}`)
          } catch (err) {
            console.error('Failed to copy color:', err)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCancel, handleConfirm, hasSelection, sourceImage, captureData])

  // Loading state
  if (!isReady || !captureData) {
    return (
      <div className="region-overlay-loading">
        <div className="region-overlay-spinner" />
      </div>
    )
  }

  const selectionRect = {
    left: Math.min(startPoint.x, endPoint.x),
    top: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y)
  }

  return (
    <div 
      ref={containerRef}
      className="region-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => isSelecting && handleMouseUp()}
    >
      {/* Screenshot background */}
      <div
        className="region-overlay-screenshot"
        style={{ backgroundImage: `url(${captureData.screenshot})` }}
      />

      {/* Dimmed overlay */}
      <div className="region-overlay-dim" />

      {/* Selection box */}
      {(isSelecting || hasSelection) && selectionRect.width > 0 && selectionRect.height > 0 && (
        <div
          className="region-overlay-selection rounded-xl"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height
          }}
        >
          <div className="region-overlay-selection-inner rounded-xl" />
          {selectionRect.width > 60 && selectionRect.height > 40 && (
            <div className="region-overlay-dimensions">
              {Math.round(selectionRect.width * captureData.scaleFactor)} × {Math.round(selectionRect.height * captureData.scaleFactor)}
            </div>
          )}
          
          {/* Corner handles */}
          <div className="region-corner region-corner-tl" style={{ top: '-4px', left: '-4px' }} />
          <div className="region-corner region-corner-tr" style={{ top: '-4px', right: '-4px' }} />
          <div className="region-corner region-corner-bl" style={{ bottom: '-4px', left: '-4px' }} />
          <div className="region-corner region-corner-br" style={{ bottom: '-4px', right: '-4px' }} />
        </div>
      )}

      {/* Magnifier */}
      {isSelecting && sourceImage && (
        <div
          ref={magnifierRef}
          className="region-magnifier"
          style={{
            left: -999,
            top: -999,
          }}
        >
          <canvas ref={magnifierCanvasRef} width={140} height={140} />
        </div>
      )}

      {/* Toolbar - hidden during selection */}
      <div 
        className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/40 backdrop-blur-[60px] p-2 pr-5 rounded-full border border-white/10 shadow-[0_20px_40px_-8px_rgba(0,0,0,0.5)] z-[100000]"
        style={{ pointerEvents: isSelecting ? 'none' : 'auto', opacity: isSelecting ? 0 : 1, transition: 'opacity 0.2s' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 pl-1">
          {hasSelection && (
            <button
              onClick={handleConfirm}
              className="p-2 bg-blue-500 hover:bg-blue-400 text-white rounded-full transition-all duration-200 active:scale-95 shadow-sm"
              title="Confirm (Enter)"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={handleCancel}
            className="p-2 bg-white/10 hover:bg-red-500/80 hover:text-white text-white/70 rounded-full transition-all duration-200 active:scale-95"
            title="Cancel (ESC)"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <div className="text-white/80 text-[13px] font-medium tracking-wide flex items-center gap-2">
          Drag to select <span className="text-white/30">•</span> <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-white/10 text-white/60">ESC</kbd> cancel <span className="text-white/30">•</span> <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-white/10 text-white/60">↵</kbd> confirm <span className="text-white/30">•</span> <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-white/10 text-white/60">C</kbd> copy color
        </div>
      </div>
    </div>
  )
}
