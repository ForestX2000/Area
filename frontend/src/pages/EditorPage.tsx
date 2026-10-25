
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CanvasEditor from '../components/editor/CanvasEditor'
import CanvasContextMenu, { type MenuItem } from '../components/editor/CanvasContextMenu'
import EditorToolbar from '../components/editor/EditorToolbar'
import EditorTutorial from '../components/editor/EditorTutorial'
import { tutorialDone } from '../utils/tutorial'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import EditorNavigation from '../components/editor/EditorNavigation'
import PanoramaViewer from '../components/PanoramaViewer'
import PanoramaStitchDialog from '../components/PanoramaStitchDialog'
import RouteOverlay from '../components/route/RouteOverlay'
import RoutePanel from '../components/route/RoutePanel'
import { addVertex, canAddVertex, canDeleteVertex, createDrawing, deleteVertex, isStairs, objectLocalBounds, objectName, objectsBounds, PIXELS_PER_METRE, rotateDrawing, scaleDrawing } from '../components/editor/drawingGeometry'
import type { DrawingObject, DrawingTool, Point } from '../types/drawing'
import { getProjects } from '../utils/projectStorage'
import { floorStorageId, floorUrl, getFloor, getFloors, saveFloorDrawings } from '../utils/floorStorage'
import { findRoute, type RouteEndpoint } from '../utils/routing'
import { useRouteRequest } from '../utils/routeStore'
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
  const [mobilePanel, setMobilePanel] = useState<'tools' | 'properties' | 'actions' | null>(null)
  const [panMode, setPanMode] = useState(false)
  const [multiSelect, setMultiSelect] = useState(false)
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
  const [menu, setMenu] = useState<{ x: number; y: number; point: Point; objectId?: string } | null>(null)
  const [menuOpens, setMenuOpens] = useState(0)
  const [undoCount, setUndoCount] = useState(0)
  const [tutorialRun, setTutorialRun] = useState(() => tutorialDone() ? 0 : 1)
  const [clipboard, setClipboard] = useState<DrawingObject[]>([])
  const hasClipboard = clipboard.length > 0
  const [route, setRoute] = useRouteRequest(projectId ?? '')

  const project = projectId
    ? getProjects().find((p) => p.id === projectId)
    : undefined
  const floors = project ? getFloors(project).map((floor) => floor.id === floorId ? { ...floor, drawings: objects } : floor) : []

  const selected = objects.find((o) => o.id === selectedId) ?? null
  const navigationPanoramas = objects.filter((object) => object.markerKind === 'navigation' && object.panoramaKey)

  const routeResult = useMemo(() => {
    if (!route.from || !route.to) return null
    const current = getProjects().find((item) => item.id === projectId)
    if (!current) return null
    const live = getFloors(current).map((floor) => floor.id === floorId ? { ...floor, drawings: objects } : floor)
    return findRoute(live, { from: route.from, to: route.to })
  }, [route, objects, floorId, projectId])

  const closeMenu = useCallback(() => setMenu(null), [])
  const goToFloor = useCallback((id: string) => navigate(floorUrl(`/projects/${projectId}/editor`, id, true)), [navigate, projectId])

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
    setUndoCount((count) => count + 1)
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

  const copySelection = useCallback(() => {
    const items = objects.filter((object) => selectedIds.includes(object.id))
    if (items.length) setClipboard(structuredClone(items))
    return items.length > 0
  }, [objects, selectedIds])

  const pasteObjects = useCallback((items: DrawingObject[], at?: Point) => {
    if (!items.length) return
    const box = objectsBounds(items)
    const cell = gridSize * PIXELS_PER_METRE
    const snap = (value: number) => snapToGrid ? Math.round(value / cell) * cell : value
    const offset = at ? { x: snap(at.x - (box.left + box.right) / 2), y: snap(at.y - (box.top + box.bottom) / 2) } : { x: cell, y: cell }
    // Панорама принадлежит исходной метке, копия получает свою позже.
    const pasted = items.map((object) => ({ ...structuredClone(object), id: crypto.randomUUID(), panoramaKey: undefined,
      points: object.points.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y })) }))
    handleObjectsChange([...objects, ...pasted])
    if (!at) setClipboard(pasted)
    setSelectedIds(pasted.map((object) => object.id))
    setSelectedVertex(null)
    setTool('select')
    setPanMode(false)
  }, [objects, gridSize, snapToGrid, handleObjectsChange])

  const reorderSelection = useCallback((front: boolean) => {
    const chosen = objects.filter((object) => selectedIds.includes(object.id))
    const rest = objects.filter((object) => !selectedIds.includes(object.id))
    handleObjectsChange(front ? [...rest, ...chosen] : [...chosen, ...rest])
  }, [objects, selectedIds, handleObjectsChange])

  const rotateSelection = useCallback((degrees: number) => {
    const chosen = objects.filter((object) => selectedIds.includes(object.id))
    if (!chosen.length) return
    const box = chosen.length === 1 ? objectLocalBounds(chosen[0]) : objectsBounds(chosen)
    const center = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
    const rotated = new Map(chosen.map((object) => [object.id, rotateDrawing(object, center, degrees)]))
    handleObjectsChange(objects.map((object) => rotated.get(object.id) ?? object))
  }, [objects, selectedIds, handleObjectsChange])

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
      } else if (event.code === 'KeyC' || event.key.toLowerCase() === 'c') {
        if (copySelection()) event.preventDefault()
      } else if (event.code === 'KeyV' || event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteObjects(clipboard)
      } else if (event.code === 'KeyD' || event.key.toLowerCase() === 'd') {
        event.preventDefault()
        pasteObjects(objects.filter((object) => selectedIds.includes(object.id)))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleDelete, selectedIds, objects, showServiceMarks, copySelection, pasteObjects, clipboard])

  const handleSelect = useCallback((ids: string[], activateSelectionTool = false) => {
    setSelectedIds(ids)
    setPanoramaError('')
    if (activateSelectionTool) setTool('select')
    setSelectedVertex(null)
  }, [])

  function changeTool(next: DrawingTool) {
    setTool(next)
    setPanMode(false)
    setMultiSelect(false)
    setMobilePanel(null)
    if (next === 'marker-service') setShowServiceMarks(true)
    if (next !== 'vertices') setSelectedIds([])
    setSelectedVertex(null)
  }

  const handleUpdate = useCallback(
    (updates: Partial<DrawingObject>) => {
      if (!selectedId) return
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
    if (isStairs(object)) {
      if (object.targetFloorId && floors.some((floor) => floor.id === object.targetFloorId)) goToFloor(object.targetFloorId)
      return
    }
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

  function menuItems(current: NonNullable<typeof menu>): MenuItem[] {
    const target = current.objectId ? objects.find((object) => object.id === current.objectId) : undefined
    const endpoint: RouteEndpoint = target ? { floorId, objectId: target.id } : { floorId, point: current.point }
    const routeItems: MenuItem[] = [
      { label: 'Маршрут отсюда', onSelect: () => setRoute({ ...route, from: endpoint }) },
      { label: 'Маршрут сюда', onSelect: () => setRoute({ ...route, to: endpoint }) },
    ]
    if (!target) return [
      { label: 'Вставить сюда', shortcut: 'Ctrl+V', disabled: !hasClipboard, onSelect: () => pasteObjects(clipboard, current.point) },
      { label: 'Выделить всё', shortcut: 'Ctrl+A', disabled: !objects.length, onSelect: () => { setSelectedIds(objects.filter((object) => object.markerKind !== 'service' || showServiceMarks).map((object) => object.id)); setTool('select') } },
      { label: 'Поставить инфо-метку', onSelect: () => {
        const marker = { ...createDrawing('marker-info', current.point, current.point, ''), id: crypto.randomUUID() }
        handleObjectsChange([...objects, marker]); setSelectedIds([marker.id]); setTool('select')
      } },
      'separator', ...routeItems, 'separator',
      { label: 'Отменить', shortcut: 'Ctrl+Z', disabled: !history.past.length, onSelect: handleUndo },
    ]
    const count = selectedIds.length
    const floorTarget = isStairs(target) && target.targetFloorId ? floors.find((floor) => floor.id === target.targetFloorId) : undefined
    return [
      { label: 'Копировать', shortcut: 'Ctrl+C', onSelect: () => { copySelection() } },
      { label: 'Вставить', shortcut: 'Ctrl+V', disabled: !hasClipboard, onSelect: () => pasteObjects(clipboard) },
      { label: 'Дублировать', shortcut: 'Ctrl+D', onSelect: () => pasteObjects(objects.filter((object) => selectedIds.includes(object.id))) },
      'separator',
      { label: 'На передний план', onSelect: () => reorderSelection(true) },
      { label: 'На задний план', onSelect: () => reorderSelection(false) },
      { label: 'Повернуть на 90°', onSelect: () => rotateSelection(90) },
      ...(count === 1 ? ['separator' as const, ...routeItems] : []),
      ...(floorTarget ? [{ label: `Перейти на этаж ${floorTarget.name}`, onSelect: () => goToFloor(floorTarget.id) }] : []),
      ...(target.markerKind === 'navigation' && target.panoramaKey ? [{ label: 'Открыть панораму', onSelect: () => openMarkerPanorama(target) }] : []),
      'separator',
      { label: count > 1 ? `Удалить (${count})` : 'Удалить', shortcut: 'Delete', danger: true, onSelect: handleDelete },
    ]
  }

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
    <div className="project-editor bg-surface-muted" onKeyDown={(event) => {
      if (event.key === 'Escape' && mobilePanel) { setMobilePanel(null); event.stopPropagation() }
    }}>
      <EditorNavigation projectId={projectId} />
      {tutorialRun > 0 && <EditorTutorial key={tutorialRun} context={{ tool, objects, menuOpens, undoCount }} onClose={() => setTutorialRun(0)} />}
      <div className="editor-workspace relative grid min-h-0 overflow-hidden border border-line lg:h-[calc(100dvh-12rem)] lg:min-h-[38rem] lg:grid-cols-[240px_minmax(0,1fr)_240px] lg:rounded-b-xl">
        <aside id="editor-properties" aria-label="Свойства и объекты" className={`editor-panel editor-properties order-3 overflow-y-auto border-l border-line bg-surface ${mobilePanel === 'properties' ? 'is-open' : ''}`}>
          <div className="editor-panel-heading"><h2>Свойства и объекты</h2><button type="button" aria-label="Закрыть свойства" onClick={() => setMobilePanel(null)}>×</button></div>
          <PropertiesPanel selected={selected} selectionCount={selectedIds.length} onUpdate={handleUpdate} onDelete={handleDelete}
            panoramaError={panoramaError} onOpenPanorama={() => { if (selected) openMarkerPanorama(selected) }}
            onUploadPanorama={handleMarkerPanoramaUpload} onDeletePanorama={handleMarkerPanoramaDelete}
            onStitchPanorama={() => setStitchOpen(true)}
            selectedVertex={selectedVertex} onEditVertices={() => changeTool('vertices')}
            onAddVertex={() => {
              if (!selected || !canAddVertex(selected)) return
              const added = addVertex(selected)
              handleObjectsChange(objects.map((object) => object.id === selected.id ? added.object : object))
              setTool('vertices'); setPanMode(false); setSelectedVertex(added.index); setMobilePanel(null)
            }}
            onDeleteVertex={() => {
              if (!selected || selectedVertex === null || !canDeleteVertex(selected)) return
              handleObjectsChange(objects.map((object) => object.id === selected.id ? deleteVertex(object, selectedVertex) : object))
              setSelectedVertex(null)
            }}
            floors={floors.map((floor) => ({ id: floor.id, name: floor.name }))} currentFloorId={floorId} onGoToFloor={goToFloor} />
          <section aria-label="Список объектов" className="border-t border-line p-3">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Все объекты</h2>
            <ul className="space-y-1">{objects.filter((object) => object.markerKind !== 'service' || showServiceMarks).map((object, index) => <li key={object.id}>
              <button type="button" aria-pressed={selectedIds.includes(object.id)}
                onClick={(event) => {
                  const ids = event.shiftKey || event.ctrlKey || multiSelect ? selectedIds.includes(object.id) ? selectedIds.filter((id) => id !== object.id) : [...selectedIds, object.id] : [object.id]
                  handleSelect(ids); setPanMode(false); if (tool !== 'vertices') setTool('select')
                }} className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs ${selectedIds.includes(object.id) ? 'bg-brand-soft text-brand' : 'hover:bg-surface-muted'}`}>
                {object.label || `${objectName(object)} ${index + 1}`}
              </button>
            </li>)}</ul>
            {objects.length === 0 && <p className="text-xs text-muted">Пока нет объектов</p>}
          </section>
        </aside>
        <div className="editor-canvas relative order-1 min-h-0 min-w-0 lg:order-2 lg:h-full">
          <CanvasEditor objects={objects} onObjectsChange={handleObjectsChange} selectedIds={selectedIds} onSelect={handleSelect}
            tool={tool} gridSize={gridSize} snapToGrid={snapToGrid} zoom={zoom} onZoomChange={setZoom}
            panMode={panMode} multiSelect={multiSelect}
            selectedVertex={selectedVertex} onVertexSelect={setSelectedVertex} showServiceMarks={showServiceMarks}
            onActivateMarker={activateMarker}
            onContextMenu={({ clientX, clientY, point, objectId }) => { setMenu({ x: clientX, y: clientY, point, objectId }); setMenuOpens((count) => count + 1) }}
            overlay={<RouteOverlay result={routeResult} floorId={floorId} zoom={zoom} />} />
          <div aria-label="Быстрые действия" className="editor-quick-actions absolute left-2 right-2 top-2 flex items-start justify-between gap-2 lg:hidden">
            <div className="flex rounded-xl border border-line bg-surface shadow-sm">
              <button type="button" aria-label="Отменить действие" disabled={!history.past.length} onClick={handleUndo}>↶</button>
              <button type="button" aria-label="Вернуть действие" disabled={!history.future.length} onClick={handleRedo}>↷</button>
            </div>
            <div className="flex rounded-xl border border-line bg-surface shadow-sm">
              <button type="button" aria-label="Уменьшить" onClick={() => setZoom((value) => Math.max(0.25, value - 0.25))}>−</button>
              <span className="self-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
              <button type="button" aria-label="Увеличить" onClick={() => setZoom((value) => Math.min(4, value + 0.25))}>+</button>
            </div>
          </div>
        </div>
        <aside id="editor-tools" aria-label="Панель инструментов" className={`editor-panel editor-tools order-2 overflow-y-auto border-r border-line bg-surface lg:order-1 ${mobilePanel === 'tools' ? 'is-open' : ''}`}>
          <div className="editor-panel-heading"><h2>Инструменты и настройки</h2><button type="button" aria-label="Закрыть инструменты" onClick={() => setMobilePanel(null)}>×</button></div>
          <EditorToolbar
            tool={tool}
            onToolChange={changeTool}
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
            onStartTutorial={() => setTutorialRun((run) => run + 1)}
          >
            <RoutePanel floors={floors} request={route} result={routeResult} currentFloorId={floorId} onChange={setRoute} onGoToFloor={goToFloor} />
          </EditorToolbar>
        </aside>
        {mobilePanel === 'actions' && <section id="editor-actions" aria-label="Действия с объектами" className="editor-panel is-open bg-surface lg:hidden">
          <div className="editor-panel-heading"><h2>Действия с объектами</h2><button type="button" aria-label="Закрыть действия" onClick={() => setMobilePanel(null)}>×</button></div>
          <div className="grid grid-cols-2 gap-2 p-3">
            <button type="button" aria-pressed={multiSelect} className="mobile-action" onClick={() => { setMultiSelect((value) => !value); setTool('select'); setPanMode(false); setMobilePanel(null) }}>Выбрать несколько</button>
            <button type="button" className="mobile-action" onClick={() => { handleSelect(objects.filter((object) => object.markerKind !== 'service' || showServiceMarks).map((object) => object.id), true); setPanMode(false); setMobilePanel(null) }}>Выделить всё</button>
            <button type="button" className="mobile-action" disabled={!selectedIds.length} onClick={() => { copySelection(); setMobilePanel(null) }}>Копировать</button>
            <button type="button" className="mobile-action" disabled={!hasClipboard} onClick={() => { pasteObjects(clipboard); setMobilePanel(null) }}>Вставить</button>
            <button type="button" className="mobile-action" disabled={!selectedIds.length} onClick={() => { pasteObjects(objects.filter((object) => selectedIds.includes(object.id))); setMobilePanel(null) }}>Дублировать</button>
            <button type="button" className="mobile-action" disabled={!selectedIds.length} onClick={() => { rotateSelection(90); setMobilePanel(null) }}>Повернуть на 90°</button>
            <button type="button" className="mobile-action" disabled={!selectedIds.length} onClick={() => reorderSelection(true)}>На передний план</button>
            <button type="button" className="mobile-action" disabled={!selectedIds.length} onClick={() => reorderSelection(false)}>На задний план</button>
            {selected && <>
              <button type="button" className="mobile-action" onClick={() => { setRoute({ ...route, from: { floorId, objectId: selected.id } }); setMobilePanel(null) }}>Маршрут отсюда</button>
              <button type="button" className="mobile-action" onClick={() => { setRoute({ ...route, to: { floorId, objectId: selected.id } }); setMobilePanel(null) }}>Маршрут сюда</button>
              {selected.markerKind === 'navigation' && (selected.panoramaKey || selected.targetProjectId) && <button type="button" className="mobile-action" onClick={() => { activateMarker(selected); setMobilePanel(null) }}>{selected.panoramaKey ? 'Открыть панораму' : 'Открыть связанную карту'}</button>}
            </>}
            <button type="button" className="mobile-action text-brand" disabled={!selectedIds.length} onClick={() => { handleDelete(); setMobilePanel(null) }}>Удалить выбранное</button>
          </div>
        </section>}
      </div>
      <nav aria-label="Управление чертежом" className="editor-mobile-bar grid grid-cols-5 border-t border-line bg-surface lg:hidden">
        <button type="button" aria-label="Выделение на холсте" aria-pressed={!panMode && tool === 'select'} onClick={() => changeTool('select')}><span aria-hidden="true">↖</span><span>Выбрать</span></button>
        <button type="button" aria-label="Перемещение холста" aria-pressed={panMode} onClick={() => { setPanMode((value) => !value); setMobilePanel(null) }}><span aria-hidden="true">✥</span><span>Двигать</span></button>
        <button type="button" aria-label="Открыть инструменты" aria-expanded={mobilePanel === 'tools'} aria-controls="editor-tools" onClick={() => setMobilePanel((panel) => panel === 'tools' ? null : 'tools')}><span aria-hidden="true">＋</span><span>Инструменты</span></button>
        <button type="button" aria-label="Открыть свойства" aria-expanded={mobilePanel === 'properties'} aria-controls="editor-properties" onClick={() => setMobilePanel((panel) => panel === 'properties' ? null : 'properties')}><span aria-hidden="true">☷{selectedIds.length > 0 && <small className="ml-1 text-xs">{selectedIds.length}</small>}</span><span>Свойства</span></button>
        <button type="button" aria-label="Открыть действия" aria-expanded={mobilePanel === 'actions'} aria-controls={mobilePanel === 'actions' ? 'editor-actions' : undefined} onClick={() => { setMobilePanel((panel) => panel === 'actions' ? null : 'actions'); setMenuOpens((count) => count + 1) }}><span aria-hidden="true">⋯</span><span>Действия</span></button>
      </nav>
      {menu && <CanvasContextMenu x={menu.x} y={menu.y} items={menuItems(menu)} onClose={closeMenu} />}
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
          editable
        />
      )}
    </div>
  )
}
