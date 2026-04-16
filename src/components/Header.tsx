import { memo } from 'react'
import { Monitor, Keyboard, Settings, Crop } from 'lucide-react'

interface HeaderProps {
  onCaptureFullscreen: () => void
  onCaptureRegion: () => void
  loading: boolean
  currentHotkey: string
}

export default memo(function Header({ onCaptureFullscreen, onCaptureRegion, loading, currentHotkey }: HeaderProps) {
  const openSettings = () => {
    window.location.hash = 'settings'
  }

  return (
    <header className="relative py-20 px-6 overflow-hidden flex flex-col items-center text-center">
      
      {/* Settings Button (Bottom Right Absolute) */}
      <button
        onClick={openSettings}
        className="fixed bottom-6 right-6 p-3 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 rounded-full text-white/50 hover:text-white transition-all group z-50 shadow-lg cursor-default"
        title="Settings"
      >
        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        
        {/* Logo */}
        <div className="mb-8 animate-in fade-in zoom-in duration-1000">
          <img src="/icon.svg" className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" alt="OpenSnap Logo" />
        </div>

        {/* Hero Typography */}
        <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-bold text-white tracking-[-0.05em] mb-8 md:mb-12 drop-shadow-2xl">
          OpenSnap
        </h1>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-5 mb-10 md:mb-14 px-4">
          <button
            onClick={onCaptureRegion}
            disabled={loading}
            className="btn-primary w-full sm:w-auto"
            style={{ padding: '1rem 2.4rem', fontSize: '0.95rem' }}
          >
            <Crop className="w-5 h-5" />
            Capture Region
          </button>
          <button
            onClick={onCaptureFullscreen}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-[2.4rem] py-[1rem] bg-white/[0.04] border-[1.5px] border-white/10 text-white rounded-full font-semibold text-[0.95rem] transition-all backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-[2px] shadow-lg active:scale-95 w-full sm:w-auto"
          >
            <Monitor className="w-5 h-5" />
            Capture Full Screen
          </button>
        </div>

        {/* Shortcut Info */}
        <div className="flex items-center gap-3 px-6 py-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl text-white/50 text-[13px] cursor-default shadow-lg">
          <Keyboard className="w-4 h-4" />
          <span>Global Shortcut</span>
          <div className="w-px h-4 bg-white/10 mx-1"></div>
          <kbd className="bg-white/10 px-2 py-1 rounded-md text-white/80 font-mono text-xs border border-white/10">{currentHotkey}</kbd>
        </div>

      </div>
    </header>
  )
})
