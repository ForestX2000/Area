
import { useState } from 'react'
import type { DrawingTool } from '../../types/drawing'
import { MAX_ZOOM, MIN_ZOOM } from './drawingGeometry'

interface EditorToolbarProps {
  tool: DrawingTool
  onToolChange: (tool: DrawingTool) => void
  gridSize: number
  onGridSizeChange: (size: number) => void
  snapToGrid: boolean
  onSnapToggle: () => void
  zoom: number
  onZoomChange: (zoom: number) => void
  canUndo: boolean
  onUndo: () => void
  canRedo: boolean
  onRedo: () => void
}

const tools: Array<{
  id: DrawingTool
  label: string
  icon: string
}> = [
  { id: 'select', label: 'Выделение', icon: '⌘' },
  { id: 'line', label: 'Линия', icon: '─' },
  { id: 'rectangle', label: 'Прямоугольник', icon: '□' },
  { id: 'dimension', label: 'Размер', icon: '↔' },
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
  canUndo,
  onUndo,
  canRedo,
  onRedo,
}: EditorToolbarProps) {
  const [zoomInput, setZoomInput] = useState<string | null>(null)

  function commitZoom() {
    if (zoomInput !== null && zoomInput.trim() !== '') {
      const percent = Number(zoomInput)
      if (Number.isFinite(percent)) onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, percent / 100)))
    }
    setZoomInput(null)
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border-r border-line shadow-sm">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
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
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-transparent text-body hover:bg-surface-muted hover:border-line-strong'
              }`}
              title={t.label}
              aria-label={t.label}
              aria-pressed={tool === t.id}
            >
              <span className="text-sm">{t.icon}</span>
              <span className="text-[10px] font-medium leading-none">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={onUndo} disabled={!canUndo}
        className="rounded-lg border border-line px-3 py-2 text-sm text-body enabled:hover:bg-surface-muted disabled:opacity-40">
        Отменить · Ctrl + Z
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo}
        className="rounded-lg border border-line px-3 py-2 text-sm text-body enabled:hover:bg-surface-muted disabled:opacity-40">
        Вернуть · Ctrl + Y
      </button>

      <div className="mt-3 pt-3 border-t border-line-soft">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">
          Сетка
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={onSnapToggle}
              className="rounded bg-surface-subtle border-line-strong text-brand focus:ring-0"
            />
            Прилипание к сетке
          </label>
        </div>
        <div className="mt-2">
          <label htmlFor="grid-size" className="text-xs text-muted block mb-1">Размер ячейки</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-body">{gridSize} м</span>
            <input
              type="number"
              id="grid-size"
              min="0.1"
              max="100"
              step="0.1"
              value={gridSize}
              onChange={(e) => onGridSizeChange(Math.min(100, Math.max(0.1, Number(e.target.value) || 0.1)))}
              className="w-20 rounded-xl border border-line bg-surface-muted px-2 py-1.5 text-sm outline-none focus:border-brand focus:bg-white"
            />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-line-soft">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">
          Масштаб
        </span>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Уменьшить масштаб холста"
            onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.25))}
            className="p-1.5 rounded border border-line bg-white text-body hover:bg-surface-muted transition"
          >
            −
          </button>
          <label className="flex items-center gap-1 text-sm text-body">
            <input type="number" aria-label="Масштаб холста в процентах" min={MIN_ZOOM * 100}
              max={MAX_ZOOM * 100} step="1" value={zoomInput ?? Math.round(zoom * 100)}
              onChange={(event) => setZoomInput(event.target.value)} onBlur={commitZoom}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { commitZoom(); event.currentTarget.blur() }
                if (event.key === 'Escape') setZoomInput(null)
              }}
              className="w-20 rounded-xl border border-line bg-surface-muted px-2 py-1.5 text-sm outline-none focus:border-brand focus:bg-white" />
            %
          </label>
          <button
            type="button"
            aria-label="Увеличить масштаб холста"
            onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.25))}
            className="p-1.5 rounded border border-line bg-white text-body hover:bg-surface-muted transition"
          >
            +
          </button>
        </div>
      </div>

      <p className="text-xs text-muted">Ctrl + колесо над холстом — масштаб относительно курсора.</p>
      <p className="text-xs text-muted">Зажмите колесико или проведите двумя пальцами по тачпаду, чтобы переместить холст.</p>
      <p className="text-xs text-muted">Двойной клик с удержанием левой кнопки — рамка выделения.</p>

      <div className="mt-3 pt-3 border-t border-line-soft">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">
          Привязка
        </span>
        <div className="flex items-center gap-2 text-xs text-body">
          <span className="flex h-2 w-2 items-center justify-center rounded-full bg-brand text-white text-[8px] font-bold">
            ▪
          </span>
          <span>Shift — привязка к углам и концам линий</span>
        </div>
      </div>
    </div>
  )
}
