import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

interface TitleBarProps {
  onOpenSettings?: () => void
  onCaptureRegion?: () => void
}

export default function TitleBar({ onCaptureRegion }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Get initial maximized state
    window.electronAPI?.windowIsMaximized?.().then(setIsMaximized)
    
    // Listen for maximize state changes
    const unsubscribe = window.electronAPI?.onWindowMaximizedChange?.((maximized: boolean) => {
      setIsMaximized(maximized)
    })
    
    return () => unsubscribe?.()
  }, [])

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize?.()
  }

  const handleMaximize = () => {
    window.electronAPI?.windowMaximize?.()
  }

  const handleClose = () => {
    window.electronAPI?.windowClose?.()
  }

  return (
    <div className="title-bar h-10 flex items-center justify-between bg-zinc-950 border-b border-white/5 select-none">
      {/* Left section - App branding & drag region */}
      <div className="flex items-center h-full flex-1 draggable">
        <div className="flex items-center gap-2.5 px-4 h-full">
          <img src="/icon.svg" className="w-5 h-5 object-contain" alt="OpenSnap Logo" />
          <span className="text-sm font-bold text-white tracking-tight">OpenSnap</span>
        </div>
      </div>

      {/* Center section - Quick actions (optional) */}
      <div className="flex items-center gap-1 h-full no-drag">
        {onCaptureRegion && (
          <button
            onClick={onCaptureRegion}
            className="h-7 px-3 flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-md transition-colors"
            title="Capture Region"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Capture</span>
          </button>
        )}
        {/* Settings button removed as requested */}
      </div>

      {/* Right section - Window controls */}
      <div className="flex items-center h-full no-drag">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="h-full w-12 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="h-full w-12 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2 0.5h5.5v5.5M0.5 2v5.5h5.5v-5.5h-5.5z" />
            </svg>
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="h-full w-12 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-600 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
