import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Check } from 'lucide-react'

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
  const containerRef = useRef<HTMLDivElement>(null)

  // Get pre-captured screenshot on mount
  useEffect(() => {
    let mounted = true

    const loadCaptureData = async () => {
      try {
        const data = await window.electronAPI?.getRegionCaptureData?.()
        if (!mounted) return
        
        if (data) {
          setCaptureData(data)
          setIsReady(true)
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isReady) return
    
    e.preventDefault()
    setIsSelecting(true)
    setHasSelection(false)
    
    const x = e.clientX
    const y = e.clientY
    setStartPoint({ x, y })
    setEndPoint({ x, y })
  }, [isReady])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return
    
    e.preventDefault()
    const x = Math.max(0, Math.min(e.clientX, window.innerWidth))
    const y = Math.max(0, Math.min(e.clientY, window.innerHeight))
    setEndPoint({ x, y })
  }, [isSelecting])

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

  const handleConfirm = useCallback(() => {
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
    const img = new Image()
    img.onload = () => {
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

      window.electronAPI?.regionCaptureComplete({
        dataUrl: croppedDataUrl,
        width: physicalRect.width,
        height: physicalRect.height,
        logicalWidth: rect.width,
        logicalHeight: rect.height
      })
    }
    
    img.onerror = () => {
      console.error('Failed to load image for cropping')
      window.electronAPI?.regionCaptureCancel()
    }
    
    img.src = captureData.screenshot
  }, [captureData, hasSelection, startPoint, endPoint])

  const handleCancel = useCallback(() => {
    window.electronAPI?.regionCaptureCancel()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      } else if (e.key === 'Enter' && hasSelection) {
        handleConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCancel, handleConfirm, hasSelection])

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
          className="region-overlay-selection"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height
          }}
        >
          <div className="region-overlay-selection-inner" />
          {selectionRect.width > 60 && selectionRect.height > 40 && (
            <div className="region-overlay-dimensions">
              {Math.round(selectionRect.width * captureData.scaleFactor)} × {Math.round(selectionRect.height * captureData.scaleFactor)}
            </div>
          )}
          
          {/* Corner handles */}
          <div className="region-corner region-corner-tl" />
          <div className="region-corner region-corner-tr" />
          <div className="region-corner region-corner-bl" />
          <div className="region-corner region-corner-br" />
        </div>
      )}

      {/* Toolbar - hidden during selection */}
      <div 
        className="region-overlay-toolbar"
        style={{ pointerEvents: isSelecting ? 'none' : 'auto' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="region-overlay-hint">
          Drag to select • <kbd>ESC</kbd> cancel • <kbd>Enter</kbd> confirm
        </div>
        <div className="region-overlay-actions">
          {hasSelection && (
            <button
              onClick={handleConfirm}
              className="region-overlay-confirm"
              title="Confirm (Enter)"
            >
              <Check className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleCancel}
            className="region-overlay-cancel"
            title="Cancel (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
