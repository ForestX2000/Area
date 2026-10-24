
import type { DrawingTool } from '../../types/drawing'

interface EditorToolbarProps {
  tool: DrawingTool
  onToolChange: (tool: DrawingTool) => void
  gridSize: number
  onGridSizeChange: (size: number) => void
  snapToGrid: boolean
  onSnapToggle: () => void
  zoom: number
  onZoomChange: (zoom: number) => void
}

const tools: Array<{
  id: DrawingTool
  label: string
  icon: string
  color: string
}> = [
  { id: 'select', label: 'Выделение', icon: '⌘', color: '#64748b' },
  { id: 'line', label: 'Линия', icon: '─', color: '#1e293b' },
  { id: 'rectangle', label: 'Прямоугольник', icon: '□', color: '#1e293b' },
  { id: 'square', label: 'Квадрат', icon: '◩', color: '#1e293b' },
  { id: 'dimension', label: 'Размер', icon: '↔', color: '#059669' },
]

export default function EditorToolbar({
  tool,
  onToolChange,
  gridSize,
  onGridSizeChange,
  snapToGrid,
  onSnapToggle,
  zoom,
  onZoomChange,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-white border-r border-slate-200 shadow-sm">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Инструменты
        </span>
        <div className="grid grid-cols-2 gap-2">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onToolChange(t.id)}
              className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border transition ${
                tool === t.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
              title={t.label}
            >
              <span className="text-sm">{t.icon}</span>
              <span className="text-[10px] font-medium leading-none">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Сетка
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={onSnapToggle}
              className="rounded bg-slate-100 border-slate-300 text-indigo-600 focus:ring-0"
            />
            Прилипание к сетке
          </label>
        </div>
        <div className="mt-2">
          <label className="text-xs text-slate-500 block mb-1">Размер ячейки</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{gridSize} м</span>
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={gridSize}
              onChange={(e) => onGridSizeChange(Math.max(0.1, Number(e.target.value) || 0.1))}
              className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Масштаб
        </span>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            −
          </button>
          <span className="text-sm font-medium text-slate-700 w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Привязка
        </span>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="flex h-2 w-2 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold">
            ▪
          </span>
          <span>Shift — привязка к углам и концам линий</span>
        </div>
      </div>
    </div>
  )
}
