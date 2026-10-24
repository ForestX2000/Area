<<<<<<< Updated upstream

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
              type="range"
              min="10"
              max="100"
              step="10"
              value={gridSize}
              onChange={(e) => onGridSizeChange(Number(e.target.value))}
              className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
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
    </div>
  )
=======
import { useState } from 'react'
import type { DrawingTool, MarkerKind } from '../../types/drawing'
import { MARKER_LABELS, MAX_ZOOM, MIN_ZOOM, SHAPE_TOOLS } from './drawingGeometry'

interface EditorToolbarProps {
  tool: DrawingTool; onToolChange: (tool: DrawingTool) => void
  gridSize: number; onGridSizeChange: (size: number) => void
  snapToGrid: boolean; onSnapToggle: () => void
  zoom: number; onZoomChange: (zoom: number) => void
  canUndo: boolean; onUndo: () => void; canRedo: boolean; onRedo: () => void
  showServiceMarks: boolean; onServiceToggle: () => void
}

export default function EditorToolbar(props: EditorToolbarProps) {
  const [zoomInput, setZoomInput] = useState<string | null>(null)
  function commitZoom() {
    if (zoomInput?.trim() && Number.isFinite(Number(zoomInput))) props.onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(zoomInput) / 100)))
    setZoomInput(null)
  }
  const inputClass = 'w-20 rounded-xl border border-line bg-surface-muted px-2 py-1.5 text-sm outline-none focus:border-brand focus:bg-surface'
  const buttonClass = 'rounded-lg border border-line px-3 py-2 text-sm enabled:hover:bg-surface-muted disabled:opacity-40'
  return <div className="flex min-h-full flex-col gap-4 bg-surface p-3">
    <section aria-label="Инструменты и фигуры">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Инструменты</h2>
      <div className="grid grid-cols-2 gap-1.5">{SHAPE_TOOLS.map((item) =>
        <button key={item.id} type="button" aria-label={item.label} aria-pressed={props.tool === item.id} title={item.label} onClick={() => props.onToolChange(item.id)}
          className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition ${props.tool === item.id ? 'border-brand bg-brand-soft text-brand' : 'border-transparent hover:border-line hover:bg-surface-muted'}`}>
          <span aria-hidden="true" className="text-lg leading-5">{item.icon}</span><span className="max-w-full break-words text-center text-[10px] leading-tight">{item.label}</span>
        </button>)}
      </div>
      <div className="mt-3 grid gap-2">
        <button type="button" disabled={!props.canUndo} onClick={props.onUndo} className={buttonClass}>Отменить · Ctrl + Z</button>
        <button type="button" disabled={!props.canRedo} onClick={props.onRedo} className={buttonClass}>Вернуть · Ctrl + Y</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">Многоугольник — кликами по точкам, затем по первой. Shift + клик — несколько объектов. Ctrl + A — выделить всё.</p>
    </section>
    <section aria-label="Метки" className="border-t border-line pt-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Метки</h2>
      <div className="grid grid-cols-2 gap-2">{(Object.keys(MARKER_LABELS) as MarkerKind[]).map((kind) =>
        <button key={kind} type="button" aria-label={`${MARKER_LABELS[kind]} метка`} aria-pressed={props.tool === `marker-${kind}`} onClick={() => props.onToolChange(`marker-${kind}`)}
          title={`${MARKER_LABELS[kind]} метка`}
          className={`min-w-0 rounded-lg border px-2 py-2 ${props.tool === `marker-${kind}` ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:bg-surface-muted'}`}>
          <span className="text-xs">{{ info: 'Инфо', navigation: 'Навигация', status: 'Статус', service: 'Служебная' }[kind]}</span>
        </button>)}
      </div>
    </section>
    <section aria-label="Настройки сетки и масштаба" className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Сетка и масштаб</h2>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={props.snapToGrid} onChange={props.onSnapToggle} />Прилипание к сетке</label>
      <label className="flex items-center justify-between gap-2 text-xs">Размер ячейки
        <span className="flex items-center gap-1"><input aria-label="Размер ячейки" type="number" min="0.1" max="100" step="0.1" value={props.gridSize}
          onChange={(event) => props.onGridSizeChange(Math.min(100, Math.max(0.1, Number(event.target.value) || 0.1)))} className={inputClass} />м</span>
      </label>
      <div className="flex items-center justify-between gap-1">
        <button type="button" aria-label="Уменьшить масштаб холста" onClick={() => props.onZoomChange(Math.max(MIN_ZOOM, props.zoom - 0.25))} className={buttonClass}>−</button>
        <label className="flex items-center gap-1 text-xs"><input type="number" aria-label="Масштаб холста в процентах" min="25" max="400" step="1" value={zoomInput ?? Math.round(props.zoom * 100)}
          onChange={(event) => setZoomInput(event.target.value)} onBlur={commitZoom}
          onKeyDown={(event) => { if (event.key === 'Enter') { commitZoom(); event.currentTarget.blur() } if (event.key === 'Escape') setZoomInput(null) }} className={inputClass} />%</label>
        <button type="button" aria-label="Увеличить масштаб холста" onClick={() => props.onZoomChange(Math.min(MAX_ZOOM, props.zoom + 0.25))} className={buttonClass}>+</button>
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={props.showServiceMarks} onChange={props.onServiceToggle} />Показывать служебные метки</label>
    </section>
  </div>
>>>>>>> Stashed changes
}
