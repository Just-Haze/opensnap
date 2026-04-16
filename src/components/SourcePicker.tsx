import { memo } from 'react'
import { ScreenSource } from '../types'
import { RefreshCw, Layout, MousePointerClick, History as HistoryIcon } from 'lucide-react'

interface SourcePickerProps {
  sources: ScreenSource[]
  loading: boolean
  onCaptureSource: (id: string) => void
  onRefresh: () => void
  history?: any[]
}

export default memo(function SourcePicker({ sources, loading, onCaptureSource, onRefresh, history = [] }: SourcePickerProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-10 pb-20 sm:pb-32 w-full animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">

      {/* History Section */}
      {history && history.length > 0 && (
        <div className="mb-20">
          <div className="flex flex-col gap-2 mb-8 ml-1">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-1">
              <HistoryIcon className="w-4 h-4 text-blue-400" />
              Recent Captures
            </div>
            <h2 className="text-4xl sm:text-[2.5rem] font-black text-white tracking-tighter leading-none">Your Gallery</h2>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar snap-x">
            {history.map((item: any, idx: number) => (
              <div 
                key={item.id || idx} 
                className="flex-shrink-0 w-80 aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-3xl group relative snap-start hover:border-white/30 transition-all duration-500 shadow-2xl"
              >
                <img src={item.dataUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" alt="History item" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity" />
                <div className="absolute bottom-4 left-5 flex flex-col">
                   <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                   <span className="text-sm font-bold text-white/90">Screenshot {history.length - idx}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 sm:mb-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-1 ml-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            Active Sources
          </div>
          <h2 className="text-4xl sm:text-[2.5rem] font-black text-white tracking-tighter leading-none">Select a Window</h2>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className="group flex items-center justify-center gap-2.5 px-6 py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-white/80 transition-all duration-500 disabled:opacity-50 hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] active:scale-95 backdrop-blur-3xl overflow-hidden relative w-full sm:w-auto"
          title="Refresh sources"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="text-sm font-bold tracking-tight relative z-10">Refresh</span>
          <RefreshCw className={`w-4 h-4 relative z-10 transition-transform duration-1000 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 border border-dashed border-white/10 rounded-[40px] bg-white/[0.01] backdrop-blur-md group hover:bg-white/[0.03] transition-all duration-700">
          <div className="w-24 h-24 bg-white/[0.03] rounded-[32px] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 border border-white/5 shadow-2xl">
            <Layout className="w-12 h-12 text-white/20" />
          </div>
          <p className="text-white/90 text-2xl font-black tracking-tight mb-3">No Windows Found</p>
          <p className="text-white/40 text-lg max-w-sm text-center px-10 leading-relaxed font-medium">
            Ensure your applications aren't minimized and try refreshing again.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(sources || []).map((source, index) => (
            <button
              key={source.id}
              onClick={() => onCaptureSource(source.id)}
              disabled={loading}
              style={{ animationDelay: `${index * 60}ms` }}
              className="expertise-card group flex flex-col !p-0 rounded-[32px] overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-white/40 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-2xl"
            >
              <div className="aspect-video w-full overflow-hidden bg-black relative border-b border-white/5">
                <img 
                  src={source.thumbnail} 
                  alt={source.name} 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.9))] opacity-80 group-hover:opacity-40 transition-opacity duration-700" />
                
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 scale-75 group-hover:scale-100">
                  <div className="bg-white text-black px-7 py-3.5 rounded-2xl flex items-center gap-3 shadow-[0_20px_50px_rgba(255,255,255,0.2)]">
                    <MousePointerClick className="w-5 h-5" strokeWidth={2.5} />
                    <span className="font-black text-sm tracking-tight">Capture</span>
                  </div>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between bg-black/40 backdrop-blur-3xl z-10 relative">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center p-2 group-hover:bg-white/10 transition-colors duration-500 shadow-inner">
                    {source.icon ? (
                      <img 
                        src={source.icon} 
                        alt={`${source.name} icon`}
                        className="w-full h-full object-contain drop-shadow-lg"
                      />
                    ) : (
                      <Layout className="w-5 h-5 text-white/30" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="block text-sm font-bold text-white/90 truncate tracking-tight group-hover:text-white transition-colors duration-300">{source.name}</span>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Application Window</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                   <MousePointerClick className="w-4 h-4 text-white/60" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
