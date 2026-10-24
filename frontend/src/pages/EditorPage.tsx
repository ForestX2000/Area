
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CanvasEditor from '../components/editor/CanvasEditor'
import EditorToolbar from '../components/editor/EditorToolbar'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import EditorNavigation from '../components/editor/EditorNavigation'
import { addVertex, canAddVertex, canDeleteVertex, deleteVertex, objectBounds, objectName, scaleDrawing } from '../components/editor/drawingGeometry'
import type { DrawingObject, DrawingTool } from '../types/drawing'
import { getProjects } from '../utils/projectStorage'
import { getFloor, saveFloorDrawings } from '../utils/floorStorage'
import { useProjectFloor } from '../utils/useProjects'

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [params] = useSearchParams()
  const { floor } = useProjectFloor(projectId, params.get('floor'))
  const floorId = floor?.id ?? 'default'
  return <ProjectEditor key={`${projectId}:${floorId}`} projectId={projectId} floorId={floorId} />
}

function ProjectEditor({ projectId, floorId }: { projectId?: string; floorId: string }) {
  const navigate = useNavigate()
  const [history, setHistory] = useState<{ objects: DrawingObject[]; past: DrawingObject[][]; future: DrawingObject[][] }>(() => {
    const project = getProjects().find((project) => project.id === projectId)
    return { objects: project ? getFloor(project, floorId).drawings ?? [] : [], past: [], future: [] }
  })
  const objects = history.objects
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const [tool, setTool] = useState<DrawingTool>('select')
  const [gridSize, setGridSize] = useState(0.5)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null)
  const [showServiceMarks, setShowServiceMarks] = useState(false)

  const project = projectId
    ? getProjects().find((p) => p.id === projectId)
    : undefined

  const selected = objects.find((o) => o.id === selectedId) ?? null

  useEffect(() => {
    if (!projectId) return
    try {
      saveFloorDrawings(projectId, floorId, objects)
    } catch {
      // Keep the drawing available in memory if local storage is full.
    }
  }, [objects, projectId, floorId])

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
    setSelectedVertex(null)
  }, [])

  const handleRedo = useCallback(() => {
    setHistory((previous) => {
      const objects = previous.future.at(-1)
      return objects ? { objects, past: [...previous.past.slice(-99), previous.objects], future: previous.future.slice(0, -1) } : previous
    })
    setSelectedIds([])
    setSelectedVertex(null)
  }, [])

  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) return
    if (tool === 'vertices' && selectedVertex !== null && selected) {
      if (canDeleteVertex(selected)) {
        handleObjectsChange(objects.map((object) => object.id === selected.id ? deleteVertex(object, selectedVertex) : object))
        setSelectedVertex(null)
      }
      return
    }
    setSelectedIds([])
    handleObjectsChange(objects.filter((object) => !selectedIds.includes(object.id)))
  }, [selectedIds, objects, handleObjectsChange, selectedVertex, tool, selected])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target
      if (target instanceof Element && target.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable]:not([contenteditable="false"])')) return
      if (event.key === 'Delete' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        if (selectedIds.length > 0) {
          event.preventDefault()
          handleDelete()
        }
        return
      }
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
      if (event.code === 'KeyA' || event.key.toLowerCase() === 'a') {
        event.preventDefault()
        setSelectedIds(objects.filter((object) => object.markerKind !== 'service' || showServiceMarks).map((object) => object.id))
        setSelectedVertex(null)
        setTool('select')
      } else if (event.code === 'KeyZ' || event.key.toLowerCase() === 'z') {
        event.preventDefault()
        handleUndo()
      } else if (event.code === 'KeyY' || event.key.toLowerCase() === 'y') {
        event.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleDelete, selectedIds.length, objects, showServiceMarks])

  const handleSelect = useCallback((ids: string[], activateSelectionTool = false) => {
    setSelectedIds(ids)
    if (activateSelectionTool) setTool('select')
    setSelectedVertex(null)
  }, [])

  const handleUpdate = useCallback(
    (updates: Partial<DrawingObject>) => {
      if (!selectedId) return
      handleObjectsChange(objects.map((object) => {
        if (object.id !== selectedId) return object
        let next = { ...object, ...updates }
        if (updates.width !== undefined || updates.height !== undefined) {
          const box = objectBounds(object)
          let width = updates.width ?? box.width
          let height = updates.height ?? box.height
          if (object.isSquare) width = height = updates.width ?? updates.height ?? width
          next = scaleDrawing(next, width, height)
        }
        return next
      }))
    },
    [selectedId, objects, handleObjectsChange]
  )

  if (!projectId || !project) {
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
      <EditorNavigation projectId={projectId} />
      <div className="grid overflow-hidden rounded-b-xl border border-line md:h-[calc(100dvh-12rem)] md:min-h-[38rem] md:grid-cols-[240px_minmax(0,1fr)_240px]">
        <aside aria-label="Свойства и объекты" className="order-3 overflow-y-auto border-l border-line bg-white">
          <PropertiesPanel selected={selected} selectionCount={selectedIds.length} onUpdate={handleUpdate} onDelete={handleDelete}
            selectedVertex={selectedVertex} onEditVertices={() => setTool('vertices')}
            onAddVertex={() => {
              if (!selected || !canAddVertex(selected)) return
              const added = addVertex(selected)
              handleObjectsChange(objects.map((object) => object.id === selected.id ? added.object : object))
              setTool('vertices'); setSelectedVertex(added.index)
            }}
            onDeleteVertex={() => {
              if (!selected || selectedVertex === null || !canDeleteVertex(selected)) return
              handleObjectsChange(objects.map((object) => object.id === selected.id ? deleteVertex(object, selectedVertex) : object))
              setSelectedVertex(null)
            }} />
          <section aria-label="Список объектов" className="border-t border-line p-3">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Все объекты</h2>
            <ul className="space-y-1">{objects.filter((object) => object.markerKind !== 'service' || showServiceMarks).map((object, index) => <li key={object.id}>
              <button type="button" aria-pressed={selectedIds.includes(object.id)}
                onClick={(event) => {
                  const ids = event.shiftKey || event.ctrlKey ? selectedIds.includes(object.id) ? selectedIds.filter((id) => id !== object.id) : [...selectedIds, object.id] : [object.id]
                  handleSelect(ids); if (tool !== 'vertices') setTool('select')
                }} className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs ${selectedIds.includes(object.id) ? 'bg-brand-soft text-brand' : 'hover:bg-surface-muted'}`}>
                {object.label || `${objectName(object)} ${index + 1}`}
              </button>
            </li>)}</ul>
            {objects.length === 0 && <p className="text-xs text-muted">Пока нет объектов</p>}
          </section>
        </aside>
        <div className="order-1 h-96 min-w-0 md:order-2 md:h-full">
          <CanvasEditor objects={objects} onObjectsChange={handleObjectsChange} selectedIds={selectedIds} onSelect={handleSelect}
            tool={tool} gridSize={gridSize} snapToGrid={snapToGrid} zoom={zoom} onZoomChange={setZoom}
            selectedVertex={selectedVertex} onVertexSelect={setSelectedVertex} showServiceMarks={showServiceMarks}
            onActivateMarker={(object) => { if (object.markerKind === 'navigation' && object.targetProjectId) navigate(`/projects/${object.targetProjectId}/map`) }} />
        </div>
        <aside aria-label="Панель инструментов" className="order-2 overflow-y-auto border-r border-line md:order-1">
          <EditorToolbar
            tool={tool}
            onToolChange={(next) => { setTool(next); if (next === 'marker-service') setShowServiceMarks(true); if (next !== 'vertices') setSelectedIds([]); setSelectedVertex(null) }}
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
            showServiceMarks={showServiceMarks}
            onServiceToggle={() => { setShowServiceMarks((value) => !value); setSelectedIds([]); setSelectedVertex(null); setTool('select') }}
          />
        </aside>

      </div>
    </div>
  )
}
