import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { DrawingObject, DrawingTool, Point } from '../../types/drawing'
import { addVertex, canAddVertex, createDrawing, hitObject, intersectsSelection, MAX_ZOOM, MIN_ZOOM, moveVertex, objectBounds, PIXELS_PER_METRE, resizeDrawing, resizeHandles, vertices } from './drawingGeometry'
import DrawingShape from './DrawingShape'

interface CanvasEditorProps {
  objects: DrawingObject[]
  onObjectsChange: (objects: DrawingObject[]) => void
  selectedIds: string[]
  onSelect: (ids: string[], activateSelectionTool?: boolean) => void
  tool: DrawingTool
  gridSize: number
  snapToGrid: boolean
  zoom: number
  onZoomChange: (zoom: number) => void
  selectedVertex?: number | null
  onVertexSelect?: (index: number | null) => void
  showServiceMarks?: boolean
  onActivateMarker?: (object: DrawingObject) => void
}

type Gesture =
  | { kind: 'pan'; pointerId: number; start: Point; pan: Point }
  | { kind: 'draw'; pointerId: number; start: Point; tool: DrawingTool }
  | { kind: 'move'; pointerId: number; start: Point; original: DrawingObject; originals: DrawingObject[] }
  | { kind: 'resize'; pointerId: number; start: Point; original: DrawingObject; handle: number }
  | { kind: 'vertex'; pointerId: number; start: Point; original: DrawingObject; handle: number }
  | { kind: 'marquee'; pointerId: number; start: Point; previousSelection: string[] }

interface ClickPoint {
  x: number
  y: number
  time: number
  selection: string[]
}

const formatMetres = (value: number) => (value / PIXELS_PER_METRE).toFixed(2)

