
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CanvasEditor from '../components/editor/CanvasEditor'
import EditorToolbar from '../components/editor/EditorToolbar'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import type { DrawingObject, DrawingTool } from '../types/drawing'
import { getProjects, saveProjects } from '../utils/projectStorage'

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  return <ProjectEditor key={projectId} projectId={projectId} />
}

function ProjectEditor({ projectId }: { projectId?: string }) {
  const [history, setHistory] = useState<{ objects: DrawingObject[]; past: DrawingObject[][]; future: DrawingObject[][] }>(() => ({
    objects: getProjects().find((project) => project.id === projectId)?.drawings ?? [], past: [], future: [],
  }))
  const objects = history.objects
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const [tool, setTool] = useState<DrawingTool>('select')
  const [gridSize, setGridSize] = useState(0.5)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [zoom, setZoom] = useState(1)

  const project = projectId
    ? getProjects().find((p) => p.id === projectId)
    : undefined

  const selected = objects.find((o) => o.id === selectedId) ?? null

  useEffect(() => {
    if (!projectId) return
    try {
      saveProjects(getProjects().map((project) => project.id === projectId ? { ...project, drawings: objects } : project))
    } catch {
      // Keep the drawing available in memory if local storage is full.
    }
  }, [objects, projectId])

  const handleObjectsChange = useCallback((next: DrawingObject[]) => {
    setHistory((previous) => JSON.stringify(previous.objects) === JSON.stringify(next) ? previous : {
      objects: next, past: [...previous.past.slice(-99), previous.objects], future: [],
    })
  }, [])

  const handleUndo = useCallback(() => {
    setHistory((previous) => {
      const objects = previous.past.at(-1)
      return objects ? { objects, past: previous.past.slice(0, -1), future: [...previous.future, previous.objects] } : previous
    })
    setSelectedIds([])
  }, [])

  const handleRedo = useCallback(() => {
    setHistory((previous) => {
      const objects = previous.future.at(-1)
      return objects ? { objects, past: [...previous.past.slice(-99), previous.objects], future: previous.future.slice(0, -1) } : previous
    })
    setSelectedIds([])
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
      if (event.code === 'KeyZ' || event.key.toLowerCase() === 'z') {
        event.preventDefault()
        handleUndo()
      } else if (event.code === 'KeyY' || event.key.toLowerCase() === 'y') {
        event.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  const handleSelect = useCallback((ids: string[], activateSelectionTool = false) => {
    setSelectedIds(ids)
    if (activateSelectionTool) setTool('select')
  }, [])

  const handleUpdate = useCallback(
    (updates: Partial<DrawingObject>) => {
      if (!selectedId) return
      handleObjectsChange(objects.map((object) => {
        if (object.id !== selectedId) return object
        const next = { ...object, ...updates }
        if (updates.width !== undefined || updates.height !== undefined) {
          const [a, b] = object.points
          let width = updates.width ?? Math.abs(b.x - a.x)
          let height = updates.height ?? Math.abs(b.y - a.y)
          if (object.isSquare) width = height = updates.width ?? updates.height ?? width
          next.points = [a, {
            x: a.x + (b.x < a.x ? -width : width),
            y: a.y + (b.y < a.y ? -height : height),
          }]
          next.width = width
          next.height = height
        }
        return next
      }))
    },
    [selectedId, objects, handleObjectsChange]
  )

  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) return
    setSelectedIds([])
    handleObjectsChange(objects.filter((object) => !selectedIds.includes(object.id)))
  }, [selectedIds, objects, handleObjectsChange])

  if (!projectId) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-ink">Редактор чертежей</h2>
          <p className="mt-2 text-muted">
            Выберите проект, чтобы открыть редактор планировки.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover"
          >
            ← Назад к проектам
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-muted">
      <div className="flex flex-col md:flex-row md:h-[calc(100dvh-10rem)] min-h-[32rem] overflow-hidden rounded-xl border border-line">
        {/*Toolbar — только слева, кнопки на канвасе убраны*/}
        <aside className="flex flex-col md:w-56 shrink-0 overflow-y-auto">
          <EditorToolbar
            tool={tool}
            onToolChange={(next) => { setTool(next); setSelectedIds([]) }}
            gridSize={gridSize}
            onGridSizeChange={setGridSize}
            snapToGrid={snapToGrid}
            onSnapToggle={() => setSnapToGrid((prev) => !prev)}
            zoom={zoom}
            onZoomChange={setZoom}
            canUndo={history.past.length > 0}
            onUndo={handleUndo}
            canRedo={history.future.length > 0}
            onRedo={handleRedo}
          />
        </aside>

        {/*Canvas — только область рисования*/}
        <div className="flex-1 min-w-0 min-h-96 relative flex flex-col">
          <div className="shrink-0 border-b border-line bg-white p-3 flex flex-wrap items-center gap-3">
            <Link
              to={`/projects/${projectId}`}
              className="flex items-center gap-2 text-sm font-medium text-muted hover:text-brand transition"
            >
              ← Назад к проекту
            </Link>
            <span className="w-px h-5 bg-line-strong" />
            <span className="text-sm font-medium text-ink">
              Редактор: {project?.name ?? 'Проект'}
            </span>
          </div>

          <div className="h-96 md:h-auto md:flex-1 min-h-0">
            <CanvasEditor
              objects={objects}
              onObjectsChange={handleObjectsChange}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              tool={tool}
              gridSize={gridSize}
              snapToGrid={snapToGrid}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          </div>
        </div>

        {/*Properties*/}
        <aside className="md:w-64 shrink-0 overflow-y-auto border-l border-line bg-white">
          <PropertiesPanel
            selected={selected}
            selectionCount={selectedIds.length}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </aside>
      </div>
    </div>
  )
}
