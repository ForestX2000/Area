
<<<<<<< Updated upstream
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CanvasEditor from '../components/editor/CanvasEditor'
import EditorToolbar from '../components/editor/EditorToolbar'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import type { DrawingObject, DrawingTool } from '../types/drawing'
import { getProjects, saveProjects } from '../utils/projectStorage'

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [objects, setObjects] = useState<DrawingObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<DrawingTool>('select')
  const [gridSize, setGridSize] = useState(50)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [zoom, setZoom] = useState(1)
=======
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CanvasEditor from '../components/editor/CanvasEditor'
import EditorToolbar from '../components/editor/EditorToolbar'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import EditorNavigation from '../components/editor/EditorNavigation'
import PanoramaViewer from '../components/PanoramaViewer'
import PanoramaStitchDialog from '../components/PanoramaStitchDialog'
import { addVertex, canAddVertex, canDeleteVertex, deleteVertex, objectLocalBounds, objectName, scaleDrawing } from '../components/editor/drawingGeometry'
import type { DrawingObject, DrawingTool } from '../types/drawing'
import { getProjects } from '../utils/projectStorage'
import { floorStorageId, getFloor, saveFloorDrawings } from '../utils/floorStorage'
import { useProjectFloor } from '../utils/useProjects'
import { deletePanorama, getPanorama, savePanorama } from '../utils/mapStorage'
import { useObjectUrl } from '../utils/useObjectUrl'
import { useConfirmation } from '../contexts/useConfirmation'

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
  const confirm = useConfirmation()
  const storageId = floorStorageId(projectId ?? '', floorId)
  const [viewer, setViewer] = useState<{ id: string; title: string } | null>(null)
  const [viewerUrl, replaceViewerUrl] = useObjectUrl()
  const [panoramaError, setPanoramaError] = useState('')
  const [stitchOpen, setStitchOpen] = useState(false)
>>>>>>> Stashed changes

  const project = projectId
    ? getProjects().find((p) => p.id === projectId)
    : undefined

  const selected = objects.find((o) => o.id === selectedId) ?? null
<<<<<<< Updated upstream

  const handleObjectsChange = useCallback(
    (next: DrawingObject[]) => {
      setObjects(next)
      if (projectId) {
        const projects = getProjects()
        const updated = projects.map((p) =>
          p.id === projectId ? { ...p, drawings: next } : p
        )
        try {
          saveProjects(updated)
        } catch {
          // silently ignore storage errors in MVP
        }
      }
    },
    [projectId]
  )

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
=======
  const navigationPanoramas = objects.filter((object) => object.markerKind === 'navigation' && object.panoramaKey)

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
    setPanoramaError('')
    if (activateSelectionTool) setTool('select')
    setSelectedVertex(null)
>>>>>>> Stashed changes
  }, [])

  const handleUpdate = useCallback(
    (updates: Partial<DrawingObject>) => {
      if (!selectedId) return
<<<<<<< Updated upstream
      setObjects((prev) =>
        prev.map((o) =>
          o.id === selectedId ? { ...o, ...updates } : o
        )
      )
    },
    [selectedId]
  )

  const handleDelete = useCallback(() => {
    if (!selectedId) return
    setObjects((prev) => prev.filter((o) => o.id !== selectedId))
    setSelectedId(null)
    handleObjectsChange(objects.filter((o) => o.id !== selectedId))
  }, [selectedId, objects, handleObjectsChange])

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">Редактор чертежей</h2>
          <p className="mt-2 text-slate-500">
