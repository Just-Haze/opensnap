import { BackgroundSettings, ShadowSettings, BorderSettings } from '../types'
import { GRADIENT_PRESETS, SOLID_COLORS } from '../constants'
import { Layers, Palette, Shield, Maximize, Settings2, Sparkles } from 'lucide-react'

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
}

export default function Sidebar({
  background, setBackground,
  shadow, setShadow,
  border, setBorder,
  padding, setPadding,
  scale, setScale
}: SidebarProps) {
  return (
    <div className="w-80 bg-zinc-950/80 backdrop-blur-3xl border-l border-white/5 h-screen overflow-y-auto custom-scrollbar flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-8 duration-1000">
      <div className="p-8 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
          <Settings2 className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="font-black text-white tracking-tight uppercase text-sm">Fine Tune</h2>
      </div>

      <div className="flex-1 px-4 py-8 space-y-12">
        {/* Layout Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-2 px-4">
            <Maximize className="w-4 h-4 text-zinc-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Geometry</h3>
          </div>
          
          <div className="space-y-10 px-4">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Padding</label>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{padding}px</span>
              </div>
              <input 
                type="range" min="0" max="200" step="4"
                value={padding} onChange={(e) => setPadding(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 transition-all hover:bg-zinc-700"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Canvas Scale</label>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{scale}%</span>
              </div>
              <input 
                type="range" min="10" max="200" step="2"
                value={scale} onChange={(e) => setScale(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 transition-all hover:bg-zinc-700"
              />
            </div>
          </div>
        </section>

        {/* Background Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-2 px-4">
            <Palette className="w-4 h-4 text-zinc-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Backdrop</h3>
          </div>

          <div className="px-4">
            <div className="flex p-1 bg-zinc-900 rounded-xl mb-8 border border-white/5">
              {['transparent', 'solid', 'gradient'].map((type) => (
                <button
                  key={type}
                  onClick={() => setBackground({ ...background, type: type as any })}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                    background.type === type 
                      ? 'bg-zinc-800 text-white shadow-xl border border-white/5' 
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {background.type === 'solid' && (
              <div className="grid grid-cols-6 gap-2 animate-in fade-in zoom-in-95 duration-500">
                {SOLID_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBackground({ ...background, color })}
                    className={`aspect-square rounded-lg border-2 transition-all duration-300 hover:scale-110 active:scale-90 ${
                      background.color === color ? 'border-white ring-4 ring-white/10' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}

            {background.type === 'gradient' && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="grid grid-cols-4 gap-2.5">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setBackground({ 
                        ...background, 
                        gradientStart: preset.start, 
                        gradientEnd: preset.end 
                      })}
                      className={`aspect-square rounded-xl border-2 transition-all duration-300 hover:scale-110 active:scale-90 ${
                        background.gradientStart === preset.start ? 'border-white ring-4 ring-white/10' : 'border-transparent'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${preset.start}, ${preset.end})` }}
                      title={preset.name}
                    />
                  ))}
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Flow Angle</label>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{background.gradientAngle}°</span>
                  </div>
                  <input 
                    type="range" min="0" max="360" step="5"
                    value={background.gradientAngle} onChange={(e) => setBackground({ ...background, gradientAngle: Number(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 transition-all hover:bg-zinc-700"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Styling Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-2 px-4">
            <Sparkles className="w-4 h-4 text-zinc-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Appearance</h3>
          </div>

          <div className="px-4 space-y-10">
            <div className="space-y-8">
              <div className="flex items-center justify-between group cursor-pointer" 
                   onClick={() => setBorder({ ...border, enabled: !border.enabled })}>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 group-hover:text-zinc-200 transition-colors">
                  <Shield className="w-3.5 h-3.5" />
                  Stroke
                </label>
                <div className={`w-8 h-4 rounded-full transition-all duration-300 relative ${border.enabled ? 'bg-indigo-600' : 'bg-zinc-800'}`}>
                  <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all duration-300 ${border.enabled ? 'left-5' : 'left-1'}`} />
                </div>
              </div>

              {border.enabled && (
                <div className="space-y-8 pt-2 animate-in slide-in-from-top-4 duration-500">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Rounding</label>
                      <span className="text-[10px] font-mono text-zinc-400">{border.radius}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="4"
                      value={border.radius} onChange={(e) => setBorder({ ...border, radius: Number(e.target.value) })}
                      className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Weight</label>
                      <span className="text-[10px] font-mono text-zinc-400">{border.width}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="10" step="1"
                      value={border.width} onChange={(e) => setBorder({ ...border, width: Number(e.target.value) })}
                      className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between group cursor-pointer"
                   onClick={() => setShadow({ ...shadow, enabled: !shadow.enabled })}>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 group-hover:text-zinc-200 transition-colors">
                  <Layers className="w-3.5 h-3.5" />
                  Depth
                </label>
                <div className={`w-8 h-4 rounded-full transition-all duration-300 relative ${shadow.enabled ? 'bg-indigo-600' : 'bg-zinc-800'}`}>
                  <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all duration-300 ${shadow.enabled ? 'left-5' : 'left-1'}`} />
                </div>
              </div>

              {shadow.enabled && (
                <div className="space-y-8 pt-2 animate-in slide-in-from-top-4 duration-500">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Softness</label>
                      <span className="text-[10px] font-mono text-zinc-400">{shadow.blur}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="5"
                      value={shadow.blur} onChange={(e) => setShadow({ ...shadow, blur: Number(e.target.value) })}
                      className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Density</label>
                      <span className="text-[10px] font-mono text-zinc-400">{shadow.opacity}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="5"
                      value={shadow.opacity} onChange={(e) => setShadow({ ...shadow, opacity: Number(e.target.value) })}
                      className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      
      <div className="p-8 bg-zinc-900/50 border-t border-white/5">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 text-center">
          OpenSnap Engine v1.0
        </p>
      </div>
    </div>
  )
}
