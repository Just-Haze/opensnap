import { MousePointer2, Type, ArrowUpRight, Square, Circle, Download, Copy, RefreshCcw, Eraser } from 'lucide-react'
import { ANNOTATION_COLORS } from '../constants'

interface ToolbarProps {
  selectedTool: string
  setSelectedTool: (tool: any) => void
  annotationColor: string
  setAnnotationColor: (color: string) => void
  onSave: () => void
  onCopy: () => void
  onClearAnnotations: () => void
  onBackToPicker: () => void
}

export default function Toolbar({ 
  selectedTool, 
  setSelectedTool, 
  annotationColor, 
  setAnnotationColor,
  onSave,
  onCopy,
  onClearAnnotations,
  onBackToPicker
}: ToolbarProps) {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
  ]

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-12 duration-1000">
      <div className="flex items-center gap-1 p-2 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] group">
        <div className="flex items-center gap-1 pr-3 border-r border-white/5">
          <button
            onClick={onBackToPicker}
            className="p-3.5 hover:bg-zinc-800/80 rounded-[20px] text-zinc-400 hover:text-white transition-all duration-300 active:scale-90"
            title="Back to sources"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-3.5 rounded-[20px] transition-all duration-300 relative group/tool flex items-center justify-center ${
                selectedTool === tool.id 
                  ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
                  : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <tool.icon className={`w-5 h-5 transition-transform duration-300 ${selectedTool === tool.id ? 'scale-110' : 'group-hover/tool:scale-110'}`} />
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-xl text-[10px] font-bold text-white opacity-0 group-hover/tool:opacity-100 transition-all pointer-events-none scale-90 group-hover/tool:scale-100 uppercase tracking-widest whitespace-nowrap">
                {tool.label}
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 px-4 border-l border-r border-white/5">
          <div className="grid grid-cols-5 gap-1.5">
            {ANNOTATION_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setAnnotationColor(color)}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-300 hover:scale-125 ${
                  annotationColor === color ? 'border-white ring-4 ring-indigo-500/20 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pl-2 pr-1">
          <button
            onClick={onClearAnnotations}
            className="p-3.5 hover:bg-red-500/10 rounded-[20px] text-zinc-500 hover:text-red-400 transition-all duration-300"
            title="Clear annotations"
          >
            <Eraser className="w-5 h-5" />
          </button>
          
          <div className="w-px h-8 bg-white/5 mx-1" />

          <button
            onClick={onCopy}
            className="px-6 py-3.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 rounded-[20px] transition-all duration-300 flex items-center gap-2 font-bold text-sm border border-white/5 active:scale-95"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
          
          <button
            onClick={onSave}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[22px] transition-all duration-300 flex items-center gap-3 font-black text-sm shadow-[0_10px_20px_-5px_rgba(79,70,229,0.5)] active:scale-95 group/save"
          >
            <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  )
}
