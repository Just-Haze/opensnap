import { memo } from 'react'
import { 
  MousePointer2, Type, ArrowUpRight, Square, Circle, 
  Download, Copy, RefreshCcw, Eraser, 
  Crop, Hand, Undo2, Redo2, Droplets, ListOrdered, Pin, FileText
} from 'lucide-react'
import { ANNOTATION_COLORS } from '../constants'
import { useWindowSize } from '../utils'

interface ToolbarProps {
  selectedTool: string
  setSelectedTool: (tool: any) => void
  annotationColor: string
  setAnnotationColor: (color: string) => void
  onSave: () => void
  onCopy: () => void
  onClearAnnotations: () => void
  onBackToPicker: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onPin?: () => void
  onExtractText?: () => void
}

export default memo(function Toolbar({ 
  selectedTool, 
  setSelectedTool, 
  annotationColor, 
  setAnnotationColor,
  onSave,
  onCopy,
  onClearAnnotations,
  onBackToPicker,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPin,
  onExtractText
}: ToolbarProps) {
  const { width } = useWindowSize()
  const isCompact = width < 1200
  const isVeryCompact = width < 900

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'hand', icon: Hand, label: 'Hand' },
    { id: 'crop', icon: Crop, label: 'Crop' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'blur', icon: Droplets, label: 'Blur' },
    { id: 'step', icon: ListOrdered, label: 'Step' },
  ]

  return (
    <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-700 w-max max-w-[95vw] pointer-events-auto">
      <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-black/60 backdrop-blur-[48px] border border-white/10 rounded-full shadow-[0_24px_48px_rgba(0,0,0,0.6)] overflow-x-auto no-scrollbar">
        
        {/* Selection & Panning */}
        <div className="flex items-center gap-1 pr-1 sm:pr-2 border-r border-white/10 shrink-0">
          <button
            onClick={onBackToPicker}
            className="p-2 sm:p-2.5 rounded-full text-white/40 hover:bg-white/10 hover:text-white transition-all duration-300 active:scale-90"
            title="Back to sources"
          >
            <RefreshCcw className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
          </button>
          {onPin && (
            <button
              onClick={onPin}
              className="p-2 sm:p-2.5 rounded-full text-white/40 hover:bg-white/10 hover:text-white transition-all duration-300 active:scale-90"
              title="Pin to Screen"
            >
              <Pin className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
            </button>
          )}
          {onExtractText && (
            <button
              onClick={onExtractText}
              className="p-2 sm:p-2.5 rounded-full text-white/40 hover:bg-white/10 hover:text-white transition-all duration-300 active:scale-90"
              title="OCR / Extract Text"
            >
              <FileText className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Tools */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 shrink-0">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 relative group/tool flex items-center justify-center ${
                selectedTool === tool.id 
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-110' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80 active:scale-90'
              }`}
            >
              <tool.icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={selectedTool === tool.id ? 2.5 : 2} />
              
              {!isVeryCompact && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-2 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-xl text-[11px] font-bold text-white/90 opacity-0 group-hover/tool:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-2xl scale-90 group-hover/tool:scale-100 origin-bottom">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{tool.label}</span>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-2 px-2 sm:px-4 border-l border-white/10 shrink-0">
          <div className="flex gap-1.5 sm:gap-2.5">
            {(isVeryCompact ? ANNOTATION_COLORS.slice(0, 4) : ANNOTATION_COLORS).map((color) => (
              <button
                key={color}
                onClick={() => setAnnotationColor(color)}
                className={`w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] rounded-full transition-all duration-300 active:scale-75 ${
                  annotationColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-125' : 'border border-white/20 hover:scale-125 hover:border-white/40'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 pl-1 sm:pl-2 border-l border-white/10 shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1 pr-1 sm:pr-2 border-r border-white/10 shrink-0">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 ${
                canUndo ? 'text-white/40 hover:bg-white/10 hover:text-white active:scale-90' : 'text-white/10 cursor-not-allowed opacity-40'
              }`}
            >
              <Undo2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
            </button>
            {!isVeryCompact && (
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 ${
                  canRedo ? 'text-white/40 hover:bg-white/10 hover:text-white active:scale-90' : 'text-white/10 cursor-not-allowed opacity-40'
                }`}
              >
                <Redo2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
              </button>
            )}
          </div>

          <button
            onClick={onClearAnnotations}
            className="p-2 sm:p-2.5 rounded-full text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 active:scale-90"
          >
            <Eraser className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
          </button>

          {!isVeryCompact && (
            <button
              onClick={onCopy}
              className="p-2 sm:px-4 sm:py-2 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-all duration-300 flex items-center gap-2 font-bold text-[12px] active:scale-95"
            >
              <Copy className="w-4 h-4 sm:w-[16px] sm:h-[16px]" strokeWidth={2} />
              {!isCompact && <span>Copy</span>}
            </button>
          )}
          
          <button
            onClick={onSave}
            className="btn-primary"
            style={{ 
              padding: isCompact ? '0.5rem' : '0.55rem 1.4rem', 
              fontSize: '0.8rem', 
              minWidth: isCompact ? '40px' : '105px', 
              display: 'flex', 
              justifyContent: 'center',
              borderRadius: isCompact ? '9999px' : '9999px'
            }}
          >
            <Download className="w-4 h-4 sm:w-[16px] sm:h-[16px]" strokeWidth={2.5} />
            {!isCompact && <span>Export</span>}
          </button>
        </div>
      </div>
    </div>
  )
})
