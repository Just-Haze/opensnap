import { ScreenSource } from '../types'
import { RefreshCw, Layout, MousePointerClick } from 'lucide-react'

interface SourcePickerProps {
  sources: ScreenSource[]
  loading: boolean
  onCaptureSource: (id: string) => void
  onRefresh: () => void
}

export default function SourcePicker({ sources, loading, onCaptureSource, onRefresh }: SourcePickerProps) {
  return (
    <div className="max-w-7xl mx-auto px-10 pb-32 w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-zinc-900 border border-white/5 rounded-xl">
            <Layout className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Active Sources</h2>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className="group flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl text-zinc-300 transition-all disabled:opacity-50"
          title="Refresh sources"
        >
          <span className="text-sm font-semibold">Refresh</span>
          <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-zinc-900 rounded-[32px] bg-zinc-900/20 backdrop-blur-sm group hover:bg-zinc-900/30 transition-colors duration-500">
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5">
            <Layout className="w-10 h-10 text-zinc-700" />
          </div>
          <p className="text-zinc-400 text-xl font-bold mb-2">No Windows Detected</p>
          <p className="text-zinc-600 text-base max-w-sm text-center px-6">
            Make sure your applications are not minimized and try refreshing again.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {(sources || []).map((source, index) => (
            <button
              key={source.id}
              onClick={() => onCaptureSource(source.id)}
              disabled={loading}
              style={{ animationDelay: `${index * 100}ms` }}
              className="group relative flex flex-col glass rounded-[24px] overflow-hidden hover:border-indigo-500/50 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] hover:-translate-y-2 disabled:opacity-50 animate-in fade-in slide-in-from-bottom-4"
            >
              <div className="aspect-video w-full overflow-hidden bg-black relative">
                <img 
                  src={source.thumbnail} 
                  alt={source.name} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                  <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-2 shadow-2xl">
                    <MousePointerClick className="w-5 h-5 text-white" />
                    <span className="text-white font-bold tracking-tight">Capture Now</span>
                  </div>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  {source.icon && (
                    <img 
                      src={source.icon} 
                      alt={`${source.name} icon`}
                      className="w-6 h-6 rounded-sm flex-shrink-0 object-contain"
                    />
                  )}
                  <span className="block text-sm font-bold text-zinc-100 truncate tracking-tight">{source.name}</span>
                </div>
                <div className="flex-shrink-0">
                  <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg group-hover:bg-indigo-500 group-hover:border-indigo-500 transition-all duration-300">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">Select</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
