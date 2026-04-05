import { Camera, Monitor, Keyboard, Sparkles, Settings, Crop } from 'lucide-react'

interface HeaderProps {
  onCaptureFullscreen: () => void
  onCaptureRegion: () => void
  loading: boolean
  currentHotkey: string
}

export default function Header({ onCaptureFullscreen, onCaptureRegion, loading, currentHotkey }: HeaderProps) {
  const openSettings = () => {
    window.location.hash = 'settings'
  }

  return (
    <header className="relative py-24 px-6 overflow-hidden">
      {/* Settings Button */}
      <button
        onClick={openSettings}
        className="absolute top-6 right-6 p-3 bg-zinc-800/80 hover:bg-zinc-700/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-all group z-10"
        title="Settings"
      >
        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative flex flex-col items-center text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles className="w-3 h-3" />
          <span>Next Generation Capture</span>
        </div>

        <div className="flex items-center gap-4 mb-8 group animate-in zoom-in-95 duration-1000">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 group-hover:rotate-12 transition-transform duration-500">
            <Camera className="text-white w-9 h-9" />
          </div>
          <h1 className="text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
            OpenSnap
          </h1>
        </div>
        
        <p className="text-zinc-400 text-xl mb-12 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          Transform your screen captures into stunning visual assets with professional backgrounds, 
          precise annotations, and modern effects.
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          <button
            onClick={onCaptureRegion}
            disabled={loading}
            className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white disabled:opacity-50 font-bold text-lg rounded-2xl transition-all flex items-center gap-3 group shadow-2xl shadow-indigo-500/20 active:scale-95 hover:-translate-y-1"
          >
            <Crop className="w-6 h-6 group-hover:scale-110 transition-transform" />
            Capture Region
          </button>
          <button
            onClick={onCaptureFullscreen}
            disabled={loading}
            className="px-10 py-4 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-bold text-lg rounded-2xl transition-all flex items-center gap-3 group shadow-2xl shadow-white/10 active:scale-95 hover:-translate-y-1"
          >
            <Monitor className="w-6 h-6 group-hover:scale-110 transition-transform" />
            Capture Fullscreen
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl text-zinc-500 text-sm animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
          <Keyboard className="w-4 h-4" />
          <span>Global Shortcut: <kbd className="bg-zinc-800/80 px-2 py-1 rounded-lg text-zinc-300 font-mono text-xs border border-white/5">{currentHotkey}</kbd></span>
        </div>
      </div>
    </header>
  )
}
