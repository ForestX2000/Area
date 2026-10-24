
<<<<<<< Updated upstream
import { useState } from 'react'
import type { DrawingObject } from '../../types/drawing'

interface PropertiesPanelProps {
  selected: DrawingObject | null
  onUpdate: (updates: Partial<DrawingObject>) => void
  onDelete: () => void
=======
import type { DrawingObject } from '../../types/drawing'
import { canAddVertex, canDeleteVertex, objectLocalBounds, objectName, PIXELS_PER_METRE, vertices } from './drawingGeometry'
import { getProjects } from '../../utils/projectStorage'

interface PropertiesPanelProps {
  selected: DrawingObject | null
  selectionCount: number
  onUpdate: (updates: Partial<DrawingObject>) => void
  onDelete: () => void
  selectedVertex?: number | null
  onAddVertex?: () => void
  onDeleteVertex?: () => void
  onEditVertices?: () => void
  panoramaError?: string
  onOpenPanorama?: () => void
  onUploadPanorama?: (file: File) => void
  onDeletePanorama?: () => void
  onStitchPanorama?: () => void
>>>>>>> Stashed changes
}

export default function PropertiesPanel({
  selected,
<<<<<<< Updated upstream
  onUpdate,
  onDelete,
}: PropertiesPanelProps) {
  const [label, setLabel] = useState(selected?.label ?? '')
  const [strokeWidth, setStrokeWidth] = useState(
    selected?.strokeWidth ?? 2
  )

  if (!selected) {
    return (
      <div className="p-4 bg-white border-l border-slate-200 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            ⌘
          </div>
          <p className="text-sm text-slate-500 text-center">
=======
  selectionCount,
  onUpdate,
  onDelete,
  selectedVertex, onAddVertex, onDeleteVertex, onEditVertices,
  panoramaError, onOpenPanorama, onUploadPanorama, onDeletePanorama, onStitchPanorama,
}: PropertiesPanelProps) {
  if (selectionCount > 1) {
    return (
      <div className="flex flex-col gap-4 border-l border-line bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-ink" role="status">Выделено объектов: {selectionCount}</h3>
        <p className="text-sm text-muted">Перетащите любую выделенную фигуру, чтобы переместить группу. Маркер над рамкой поворачивает её вокруг общего центра.</p>
        <button type="button" onClick={onDelete} title="Удалить выбранные · Delete" aria-keyshortcuts="Delete"
          className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm font-medium text-brand-hover hover:bg-brand-soft transition">
          Удалить выбранные
        </button>
      </div>
    )
  }
  if (!selected) {
    return (
      <div className="p-4 bg-surface border-l border-line shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-subtle text-muted">
            ⌘
          </div>
          <p className="text-sm text-muted text-center">
>>>>>>> Stashed changes
            Выберите объект на чертеже, чтобы задать размеры и свойства.
          </p>
        </div>
      </div>
    )
  }

<<<<<<< Updated upstream
  const width = selected.width ?? Math.abs(selected.points[1].x - selected.points[0].x)
  const height = selected.height ?? Math.abs(selected.points[1].y - selected.points[0].y)

  return (
    <div className="p-4 bg-white border-l border-slate-200 shadow-sm flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Объект: {selected.type === 'line' ? 'Линия' : 'Прямоугольник'}
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>ID:</span>
          <span className="font-mono text-slate-400">{selected.id}</span>
=======
  const box = objectLocalBounds(selected)
  const width = box.width / PIXELS_PER_METRE
  const height = box.height / PIXELS_PER_METRE

  return (
    <div className="p-4 bg-surface border-l border-line shadow-sm flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-ink mb-2">
          Объект: {objectName(selected)}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>ID:</span>
          <span className="font-mono text-muted">{selected.id}</span>
>>>>>>> Stashed changes
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
<<<<<<< Updated upstream
          <label className="text-xs font-medium text-slate-700">Название</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              onUpdate({ label: e.target.value })
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700">Ширина</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={width.toString()}
              onChange={(e) => onUpdate({ width: Number(e.target.value) || 0 })}
              className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
            />
            <span className="text-xs text-slate-500">м</span>
=======
          <label htmlFor="object-label" className="text-xs font-medium text-body">Название</label>
          <input
            type="text"
            id="object-label"
            value={selected.label ?? ''}
            onChange={(e) => {
              onUpdate({ label: e.target.value })
            }}
            className="w-full rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm outline-none focus:border-brand focus:bg-surface"
          />
        </div>

        {selected.type !== 'marker' && <><div className="space-y-2">
          <label htmlFor="object-width" className="text-xs font-medium text-body">Ширина</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              id="object-width"
              min="0"
              step="0.1"
              value={width.toString()}
              onChange={(e) => onUpdate({ width: Math.max(0, Number(e.target.value) || 0) * PIXELS_PER_METRE })}
              className="w-20 rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm outline-none focus:border-brand focus:bg-surface"
            />
            <span className="text-xs text-muted">м</span>
>>>>>>> Stashed changes
          </div>
        </div>

        <div className="space-y-2">
<<<<<<< Updated upstream
          <label className="text-xs font-medium text-slate-700">Высота</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={height.toString()}
              onChange={(e) => onUpdate({ height: Number(e.target.value) || 0 })}
              className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
            />
            <span className="text-xs text-slate-500">м</span>
=======
          <label htmlFor="object-height" className="text-xs font-medium text-body">Высота</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              id="object-height"
              min="0"
              step="0.1"
              value={height.toString()}
              onChange={(e) => onUpdate({ height: Math.max(0, Number(e.target.value) || 0) * PIXELS_PER_METRE })}
              className="w-20 rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm outline-none focus:border-brand focus:bg-surface"
            />
            <span className="text-xs text-muted">м</span>
>>>>>>> Stashed changes
          </div>
        </div>

        <div className="space-y-2">
<<<<<<< Updated upstream
          <label className="text-xs font-medium text-slate-700">Толщина линии</label>
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={strokeWidth}
            onChange={(e) => {
              setStrokeWidth(Number(e.target.value))
              onUpdate({ strokeWidth: Number(e.target.value) })
            }}
            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="mt-auto">
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
=======
          <label htmlFor="object-stroke" className="text-xs font-medium text-body">Толщина линии</label>
          <input
            type="range"
            id="object-stroke"
            min="1"
            max="6"
            step="1"
            value={selected.strokeWidth ?? 2}
            onChange={(e) => {
              onUpdate({ strokeWidth: Number(e.target.value) })
            }}
            className="w-full accent-brand h-1.5 bg-line rounded-lg appearance-none cursor-pointer"
          />
        </div></>}
      </div>

      <div className="mt-auto">
        {selected.type === 'marker' ? <div className="mb-4 grid gap-3">
          <label className="grid gap-1 text-xs">Описание метки<textarea aria-label="Описание метки" value={selected.description ?? ''} maxLength={1000}
            onChange={(event) => onUpdate({ description: event.target.value })} className="rounded-lg border border-line p-2 text-sm" /></label>
          {selected.markerKind === 'navigation' && <label className="grid gap-1 text-xs">Переход на карту<select aria-label="Переход на карту" value={selected.targetProjectId ?? ''}
            onChange={(event) => onUpdate({ targetProjectId: event.target.value })} className="w-full rounded-lg border border-line p-2 text-sm">
            <option value="">Выберите карту</option>{getProjects().map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select></label>}
          {selected.markerKind === 'navigation' && <div className="grid gap-2">
            <p className="text-xs text-muted">Панорама: {selected.panoramaKey ? 'загружена' : 'не добавлена'}</p>
            {selected.panoramaKey && <button type="button" onClick={onOpenPanorama} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-muted">Открыть панораму</button>}
            <label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-center text-sm hover:bg-surface-muted focus-within:ring-2 focus-within:ring-brand">
              {selected.panoramaKey ? 'Заменить панораму' : 'Создать панораму'}
              <input type="file" accept="image/*" aria-label={selected.panoramaKey ? 'Заменить панораму' : 'Создать панораму'} className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) onUploadPanorama?.(file)
                }} />
            </label>
            <button type="button" onClick={onStitchPanorama} className="rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand hover:bg-brand-soft">
              {selected.panoramaKey ? 'Пересобрать из фото' : 'Собрать из фото'}
            </button>
            {selected.panoramaKey && <button type="button" onClick={onDeletePanorama} className="rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-hover hover:bg-brand-soft">Удалить панораму</button>}
            {panoramaError && <p role="alert" className="text-xs text-brand-hover">{panoramaError}</p>}
          </div>}
          {selected.markerKind === 'status' && <label className="grid gap-1 text-xs">Статус<select aria-label="Статус метки" value={selected.status ?? 'ready'} onChange={(event) => onUpdate({ status: event.target.value as DrawingObject['status'] })}
            className="rounded-lg border border-line p-2 text-sm"><option value="ready">Готово</option><option value="progress">В работе</option><option value="blocked">Недоступно</option></select></label>}
        </div> : vertices(selected).length > 0 && <div className="mb-4 grid gap-2 border-t border-line pt-3">
          <p className="text-xs text-muted">Вершин: {vertices(selected).length}{selectedVertex != null ? ` · выбрана ${selectedVertex + 1}` : ''}</p>
          <button type="button" onClick={onEditVertices} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-muted">Редактировать вершины</button>
          <button type="button" onClick={onAddVertex} disabled={!canAddVertex(selected)} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-40">Добавить вершину</button>
          <button type="button" onClick={onDeleteVertex} disabled={selectedVertex == null || !canDeleteVertex(selected)} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-40">Удалить вершину</button>
        </div>}
        <button
          type="button"
          onClick={onDelete}
          title="Удалить объект · Delete"
          aria-keyshortcuts="Delete"
          className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm font-medium text-brand-hover hover:bg-brand-soft transition"
>>>>>>> Stashed changes
        >
          Удалить объект
        </button>
      </div>
    </div>
  )
}
