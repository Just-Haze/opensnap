import { memo } from 'react'
import { BackgroundSettings, ShadowSettings, BorderSettings } from '../types'
import { GRADIENT_PRESETS, SOLID_COLORS } from '../constants'
import { useDebouncedCallback } from '../utils'
import { X } from 'lucide-react'

interface SidebarProps {
  background: BackgroundSettings
  setBackground: (settings: BackgroundSettings) => void
  shadow: ShadowSettings
  setShadow: (settings: ShadowSettings) => void
  border: BorderSettings
  setBorder: (settings: BorderSettings) => void
  padding: number
  setPadding: (p: number) => void
  scale: number
  setScale: (s: number) => void
  onClose?: () => void
  isSmallScreen?: boolean
}

export default memo(function Sidebar({
  background, setBackground,
  shadow, setShadow,
  border, setBorder,
  padding, setPadding,
  scale, setScale,
  onClose,
  isSmallScreen
}: SidebarProps) {
  
  // Debounce expensive background/shadow/border updates to keep the UI smooth during rapid changes
  const debouncedSetShadow = useDebouncedCallback(setShadow, 10)
  const debouncedSetBorder = useDebouncedCallback(setBorder, 10)

  return (
    <div className={`${isSmallScreen ? 'w-72' : 'w-80'} bg-black/30 backdrop-blur-[60px] border-l border-white/10 h-screen overflow-hidden flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-8 duration-1000`}>
      
      {/* Header */}
      <div className={`${isSmallScreen ? 'p-3' : 'p-5'} flex items-center justify-between border-b border-white/5 shrink-0`}>
        <h2 className="font-semibold text-white/90 text-[13px] tracking-tight ml-2">Inspector</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className={`flex-1 ${isSmallScreen ? 'px-4 py-4 gap-6' : 'px-5 py-6 gap-8'} flex flex-col overflow-y-auto custom-scrollbar`}>
        
        {/* Layout Section */}
        <section className="flex flex-col gap-2 shrink-0">
          <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/30 px-1">
            Geometry
          </h3>
          
          <div className={`expertise-card ${isSmallScreen ? '!p-4 gap-4' : '!p-5 gap-5'} flex flex-col`}>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-white/80">Padding</label>
                <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{padding}</span>
              </div>
              <input 
                type="range" min="0" max="200" step="4"
                value={padding} onChange={(e) => setPadding(Number(e.target.value))}
                className="mac-slider"
              />
            </div>

            <div className="w-full h-px bg-white/5" />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-white/80">Scale</label>
                <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{Math.round(scale)}%</span>
              </div>
              <input 
                type="range" min="10" max="100" step="2"
                value={scale} onChange={(e) => setScale(Number(e.target.value))}
                className="mac-slider"
              />
            </div>
          </div>
        </section>

        {/* Background Section */}
        <section className="flex flex-col gap-2 shrink-0">
          <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/30 px-1">
            Background
          </h3>

          <div className={`expertise-card ${isSmallScreen ? '!p-4' : '!p-5'}`}>
            {/* Segmented Control */}
            <div className="flex p-0.5 bg-black/20 border border-white/5 rounded-xl mb-4">
              {['none', 'solid', 'grad'].map((type) => {
                const displayType = type === 'none' ? 'transparent' : type === 'grad' ? 'gradient' : type
                return (
                  <button
                    key={type}
                    onClick={() => setBackground({ ...background, type: displayType as any })}
                    className={`flex-1 py-1.5 text-[10px] font-bold capitalize rounded-lg transition-all duration-300 ${
                      background.type === displayType 
                        ? 'bg-white/15 text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] border border-white/20 backdrop-blur-md' 
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {type}
                  </button>
                )
              })}
            </div>

            {background.type === 'solid' && (
              <div className={`grid ${isSmallScreen ? 'grid-cols-6' : 'grid-cols-5'} gap-2 animate-in fade-in zoom-in-95 duration-300`}>
                {SOLID_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBackground({ ...background, color })}
                    className={`aspect-square rounded-lg transition-all duration-200 active:scale-90 ${
                      background.color === color ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-105' : 'border border-white/5 hover:border-white/20'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}

            {background.type === 'gradient' && (
              <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
                <div className={`grid ${isSmallScreen ? 'grid-cols-5' : 'grid-cols-4'} gap-2`}>
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setBackground({ ...background, gradientStart: preset.start, gradientEnd: preset.end })}
                      className={`aspect-square rounded-lg transition-all duration-200 active:scale-90 ${
                        background.gradientStart === preset.start ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-105' : 'border border-white/5 hover:border-white/20'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${preset.start}, ${preset.end})` }}
                      title={preset.name}
                    />
                  ))}
                </div>
                
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-white/80">Angle</label>
                    <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{background.gradientAngle}°</span>
                  </div>
                  <input 
                    type="range" min="0" max="360" step="5"
                    value={background.gradientAngle} onChange={(e) => setBackground({ ...background, gradientAngle: Number(e.target.value) })}
                    className="mac-slider"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Styling Section */}
        <section className="flex flex-col gap-2 shrink-0">
          <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/30 px-1">
            Appearance
          </h3>

          <div className={`flex flex-col ${isSmallScreen ? 'gap-3' : 'gap-4'}`}>
            
            {/* Border Card */}
            <div className={`expertise-card ${isSmallScreen ? '!p-4' : '!p-5'} flex flex-col gap-3`}>
              <div className="flex items-center justify-between cursor-pointer group" 
                   onClick={() => setBorder({ ...border, enabled: !border.enabled })}>
                <label className="text-[11px] font-semibold text-white/90 flex items-center gap-2 cursor-pointer group-hover:text-white transition-colors">
                   Stroke
                </label>
                <div className={`w-8 h-4 rounded-full transition-all duration-300 relative ${border.enabled ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform duration-300 shadow-sm ${border.enabled ? 'bg-black translate-x-4' : 'bg-white/40 translate-x-0'}`} />
                </div>
              </div>

              {border.enabled && (
                <div className="flex flex-col pt-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                  <div className="w-full h-px bg-white/5 mb-1" />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-semibold text-white/50">Radius</label>
                      <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{border.radius}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="4"
                      value={border.radius} onChange={(e) => debouncedSetBorder({ ...border, radius: Number(e.target.value) })}
                      className="mac-slider"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-semibold text-white/50">Width</label>
                      <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{border.width}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="10" step="1"
                      value={border.width} onChange={(e) => debouncedSetBorder({ ...border, width: Number(e.target.value) })}
                      className="mac-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Shadow Card */}
            <div className={`expertise-card ${isSmallScreen ? '!p-4' : '!p-5'} flex flex-col gap-3`}>
              <div className="flex items-center justify-between cursor-pointer group"
                   onClick={() => setShadow({ ...shadow, enabled: !shadow.enabled })}>
                <label className="text-[11px] font-semibold text-white/90 flex items-center gap-2 cursor-pointer group-hover:text-white transition-colors">
                  Shadow
                </label>
                <div className={`w-8 h-4 rounded-full transition-all duration-300 relative ${shadow.enabled ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform duration-300 shadow-sm ${shadow.enabled ? 'bg-black translate-x-4' : 'bg-white/40 translate-x-0'}`} />
                </div>
              </div>

              {shadow.enabled && (
                <div className="flex flex-col pt-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                  <div className="w-full h-px bg-white/5 mb-1" />
                  
                  {/* Shadow Backdrop Mode Toggle */}
                  <div className="flex items-center justify-between py-1 cursor-pointer group"
                       onClick={() => setShadow({ ...shadow, isShadowBackdrop: !shadow.isShadowBackdrop })}>
                    <label className="text-[10px] font-semibold text-white/50 group-hover:text-white/80 transition-colors">
                      Shadow Backdrop
                    </label>
                    <div className={`w-7 h-3.5 rounded-full transition-all duration-300 relative ${shadow.isShadowBackdrop ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'bg-white/5'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full transition-transform duration-300 ${shadow.isShadowBackdrop ? 'bg-white translate-x-3.5' : 'bg-white/20 translate-x-0'}`} />
                    </div>
                  </div>

                  {!shadow.isShadowBackdrop && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-semibold text-white/50">Blur</label>
                          <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{shadow.blur}px</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" step="5"
                          value={shadow.blur} onChange={(e) => debouncedSetShadow({ ...shadow, blur: Number(e.target.value) })}
                          className="mac-slider"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-semibold text-white/50">Opacity</label>
                          <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{shadow.opacity}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" step="5"
                          value={shadow.opacity} onChange={(e) => debouncedSetShadow({ ...shadow, opacity: Number(e.target.value) })}
                          className="mac-slider"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </section>
      </div>
      
    </div>
  )
})