export default function CanvasEditor({ objects, onObjectsChange, selectedIds, onSelect,
  tool, gridSize, snapToGrid, zoom, onZoomChange, selectedVertex, onVertexSelect, showServiceMarks = false, onActivateMarker }: CanvasEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const contentRef = useRef<SVGGElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const lastClickRef = useRef<ClickPoint | null>(null)
  const clickCandidateRef = useRef<(ClickPoint & { pointerId: number }) | null>(null)
  const viewportRef = useRef({ zoom, pan: { x: 0, y: 0 } })
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [drafts, setDrafts] = useState<DrawingObject[]>([])
  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null)
  const [snapTarget, setSnapTarget] = useState<Point | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const patternId = useId().replace(/:/g, '')
  const cellSize = Math.max(0.1, gridSize) * PIXELS_PER_METRE
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const draftsById = new Map(drafts.map((draft) => [draft.id, draft]))
  const visibleObjects = objects.filter((object) => object.markerKind !== 'service' || showServiceMarks)

  useLayoutEffect(() => { viewportRef.current.zoom = zoom }, [zoom])
  useEffect(() => { lastClickRef.current = null }, [tool])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handleWheel = (event: WheelEvent) => {
      // React wheel listeners are passive. Cancel browser zoom with a native listener.
      event.preventDefault()
      event.stopPropagation()
      if (gestureRef.current) return
      const view = viewportRef.current
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1
      if (!event.ctrlKey) {
        const nextPan = { x: view.pan.x - event.deltaX * unit, y: view.pan.y - event.deltaY * unit }
        viewportRef.current = { ...view, pan: nextPan }
        setPan(nextPan)
        return
      }
      const delta = event.deltaY * unit
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * Math.exp(-delta * 0.002)))
      const point = svg.createSVGPoint()
      point.x = event.clientX
      point.y = event.clientY
      const matrix = svg.getScreenCTM()
      if (!matrix) return
      const cursor = point.matrixTransform(matrix.inverse())
      const ratio = nextZoom / view.zoom
      const nextPan = {
        x: cursor.x - (cursor.x - view.pan.x) * ratio,
        y: cursor.y - (cursor.y - view.pan.y) * ratio,
      }
      viewportRef.current = { zoom: nextZoom, pan: nextPan }
      setPan(nextPan)
      onZoomChange(nextZoom)
    }
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [onZoomChange])

  function svgPoint(event: PointerEvent<SVGSVGElement>, world = true): Point {
    const svg = svgRef.current
    const matrix = (world ? contentRef.current : svg)?.getScreenCTM()
    if (!svg || !matrix) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const result = point.matrixTransform(matrix.inverse())
    return { x: result.x, y: result.y }
  }

  function resolvePoint(point: Point, shiftKey: boolean, excludedIds: string[] = []): Point {
    let nearest: Point | null = null
    let distance = 14 / zoom
    if (shiftKey) {
      for (const object of visibleObjects) {
        if (excludedIds.includes(object.id)) continue
        const corners = object.type === 'marker' ? object.points : object.type === 'ellipse' ? resizeHandles(object) : vertices(object)
        for (const corner of corners) {
          const d = Math.hypot(corner.x - point.x, corner.y - point.y)
          if (d < distance) { nearest = corner; distance = d }
        }
      }
    }
    setSnapTarget(nearest)
    return nearest ?? (snapToGrid ? {
      x: Math.round(point.x / cellSize) * cellSize,
      y: Math.round(point.y / cellSize) * cellSize,
    } : point)
  }

  function findObject(point: Point) {
    const tolerance = 8 / zoom
    return visibleObjects.toReversed().find((object) => hitObject(object, point, tolerance))
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if ((event.button !== 0 && event.button !== 1) || gestureRef.current) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    if (event.button === 1) {
      lastClickRef.current = null
      clickCandidateRef.current = null
      gestureRef.current = { kind: 'pan', pointerId: event.pointerId,
        start: svgPoint(event, false), pan: { ...viewportRef.current.pan } }
      setIsPanning(true)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    const point = svgPoint(event)
    const vertexHandle = (event.target as Element).closest('[data-vertex-handle]')
    const vertexObject = vertexHandle ? objects.find((object) => object.id === selectedId) : undefined
    if (vertexHandle && vertexObject) {
      const handle = Number(vertexHandle.getAttribute('data-vertex-handle'))
      onVertexSelect?.(handle)
      lastClickRef.current = null
      gestureRef.current = { kind: 'vertex', pointerId: event.pointerId, start: point, original: vertexObject, handle }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    const previousClick = lastClickRef.current
    lastClickRef.current = null
    const doublePress = event.pointerType === 'mouse' && previousClick
      && event.timeStamp - previousClick.time <= 500
      && Math.hypot(event.clientX - previousClick.x, event.clientY - previousClick.y) <= 5
    clickCandidateRef.current = event.pointerType === 'mouse' && !doublePress
      ? { x: event.clientX, y: event.clientY, time: event.timeStamp, selection: selectedIds, pointerId: event.pointerId } : null
    if (doublePress && tool !== 'vertices') {
      gestureRef.current = { kind: 'marquee', pointerId: event.pointerId, start: point, previousSelection: previousClick.selection }
      onSelect(selectedIds, true)
      setSelectionBox({ start: point, end: point })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    const handle = (event.target as Element).closest('[data-resize-handle]')
    const resized = handle ? objects.find((object) => object.id === selectedId) : undefined
    if (resized && handle) {
      gestureRef.current = { kind: 'resize', pointerId: event.pointerId, start: point,
        original: resized, handle: Number(handle.getAttribute('data-resize-handle')) }
      setDrafts([resized])
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (tool === 'vertices') {
      const object = findObject(point)
      onSelect(object ? [object.id] : [])
      onVertexSelect?.(null)
      return
    }
    const original = tool === 'select' ? findObject(point) : undefined
    const moveIds = original && selectedIds.includes(original.id) ? selectedIds : original ? [original.id] : []
    if (tool === 'select') onSelect(moveIds)
    if (tool === 'select' && !original) return
    const start = original ? point : resolvePoint(point, event.shiftKey)
    gestureRef.current = original ? { kind: 'move', pointerId: event.pointerId, start, original,
      originals: objects.filter((object) => moveIds.includes(object.id)) }
      : { kind: 'draw', pointerId: event.pointerId, start, tool }
    setDrafts(original ? objects.filter((object) => moveIds.includes(object.id)) : [createDrawing(tool, start, start, 'preview')])
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function updateGesture(event: PointerEvent<SVGSVGElement>): DrawingObject[] | null {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.kind === 'pan' || gesture.kind === 'marquee') return null
    const raw = svgPoint(event)
    if (gesture.kind === 'draw') {
      const end = resolvePoint(raw, event.shiftKey)
      return [createDrawing(gesture.tool, gesture.start, end, 'preview')]
    }
    const original = gesture.original
    if (Math.hypot(raw.x - gesture.start.x, raw.y - gesture.start.y) < 2 / zoom) {
      return gesture.kind === 'move' ? gesture.originals : [original]
    }
    if (gesture.kind === 'resize') {
      return [resizeDrawing(original, gesture.handle, resolvePoint(raw, event.shiftKey, [original.id]))]
    }
    if (gesture.kind === 'vertex') return [moveVertex(original, gesture.handle, resolvePoint(raw, event.shiftKey, [original.id]))]
    const anchor = original.points[0]
    const target = resolvePoint({ x: anchor.x + raw.x - gesture.start.x,
      y: anchor.y + raw.y - gesture.start.y }, event.shiftKey, gesture.originals.map((object) => object.id))
    return gesture.originals.map((object) => ({ ...object, points: object.points.map((point) => ({
      x: point.x + target.x - anchor.x, y: point.y + target.y - anchor.y,
    })) }))
  }

  function updateMarquee(event: PointerEvent<SVGSVGElement>) {
    const gesture = gestureRef.current
    if (gesture?.kind !== 'marquee' || gesture.pointerId !== event.pointerId) return
    const end = svgPoint(event)
    setSelectionBox({ start: gesture.start, end })
    if (Math.hypot(end.x - gesture.start.x, end.y - gesture.start.y) > 3 / zoom) {
      onSelect(visibleObjects.filter((object) => intersectsSelection(object, gesture.start, end)).map((object) => object.id))
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const candidate = clickCandidateRef.current
    if (candidate && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > 5) clickCandidateRef.current = null
    const gesture = gestureRef.current
    if (gesture?.kind === 'marquee') { updateMarquee(event); return }
    if (gesture?.kind === 'pan' && gesture.pointerId === event.pointerId) {
      const point = svgPoint(event, false)
      const nextPan = { x: gesture.pan.x + point.x - gesture.start.x, y: gesture.pan.y + point.y - gesture.start.y }
      viewportRef.current = { ...viewportRef.current, pan: nextPan }
      setPan(nextPan)
      return
    }
    const next = updateGesture(event)
    if (next) setDrafts(next)
  }

  function clearGesture(cancelled = false) {
    const gesture = gestureRef.current
    if (cancelled && gesture?.kind === 'marquee') onSelect(gesture.previousSelection)
    gestureRef.current = null
    clickCandidateRef.current = null
    setDrafts([])
    setSelectionBox(null)
    setSnapTarget(null)
    setIsPanning(false)
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    const candidate = clickCandidateRef.current
    if (candidate?.pointerId === event.pointerId && event.button === 0
      && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) <= 5) {
      lastClickRef.current = { x: event.clientX, y: event.clientY, time: event.timeStamp, selection: candidate.selection }
    }
    clickCandidateRef.current = null
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.kind === 'marquee') {
      updateMarquee(event)
      const end = svgPoint(event)
      if (Math.hypot(end.x - gesture.start.x, end.y - gesture.start.y) <= 3 / zoom) {
        const object = findObject(end)
        onSelect(object ? [object.id] : [])
      }
    }
    const next = updateGesture(event)
    if (next) {
      const [object] = next
      const box = objectBounds(object)
      const valid = object.type === 'marker' || (['rectangle', 'ellipse', 'polygon'].includes(object.type) ? box.width > 0.01 && box.height > 0.01 : Math.hypot(box.width, box.height) > 0.01)
      if (gesture.kind === 'move' || ((gesture.kind === 'resize' || gesture.kind === 'vertex') && valid)) {
        const replacements = new Map(next.map((object) => [object.id, object]))
        onObjectsChange(objects.map((object) => replacements.get(object.id) ?? object))
      } else if (gesture.kind === 'draw' && valid) {
        const created = { ...object, id: crypto.randomUUID() }
        onObjectsChange([...objects, created])
        onSelect([created.id])
      }
    }
    clearGesture()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function renderObject(object: DrawingObject, preview = false) {
    const [a, b] = object.points
    const selected = selectedIds.includes(object.id) && !preview
    const showHandles = selected && selectedIds.length === 1 && tool !== 'vertices'
    const editingVertices = selected && tool === 'vertices'
    const box = objectBounds(object)
    const width = box.width
    const height = box.height
    const label = ['rectangle', 'ellipse', 'polygon'].includes(object.type) ? `${formatMetres(width)} × ${formatMetres(height)} м`
      : `${formatMetres(Math.hypot(width, height))} м`
    return (
      <g key={object.id} data-object-id={preview ? undefined : object.id} data-object-type={object.type}
        data-preview={preview || undefined} data-selected={selected || undefined} pointerEvents={preview ? 'none' : undefined}>
        <DrawingShape object={object} stroke={selected ? 'var(--ttk-red)' : undefined} preview={preview} />
        {editingVertices && vertices(object).map((point, index) => <circle key={index} data-vertex-handle={index}
          cx={point.x} cy={point.y} r={6 / zoom} fill={selectedVertex === index ? 'var(--ttk-red)' : 'white'}
          stroke="var(--ttk-red)" strokeWidth={2 / zoom} style={{ cursor: 'move' }} />)}
        {(showHandles || (object.type === 'dimension' && !editingVertices)) && (showHandles ? resizeHandles(object) : [a, b]).map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={(showHandles ? 6 : 4) / zoom}
            data-resize-handle={showHandles ? index : undefined}
            style={showHandles ? { cursor: object.type !== 'rectangle' ? 'move' : index % 2 === 0 ? 'nwse-resize' : 'nesw-resize' } : undefined}
            fill={selected ? 'var(--ttk-red)' : 'var(--ttk-body)'} stroke="white" strokeWidth={1 / zoom} />
        ))}
        {(selected || preview || object.type === 'dimension' || object.label) && (
          <text x={(a.x + b.x) / 2} y={Math.min(a.y, b.y) - 10 / zoom} fontSize={12 / zoom}
            fill="var(--ttk-body)" textAnchor="middle" pointerEvents="none">
            {object.type === 'marker' ? object.label : <>{object.label ? `${object.label} · ` : ''}{label}</>}
          </text>
        )}
      </g>
    )
  }

  return (
    <div className="relative w-full h-full bg-surface-muted overflow-hidden">
      <svg ref={svgRef} aria-label="Холст чертежа" role="application" tabIndex={0}
        className={`w-full h-full block touch-none select-none outline-none ${isPanning ? 'cursor-grabbing' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        onDoubleClick={(event) => {
          const point = svgPoint(event as unknown as PointerEvent<SVGSVGElement>)
          const object = objects.find((item) => item.id === selectedId)
          if (tool === 'vertices' && object && canAddVertex(object) && !(event.target as Element).closest('[data-vertex-handle]')) {
            const added = addVertex(object, point)
            onObjectsChange(objects.map((item) => item.id === object.id ? added.object : item))
            onVertexSelect?.(added.index)
          } else if (object?.type === 'marker') onActivateMarker?.(object)
        }}
        onAuxClick={(event) => { if (event.button === 1) event.preventDefault() }}
        onKeyDown={(event) => {
          if (gestureRef.current && (event.ctrlKey || event.metaKey)
            && (event.code === 'KeyY' || event.key.toLowerCase() === 'y')) {
            event.preventDefault()
            event.stopPropagation()
            return
          }
          if (event.key === 'Escape' || (gestureRef.current && (event.ctrlKey || event.metaKey)
            && (event.code === 'KeyZ' || event.key.toLowerCase() === 'z'))) {
            event.preventDefault()
            event.stopPropagation()
            const gesture = gestureRef.current
            clearGesture(true)
            if (gesture && event.currentTarget.hasPointerCapture(gesture.pointerId)) event.currentTarget.releasePointerCapture(gesture.pointerId)
          }
        }}
        onPointerCancel={() => clearGesture(true)} onLostPointerCapture={() => clearGesture(true)}>
        <defs>
          <pattern id={`${patternId}-minor`} width={cellSize * zoom} height={cellSize * zoom}
            x={pan.x} y={pan.y} patternUnits="userSpaceOnUse">
            <path d={`M ${cellSize * zoom} 0 H 0 V ${cellSize * zoom}`} fill="none" stroke="var(--ttk-grid-minor)" strokeWidth="1" />
          </pattern>
          <pattern id={`${patternId}-major`} width={cellSize * zoom * 5} height={cellSize * zoom * 5}
            x={pan.x} y={pan.y} patternUnits="userSpaceOnUse">
            <path d={`M ${cellSize * zoom * 5} 0 H 0 V ${cellSize * zoom * 5}`} fill="none" stroke="var(--ttk-grid-major)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId}-minor)`} />
        <rect width="100%" height="100%" fill={`url(#${patternId}-major)`} />
        <g ref={contentRef} data-canvas-content transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {visibleObjects.map((object) => renderObject(draftsById.get(object.id) ?? object))}
          {drafts.filter((draft) => draft.id === 'preview').map((draft) => renderObject(draft, true))}
          {selectionBox && <rect data-selection-box
            x={Math.min(selectionBox.start.x, selectionBox.end.x)} y={Math.min(selectionBox.start.y, selectionBox.end.y)}
            width={Math.abs(selectionBox.end.x - selectionBox.start.x)} height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
            fill="var(--ttk-drawing-fill)" stroke="var(--ttk-red)" strokeWidth="1" strokeDasharray="5 3"
            vectorEffect="non-scaling-stroke" pointerEvents="none" />}
          {snapTarget && <circle cx={snapTarget.x} cy={snapTarget.y} r={7 / zoom}
            fill="var(--ttk-red-hover)" stroke="white" strokeWidth={1.5 / zoom} pointerEvents="none" />}
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 pointer-events-none rounded border border-line bg-white/90 px-2 py-1 text-xs text-muted">
        Колесико / два пальца — перемещение · Ctrl + колесо — масштаб · ячейка {gridSize} м
      </div>
    </div>
  )
}
