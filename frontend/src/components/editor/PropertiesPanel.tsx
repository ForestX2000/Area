
import type { DrawingObject } from '../../types/drawing'
import { canAddVertex, canDeleteVertex, isStairs, objectLocalBounds, objectName, PIXELS_PER_METRE, vertices } from './drawingGeometry'
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
  floors?: { id: string; name: string }[]
  currentFloorId?: string
  onGoToFloor?: (floorId: string) => void
}

export default function PropertiesPanel({
  selected,
  selectionCount,
  onUpdate,
  onDelete,
  selectedVertex, onAddVertex, onDeleteVertex, onEditVertices,
  panoramaError, onOpenPanorama, onUploadPanorama, onDeletePanorama, onStitchPanorama,
  floors = [], currentFloorId, onGoToFloor,
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
            Выберите объект на чертеже, чтобы задать размеры и свойства.
          </p>
        </div>
      </div>
    )
  }

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
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
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
          </div>
        </div>

        <div className="space-y-2">
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
          </div>
        </div>

        <div className="space-y-2">
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

        {isStairs(selected) && <div className="grid gap-2 rounded-xl border border-line bg-surface-muted p-3">
          <label className="grid gap-1 text-xs font-medium text-body">Ведёт на этаж
            <select aria-label="Лестница ведёт на этаж" value={selected.targetFloorId ?? ''} onChange={(event) => onUpdate({ targetFloorId: event.target.value || undefined })}
              className="w-full rounded-lg border border-line bg-surface p-2 text-sm">
              <option value="">Не выбрано</option>
              {floors.filter((floor) => floor.id !== currentFloorId).map((floor) => <option key={floor.id} value={floor.id}>Этаж {floor.name}</option>)}
            </select>
          </label>
          {floors.length < 2 && <p className="text-xs leading-5 text-muted">Для перехода по лестнице добавьте второй этаж через меню «Этаж».</p>}
          {selected.targetFloorId && floors.some((floor) => floor.id === selected.targetFloorId) && <button type="button" onClick={() => onGoToFloor?.(selected.targetFloorId!)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-brand-soft">Перейти на этаж {floors.find((floor) => floor.id === selected.targetFloorId)?.name}</button>}
          <p className="text-xs leading-5 text-muted">Маршруты между этажами проходят через лестницы. Двойной клик по лестнице открывает связанный этаж.</p>
        </div>}

        {['rectangle', 'ellipse', 'polygon'].includes(selected.type) && !isStairs(selected) && <label className="flex items-start gap-2 text-xs leading-5 text-body">
          <input type="checkbox" checked={Boolean(selected.passable)} onChange={(event) => onUpdate({ passable: event.target.checked || undefined })} className="mt-1" />
          <span>Проходимая зона<span className="block text-muted">Коридор или холл: маршрут может идти через фигуру.</span></span>
        </label>}
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
        >
          Удалить объект
        </button>
      </div>
    </div>
  )
}
