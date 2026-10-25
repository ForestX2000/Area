import { useState } from 'react'
import type { ReactNode } from 'react'
import type { DrawingTool, MarkerKind } from '../../types/drawing'
import { MARKER_LABELS, MAX_ZOOM, MIN_ZOOM, SHAPE_TOOLS } from './drawingGeometry'

function ToolIcon({ id, fallback }: { id: DrawingTool; fallback: string }) {
  const props = { viewBox: '0 0 24 24', className: 'h-5 w-5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (id === 'dimension') return <svg {...props} data-icon="ruler">
    <rect x="2.5" y="7.5" width="19" height="9" rx="1.5" />
    <path d="M6 7.5v3M9.5 7.5v4.5M13 7.5v3M16.5 7.5v4.5M20 7.5v3" />
  </svg>
  if (id === 'stairs') return <svg {...props} data-icon="stairs">
    <path d="M3 20h5v-5h5v-5h5V5h3" />
    <path d="M3 20V5" opacity="0.35" />
  </svg>
  return <span className="text-lg leading-5">{fallback}</span>
}

interface EditorToolbarProps {
  tool: DrawingTool; onToolChange: (tool: DrawingTool) => void
  gridSize: number; onGridSizeChange: (size: number) => void
  snapToGrid: boolean; onSnapToggle: () => void
  zoom: number; onZoomChange: (zoom: number) => void
  canUndo: boolean; onUndo: () => void; canRedo: boolean; onRedo: () => void
  showServiceMarks: boolean; onServiceToggle: () => void
  onStartTutorial?: () => void
  children?: ReactNode
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
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Инструменты</h2>
        {props.onStartTutorial && <button type="button" onClick={props.onStartTutorial} title="Пройти интерактивное обучение"
          className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand-soft">Обучение</button>}
      </div>
      <div className="grid grid-cols-2 gap-1.5">{SHAPE_TOOLS.map((item) =>
        <button key={item.id} type="button" aria-label={item.label} aria-pressed={props.tool === item.id} title={item.label} onClick={() => props.onToolChange(item.id)}
          data-tool={item.id}
          className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition ${props.tool === item.id ? 'border-brand bg-brand-soft text-brand' : 'border-transparent hover:border-line hover:bg-surface-muted'}`}>
          <span aria-hidden="true" className="flex h-5 items-center"><ToolIcon id={item.id} fallback={item.icon} /></span><span className="max-w-full break-words text-center text-[10px] leading-tight">{item.label}</span>
        </button>)}
      </div>
      <div className="mt-3 grid gap-2">
        <button type="button" data-tutorial="undo" disabled={!props.canUndo} onClick={props.onUndo} className={buttonClass}>Отменить · Ctrl + Z</button>
        <button type="button" disabled={!props.canRedo} onClick={props.onRedo} className={buttonClass}>Вернуть · Ctrl + Y</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">Многоугольник — кликами по точкам, затем по первой. Shift + клик — несколько объектов. Ctrl + A — выделить всё. ПКМ — меню действий.</p>
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
    {props.children}
    <section aria-label="Настройки сетки и масштаба" className="space-y-3 border-t border-line pt-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Сетка и масштаб</h2>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={props.snapToGrid} onChange={props.onSnapToggle} />Прилипание к сетке</label>
      <label className="flex items-center justify-between gap-2 text-xs">Размер ячейки
        <span className="flex items-center gap-1"><input aria-label="Размер ячейки" type="number" min="0.1" max="100" step="0.1" value={props.gridSize}
          onChange={(event) => props.onGridSizeChange(Math.min(100, Math.max(0.1, Number(event.target.value) || 0.1)))} className={inputClass} />м</span>
      </label>
      <div className="flex items-center justify-between gap-1">
        <button type="button" aria-label="Уменьшить масштаб холста" onClick={() => props.onZoomChange(Math.max(MIN_ZOOM, props.zoom > 0.25 ? props.zoom - 0.25 : props.zoom / 2))} className={buttonClass}>−</button>
        <label className="flex items-center gap-1 text-xs"><input type="number" aria-label="Масштаб холста в процентах" min="1" max="400" step="1" value={zoomInput ?? Math.round(props.zoom * 100)}
          onChange={(event) => setZoomInput(event.target.value)} onBlur={commitZoom}
          onKeyDown={(event) => { if (event.key === 'Enter') { commitZoom(); event.currentTarget.blur() } if (event.key === 'Escape') setZoomInput(null) }} className={inputClass} />%</label>
        <button type="button" aria-label="Увеличить масштаб холста" onClick={() => props.onZoomChange(Math.min(MAX_ZOOM, props.zoom + 0.25))} className={buttonClass}>+</button>
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={props.showServiceMarks} onChange={props.onServiceToggle} />Показывать служебные метки</label>
    </section>
  </div>
}