=======
      handleObjectsChange(objects.map((object) => {
        if (object.id !== selectedId) return object
        let next = { ...object, ...updates }
        if (updates.width !== undefined || updates.height !== undefined) {
          const box = objectLocalBounds(object)
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

  // Loads the panorama of the open marker; a missing file closes the viewer instead of showing a blank sphere.
  useEffect(() => {
    if (!viewer) {
      replaceViewerUrl()
      return
    }
    let cancelled = false
    replaceViewerUrl()
    getPanorama(storageId, viewer.id)
      .then((file) => {
        if (cancelled) return
        if (file) {
          replaceViewerUrl(file)
        } else {
          setViewer(null)
          setPanoramaError('Панорама не найдена. Загрузите её заново.')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setViewer(null)
          setPanoramaError('Не удалось открыть панораму.')
        }
      })
    return () => { cancelled = true }
  }, [viewer, storageId, replaceViewerUrl])

  // Changes only the given object, reading the latest state so async panorama work cannot overwrite edits.
  const updateObject = useCallback((id: string, changes: Partial<DrawingObject>) => {
    setHistory((previous) => ({
      objects: previous.objects.map((object) => object.id === id ? { ...object, ...changes } : object),
      past: [...previous.past.slice(-99), previous.objects],
      future: [],
    }))
  }, [])

  function openMarkerPanorama(object: DrawingObject) {
    setPanoramaError('')
    setViewer({ id: object.id, title: object.label || objectName(object) })
  }

  function activateMarker(object: DrawingObject) {
    if (object.markerKind !== 'navigation') return
    if (object.panoramaKey) openMarkerPanorama(object)
    else if (object.targetProjectId) navigate(`/projects/${object.targetProjectId}/map`)
  }

  async function handleMarkerPanoramaUpload(file: File) {
    if (!selected) return
    if (!file.type.startsWith('image/')) {
      setPanoramaError('Выберите файл изображения для панорамы.')
      return
    }
    const id = selected.id
    try {
      await savePanorama(storageId, id, file)
      setPanoramaError('')
      updateObject(id, { panoramaKey: `panorama:${storageId}:${id}` })
    } catch {
      setPanoramaError('Не удалось сохранить панораму.')
    }
  }

  async function handleMarkerPanoramaDelete() {
    if (!selected) return
    const confirmed = await confirm({ title: 'Удалить панораму?', message: 'Панорама этой метки будет удалена. Сама метка останется на чертеже.' })
    if (!confirmed) return
    const id = selected.id
    try {
      await deletePanorama(storageId, id)
      setPanoramaError('')
      updateObject(id, { panoramaKey: undefined })
    } catch {
      setPanoramaError('Не удалось удалить панораму.')
    }
  }

  if (!projectId || !project) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-ink">Редактор чертежей</h2>
          <p className="mt-2 text-muted">
>>>>>>> Stashed changes
            Выберите проект, чтобы открыть редактор планировки.
          </p>
          <Link
            to="/"
<<<<<<< Updated upstream
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
=======
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover"
>>>>>>> Stashed changes
          >
            ← Назад к проектам
          </Link>
        </div>
      </div>
    )
  }

  return (
<<<<<<< Updated upstream
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">
        {/*Toolbar*/}
        <aside className="hidden md:flex flex-col w-64">
          <EditorToolbar
            tool={tool}
            onToolChange={setTool}
=======
    <div className="bg-surface-muted">
      <EditorNavigation projectId={projectId} />
      <div className="grid overflow-hidden rounded-b-xl border border-line md:h-[calc(100dvh-12rem)] md:min-h-[38rem] md:grid-cols-[240px_minmax(0,1fr)_240px]">
        <aside aria-label="Свойства и объекты" className="order-3 overflow-y-auto border-l border-line bg-surface">
          <PropertiesPanel selected={selected} selectionCount={selectedIds.length} onUpdate={handleUpdate} onDelete={handleDelete}
            panoramaError={panoramaError} onOpenPanorama={() => { if (selected) openMarkerPanorama(selected) }}
            onUploadPanorama={handleMarkerPanoramaUpload} onDeletePanorama={handleMarkerPanoramaDelete}
            onStitchPanorama={() => setStitchOpen(true)}
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
            onActivateMarker={activateMarker} />
        </div>
        <aside aria-label="Панель инструментов" className="order-2 overflow-y-auto border-r border-line md:order-1">
          <EditorToolbar
            tool={tool}
            onToolChange={(next) => { setTool(next); if (next === 'marker-service') setShowServiceMarks(true); if (next !== 'vertices') setSelectedIds([]); setSelectedVertex(null) }}
>>>>>>> Stashed changes
            gridSize={gridSize}
            onGridSizeChange={setGridSize}
            snapToGrid={snapToGrid}
            onSnapToggle={() => setSnapToGrid((prev) => !prev)}
            zoom={zoom}
            onZoomChange={setZoom}
<<<<<<< Updated upstream
          />
        </aside>

        {/*Canvas*/}
        <div className="flex-1 min-w-0 relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
            <Link
              to={`/projects/${projectId}`}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition"
            >
              ← Назад к проекту
            </Link>
            <span className="w-px h-5 bg-slate-300" />
            <span className="text-sm font-medium text-slate-900">
              Редактор: {project?.name ?? 'Проект'}
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const newObj: DrawingObject = {
                  id: `obj-${Date.now()}`,
                  type: 'rectangle',
                  points: [
                    { x: 100, y: 100 },
                    { x: 200, y: 150 },
                  ],
                  stroke: '#1e293b',
                  strokeWidth: 2,
                  fill: 'rgba(37, 99, 235, 0.05)',
                }
                setObjects((prev) => {
                  const next = [...prev, newObj]
                  handleObjectsChange(next)
                  return next
                })
                setSelectedId(newObj.id)
              }}
              className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition"
              title="Добавить прямоугольник"
            >
              □
            </button>
            <button
              type="button"
              onClick={() => {
                const newObj: DrawingObject = {
                  id: `obj-${Date.now()}`,
                  type: 'line',
                  points: [
                    { x: 100, y: 100 },
                    { x: 200, y: 100 },
                  ],
                  stroke: '#1e293b',
                  strokeWidth: 2,
                }
                setObjects((prev) => {
                  const next = [...prev, newObj]
                  handleObjectsChange(next)
                  return next
                })
                setSelectedId(newObj.id)
              }}
              className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition"
              title="Добавить линию"
            >
              ─
            </button>
          </div>

          <CanvasEditor
            objects={objects}
            onObjectsChange={handleObjectsChange}
            selectedId={selectedId}
            onSelect={handleSelect}
            tool={tool}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </div>

        {/*Properties*/}
        <aside className="w-80 border-l border-slate-200">
          <PropertiesPanel
            selected={selected}
            onUpdate={(updates) => {
              handleUpdate(updates)
              handleObjectsChange(objects)
            }}
            onDelete={handleDelete}
          />
        </aside>
      </div>
=======
            canUndo={history.past.length > 0}
            onUndo={handleUndo}
            canRedo={history.future.length > 0}
            onRedo={handleRedo}
            showServiceMarks={showServiceMarks}
            onServiceToggle={() => { setShowServiceMarks((value) => !value); setSelectedIds([]); setSelectedVertex(null); setTool('select') }}
          />
        </aside>

      </div>
      {stitchOpen && selected && (
        <PanoramaStitchDialog
          title={selected.label || objectName(selected)}
          onClose={() => setStitchOpen(false)}
          onComplete={async (file) => {
            await handleMarkerPanoramaUpload(file)
            setStitchOpen(false)
          }}
        />
      )}
      {viewer && viewerUrl && (
        <PanoramaViewer
          key={viewerUrl}
          imageUrl={viewerUrl}
          title={viewer.title}
          projectId={projectId}
          pointId={viewer.id}
          panoramas={navigationPanoramas.map((object) => ({ id: object.id, title: object.label || objectName(object) }))}
          onSelectPanorama={(id) => {
            const object = navigationPanoramas.find((item) => item.id === id)
            if (object) openMarkerPanorama(object)
          }}
          onClose={() => setViewer(null)}
        />
      )}
>>>>>>> Stashed changes
    </div>
  )
}
