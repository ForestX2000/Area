<<<<<<< Updated upstream

import { useCallback, useMemo, useRef, useState } from 'react'
import type { DrawingObject, DrawingTool, Point } from '../../types/drawing'
=======
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { DrawingObject, DrawingTool, Point } from '../../types/drawing'
import { addVertex, canAddVertex, createDrawing, drawingPoints, hitObject, intersectsSelection, MAX_ZOOM, MIN_ZOOM, moveVertex, objectBounds, objectLocalBounds, objectsBounds, PIXELS_PER_METRE, resizeDrawing, resizeHandles, rotateDrawing, vertices } from './drawingGeometry'
import DrawingShape from './DrawingShape'
>>>>>>> Stashed changes

interface CanvasEditorProps {
  objects: DrawingObject[]
  onObjectsChange: (objects: DrawingObject[]) => void
<<<<<<< Updated upstream
  selectedId: string | null
  onSelect: (id: string | null) => void
=======
  selectedIds: string[]
  onSelect: (ids: string[], activateSelectionTool?: boolean) => void
>>>>>>> Stashed changes
  tool: DrawingTool
  gridSize: number
  snapToGrid: boolean
  zoom: number
  onZoomChange: (zoom: number) => void
<<<<<<< Updated upstream
}

const GRID_COLOR = '#e2e8f0'
const DIMENSION_COLOR = '#059669'

function dist(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

export default function CanvasEditor({
  objects,
  onObjectsChange,
  selectedId,
  onSelect,
  tool,
  gridSize,
  snapToGrid,
  zoom,
  onZoomChange,
}: CanvasEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 })
  const [currentPoint, setCurrentPoint] = useState<Point>({ x: 0, y: 0 })
  const [nextId, setNextId] = useState(objects.length)

  const svgPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current
      if (!svg) return { x: clientX, y: clientY }
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const screenCTM = svg.getScreenCTM()
      if (!screenCTM) return { x: clientX, y: clientY }
      const transformed = pt.matrixTransform(screenCTM.inverse())
      return { x: transformed.x, y: transformed.y }
    },
    []
  )

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (tool === 'select') {
        const pt = svgPoint(event.clientX, event.clientY)
        const clicked = findObjectAt(objects, pt, gridSize, snapToGrid)
        onSelect(clicked ? clicked.id : null)
        setIsDrawing(false)
        return
      }

      const pt = applySnap(svgPoint(event.clientX, event.clientY), gridSize, snapToGrid)
      setStartPoint(pt)
      setCurrentPoint(pt)
      setIsDrawing(true)
    },
    [tool, objects, gridSize, snapToGrid, onSelect, svgPoint]
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing) return
      const pt = applySnap(svgPoint(event.clientX, event.clientY), gridSize, snapToGrid)
      setCurrentPoint(pt)
    },
    [isDrawing, svgPoint, gridSize, snapToGrid]
  )

  const handleMouseUp = useCallback(
    (_event: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing) return
      const end = applySnap(svgPoint(currentPoint.x, currentPoint.y), gridSize, snapToGrid)

      let newObject: DrawingObject | null = null
      const newId = `obj-${nextId}`

      if (tool === 'line') {
        newObject = {
          id: newId,
          type: 'line',
          points: [startPoint, end],
          stroke: '#1e293b',
          strokeWidth: 2,
        }
      } else if (tool === 'rectangle') {
        const x = Math.min(startPoint.x, end.x)
        const y = Math.min(startPoint.y, end.y)
        newObject = {
          id: newId,
          type: 'rectangle',
          points: [{ x, y }, { x: x + Math.abs(end.x - startPoint.x), y: y + Math.abs(end.y - startPoint.y) }],
          stroke: '#1e293b',
          strokeWidth: 2,
          fill: 'rgba(37, 99, 235, 0.05)',
        }
      } else if (tool === 'square') {
        const size = Math.min(Math.abs(end.x - startPoint.x), Math.abs(end.y - startPoint.y))
        const dx = end.x >= startPoint.x ? size : -size
        const dy = end.y >= startPoint.y ? size : -size
        newObject = {
          id: newId,
          type: 'rectangle',
          points: [startPoint, { x: startPoint.x + dx, y: startPoint.y + dy }],
          stroke: '#1e293b',
          strokeWidth: 2,
          fill: 'rgba(37, 99, 235, 0.05)',
          width: size,
          height: size,
          isSquare: true,
        }
      }

      if (newObject) {
        onObjectsChange([...objects, newObject])
        setNextId(nextId + 1)
        onSelect(newObject.id)
      }

      setIsDrawing(false)
    },
    [tool, startPoint, currentPoint, objects, nextId, onObjectsChange, onSelect, gridSize, snapToGrid]
  )

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault()
      const delta = -event.deltaY * 0.001
      const newZoom = Math.min(4, Math.max(0.25, zoom + delta))
      onZoomChange(newZoom)
    },
    [onZoomChange, zoom]
  )

  const previewObject = useMemo(() => {
    if (!isDrawing || tool === 'select') return null

    const newId = `obj-preview-${nextId}`

    if (tool === 'line') {
      return {
        id: newId,
        type: 'line',
        points: [startPoint, currentPoint],
        stroke: '#94a3b8',
        strokeWidth: 2,
        strokeDasharray: '4',
      } as DrawingObject
    }

    const x = Math.min(startPoint.x, currentPoint.x)
    const y = Math.min(startPoint.y, currentPoint.y)
    const w = Math.abs(currentPoint.x - startPoint.x)
    const h = Math.abs(currentPoint.y - startPoint.y)

    return {
      id: newId,
      type: 'rectangle',
      points: [{ x, y }, { x: x + w, y: y + h }],
      stroke: '#94a3b8',
      strokeWidth: 2,
      fill: 'rgba(148, 163, 184, 0.1)',
      strokeDasharray: '4',
    } as DrawingObject
  }, [isDrawing, tool, startPoint, currentPoint, nextId])

  const dimensionText = useMemo(() => {
    if (!isDrawing || tool === 'select') return ''
    const d = dist(startPoint, currentPoint)
    return `${(d / 100).toFixed(2)} м`
  }, [isDrawing, tool, startPoint, currentPoint])

  return (
    <div
      className="relative w-full h-full bg-slate-50 overflow-hidden"
      onWheel={handleWheel as unknown as React.WheelEventHandler<HTMLDivElement>}
    >
      <svg
        ref={svgRef}
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <defs>
          <pattern
            id="grid"
            width={gridSize * zoom}
            height={gridSize * zoom}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 0 0 L 0 0"
              stroke={GRID_COLOR}
              strokeWidth="0.5"
            />
            <path
              d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`}
              stroke={GRID_COLOR}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {objects.map((obj) => {
          const isSelected = obj.id === selectedId
          if (obj.type === 'line') {
            return (
              <line
                key={obj.id}
                x1={obj.points[0].x}
                y1={obj.points[0].y}
                x2={obj.points[1].x}
                y2={obj.points[1].y}
                stroke={obj.stroke ?? '#1e293b'}
                strokeWidth={obj.strokeWidth ?? 2}
                className={isSelected ? 'cursor-move' : ''}
              />
            )
          }
          if (obj.type === 'rectangle') {
            const x = Math.min(obj.points[0].x, obj.points[1].x)
            const y = Math.min(obj.points[0].y, obj.points[1].y)
            const w = Math.abs(obj.points[1].x - obj.points[0].x)
            const h = Math.abs(obj.points[1].y - obj.points[0].y)
            return (
              <rect
                key={obj.id}
                x={x}
                y={y}
                width={w}
                height={h}
                stroke={obj.stroke ?? '#1e293b'}
                strokeWidth={obj.strokeWidth ?? 2}
                fill={obj.fill ?? 'transparent'}
                className={isSelected ? 'cursor-move' : ''}
              />
            )
          }
          return null
        })}

        {previewObject && (
          <>
            {previewObject.type === 'line' && (
              <line
                x1={previewObject.points[0].x}
                y1={previewObject.points[0].y}
                x2={previewObject.points[1].x}
                y2={previewObject.points[1].y}
                stroke={previewObject.stroke}
                strokeWidth={previewObject.strokeWidth}
                strokeDasharray={previewObject.strokeDasharray}
              />
            )}
            {previewObject.type === 'rectangle' && (
              <rect
                x={previewObject.points[0].x}
                y={previewObject.points[0].y}
                width={Math.abs(previewObject.points[1].x - previewObject.points[0].x)}
                height={Math.abs(previewObject.points[1].y - previewObject.points[0].y)}
                stroke={previewObject.stroke}
                strokeWidth={previewObject.strokeWidth}
                fill={previewObject.fill}
                strokeDasharray={previewObject.strokeDasharray}
              />
            )}
          </>
        )}

        {isDrawing && dimensionText && tool !== 'select' && (
          <text
            x={(startPoint.x + currentPoint.x) / 2}
            y={(startPoint.y + currentPoint.y) / 2 - 10}
            fill={DIMENSION_COLOR}
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            pointerEvents="none"
          >
            {dimensionText}
          </text>
        )}
      </svg>

      {isDrawing && dimensionText && tool !== 'select' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm text-sm font-medium text-slate-700">
          {dimensionText}
        </div>
      )}
    </div>
  )
}

function applySnap(pt: Point, gridSize: number, snapToGrid: boolean): Point {
  if (!snapToGrid) return pt
  return {
    x: Math.round(pt.x / gridSize) * gridSize,
    y: Math.round(pt.y / gridSize) * gridSize,
  }
}

function findObjectAt(
  objects: DrawingObject[],
  pt: Point,
  gridSize: number,
  snapToGrid: boolean
): DrawingObject | null {
  const threshold = snapToGrid ? gridSize / 2 : 10
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i]
    if (obj.type === 'line') {
      const [p1, p2] = obj.points
      if (pointToLineDistance(pt, p1, p2) < threshold) return obj
    }
    if (obj.type === 'rectangle') {
      const first = obj.points[0]
      const second = obj.points[1]
      const x = Math.min(first.x, second.x)
      const y = Math.min(first.y, second.y)
      const w = Math.abs(second.x - first.x)
      const h = Math.abs(second.y - first.y)
      if (
        pt.x >= x - threshold &&
        pt.x <= x + w + threshold &&
        pt.y >= y - threshold &&
        pt.y <= y + h + threshold
      ) {
        return obj
      }
    }
  }
  return null
}

function pointToLineDistance(p: Point, l1: Point, l2: Point): number {
  const A = p.x - l1.x
  const B = p.y - l1.y
  const C = l2.x - l1.x
  const D = l2.y - l1.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  if (lenSq !== 0) param = dot / lenSq

  let xx: number, yy: number
  if (param < 0) {
    xx = l1.x
    yy = l1.y
  } else if (param > 1) {
    xx = l2.x
    yy = l2.y
  } else {
    xx = l1.x + param * C
    yy = l1.y + param * D
  }

  const dx = p.x - xx
  const dy = p.y - yy
  return Math.sqrt(dx * dx + dy * dy)
}
=======
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
  | { kind: 'rotate'; pointerId: number; start: Point; originals: DrawingObject[]; frame: RotationFrame }
  | { kind: 'marquee'; pointerId: number; start: Point; previousSelection: string[] }

interface RotationFrame {
  box: ReturnType<typeof objectBounds>
  center: Point
  rotation: number
}

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
  const [rotationPreview, setRotationPreview] = useState<RotationFrame | null>(null)
  const [polygon, setPolygon] = useState<{ tool: DrawingTool; points: Point[]; cursor: Point | null }>(() => ({ tool, points: [], cursor: null }))
  if (polygon.tool !== tool) setPolygon({ tool, points: [], cursor: null })
  const polygonPoints = polygon.tool === tool && tool === 'polygon' ? polygon.points : []
  const polygonEdges = polygonPoints.slice(1).map((end, index) => ({ start: polygonPoints[index], end, current: false }))
  const polygonEnd = polygonPoints.at(-1)
  if (polygonEnd && polygon.cursor && Math.hypot(polygon.cursor.x - polygonEnd.x, polygon.cursor.y - polygonEnd.y) > 0.01) {
    polygonEdges.push({ start: polygonEnd, end: polygon.cursor, current: true })
  }
  const patternId = useId().replace(/:/g, '')
  const cellSize = Math.max(0.1, gridSize) * PIXELS_PER_METRE
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const draftsById = new Map(drafts.map((draft) => [draft.id, draft]))
  const visibleObjects = objects.filter((object) => object.markerKind !== 'service' || showServiceMarks)
  const selectedObjects = visibleObjects.filter((object) => selectedIds.includes(object.id)).map((object) => draftsById.get(object.id) ?? object)
  const selectionBounds = selectedObjects.length === 1 ? objectLocalBounds(selectedObjects[0]) : objectsBounds(selectedObjects)
  const rotationFrame = rotationPreview ?? {
    box: selectionBounds,
    center: { x: (selectionBounds.left + selectionBounds.right) / 2, y: (selectionBounds.top + selectionBounds.bottom) / 2 },
    rotation: selectedObjects.length === 1 ? selectedObjects[0].rotation ?? 0 : 0,
  }

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

  function finishPolygon() {
    if (polygonPoints.length < 3) return
    const [origin, second] = polygonPoints
    const nonCollinear = polygonPoints.some((point) => Math.abs((second.x - origin.x) * (point.y - origin.y) - (second.y - origin.y) * (point.x - origin.x)) > 0.01)
    if (!nonCollinear) return
    const created: DrawingObject = { id: crypto.randomUUID(), type: 'polygon', shapeKind: 'polygon', points: polygonPoints,
      stroke: 'var(--ttk-graphite)', strokeWidth: 2, fill: 'var(--ttk-drawing-fill)' }
    onObjectsChange([...objects, created])
    setPolygon({ tool, points: [], cursor: null })
    onSelect([created.id], true)
    setSnapTarget(null)
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
    if ((event.target as Element).closest('[data-rotation-handle]') && selectedObjects.length > 0) {
      lastClickRef.current = null
      clickCandidateRef.current = null
      onSelect(selectedIds, true)
      gestureRef.current = { kind: 'rotate', pointerId: event.pointerId, start: point, originals: selectedObjects, frame: rotationFrame }
      setRotationPreview(rotationFrame)
      setDrafts(selectedObjects)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (tool === 'polygon') {
      lastClickRef.current = null
      clickCandidateRef.current = null
      const first = polygonPoints[0]
      if (first && Math.hypot(point.x - first.x, point.y - first.y) <= 12 / zoom) {
        finishPolygon()
        return
      }
      const next = resolvePoint(point, event.shiftKey)
      if (polygonPoints.some((vertex) => Math.hypot(vertex.x - next.x, vertex.y - next.y) < 0.01)) return
      setPolygon({ tool, points: [...polygonPoints, next], cursor: next })
      return
    }
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
    if (tool === 'select' && event.shiftKey && !(event.target as Element).closest('[data-resize-handle]')) {
      lastClickRef.current = null
      clickCandidateRef.current = null
      const object = findObject(point)
      if (object) onSelect(selectedIds.includes(object.id) ? selectedIds.filter((id) => id !== object.id) : [...selectedIds, object.id])
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
    if (gesture.kind === 'rotate') {
      const { center } = gesture.frame
      if (Math.hypot(raw.x - center.x, raw.y - center.y) < 2 / zoom) return drafts
      const angle = (Math.atan2(raw.y - center.y, raw.x - center.x) - Math.atan2(gesture.start.y - center.y, gesture.start.x - center.x)) * 180 / Math.PI
      const delta = event.shiftKey ? Math.round(angle / 15) * 15 : angle
      setRotationPreview({ ...gesture.frame, rotation: gesture.frame.rotation + delta })
      return gesture.originals.map((object) => rotateDrawing(object, center, delta))
    }
    const original = gesture.original
    if (Math.hypot(raw.x - gesture.start.x, raw.y - gesture.start.y) < 2 / zoom) {
      return gesture.kind === 'move' ? gesture.originals : [original]
    }
    if (gesture.kind === 'resize') {
      return [resizeDrawing(original, gesture.handle, resolvePoint(raw, event.shiftKey, [original.id]))]
    }
    if (gesture.kind === 'vertex') return [moveVertex(original, gesture.handle, resolvePoint(raw, event.shiftKey, [original.id]))]
    const anchor = drawingPoints(original)[0]
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
    if (tool === 'polygon' && polygonPoints.length > 0) {
      const cursor = resolvePoint(svgPoint(event), event.shiftKey)
      setPolygon({ tool, points: polygonPoints, cursor })
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
    setRotationPreview(null)
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
      if (gesture.kind === 'move' || gesture.kind === 'rotate' || ((gesture.kind === 'resize' || gesture.kind === 'vertex') && valid)) {
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
    const [a, b] = drawingPoints(object)
    const selected = selectedIds.includes(object.id) && !preview
    const showHandles = selected && selectedIds.length === 1 && tool !== 'vertices'
    const editingVertices = selected && tool === 'vertices'
    const box = objectBounds(object)
    const local = objectLocalBounds(object)
    const width = local.width
    const height = local.height
    const label = ['rectangle', 'ellipse', 'polygon'].includes(object.type) ? `${formatMetres(width)} × ${formatMetres(height)} м`
      : `${formatMetres(Math.hypot(width, height))} м`
    const freeformPolygon = object.type === 'polygon' && (!object.shapeKind || object.shapeKind === 'polygon')
    return (
      <g key={object.id} data-object-id={preview ? undefined : object.id} data-object-type={object.type}
        data-rotation={object.rotation ?? 0}
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
        {(selected || preview || object.type === 'dimension' || object.label) && (!freeformPolygon || object.label) && (
          <text x={(box.left + box.right) / 2} y={box.top - 10 / zoom} fontSize={12 / zoom}
            fill="var(--ttk-body)" textAnchor="middle" pointerEvents="none">
            {object.type === 'marker' || freeformPolygon ? object.label : <>{object.label ? `${object.label} · ` : ''}{label}</>}
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
        onContextMenu={(event) => {
          const gesture = gestureRef.current
          const drawingRuler = gesture?.kind === 'draw' && gesture.tool === 'dimension'
          const targetId = (event.target as Element).closest('[data-object-id]')?.getAttribute('data-object-id')
          const ruler = !gesture && tool !== 'polygon' ? visibleObjects.find((object) =>
            object.type === 'dimension' && object.id === (targetId ?? (tool === 'dimension' ? selectedId : null))) : undefined
          if (tool !== 'polygon' && !drawingRuler && !ruler) return
          event.preventDefault()
          clearGesture(true)
          if (tool === 'polygon') setPolygon({ tool, points: [], cursor: null })
          if (ruler) {
            onObjectsChange(objects.filter((object) => object.id !== ruler.id))
            onSelect(selectedIds.filter((id) => id !== ruler.id))
          }
          lastClickRef.current = null
          if (gesture && event.currentTarget.hasPointerCapture(gesture.pointerId)) event.currentTarget.releasePointerCapture(gesture.pointerId)
        }}
        onDoubleClick={(event) => {
          if (tool === 'polygon' || (tool === 'select' && event.shiftKey) || (event.target as Element).closest('[data-rotation-handle]')) return
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
          const command = (event.ctrlKey || event.metaKey) && !event.altKey
          if (command && (event.code === 'KeyA' || event.key.toLowerCase() === 'a')) {
            const gesture = gestureRef.current
            clearGesture(true)
            setPolygon({ tool, points: [], cursor: null })
            if (gesture && event.currentTarget.hasPointerCapture(gesture.pointerId)) event.currentTarget.releasePointerCapture(gesture.pointerId)
            return
          }
          if (polygonPoints.length > 0 && command && (event.code === 'KeyZ' || event.code === 'KeyY')) {
            event.preventDefault()
            event.stopPropagation()
            if (event.code === 'KeyZ') setPolygon({ tool, points: polygonPoints.slice(0, -1), cursor: polygon.cursor })
            return
          }
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
            setPolygon({ tool, points: [], cursor: null })
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
          {selectedObjects.length > 0 && tool !== 'vertices' && tool !== 'polygon' && !selectionBox && !drafts.some((draft) => draft.id === 'preview') && <g data-rotation-control
            transform={`rotate(${rotationFrame.rotation} ${rotationFrame.center.x} ${rotationFrame.center.y})`}>
            <rect data-rotation-frame x={rotationFrame.box.left} y={rotationFrame.box.top} width={rotationFrame.box.width} height={rotationFrame.box.height}
              fill="none" stroke="var(--ttk-red)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <line x1={rotationFrame.center.x} y1={rotationFrame.box.top} x2={rotationFrame.center.x} y2={rotationFrame.box.top - 24 / zoom}
              stroke="var(--ttk-red)" strokeWidth="1" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <g data-rotation-handle role="button" aria-label={selectedObjects.length > 1 ? 'Повернуть выделенные объекты' : 'Повернуть объект'} tabIndex={0}
              transform={`translate(${rotationFrame.center.x} ${rotationFrame.box.top - 36 / zoom}) scale(${1 / zoom}) rotate(${-rotationFrame.rotation})`}
              style={{ cursor: rotationPreview ? 'grabbing' : 'grab' }}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) return
                event.preventDefault(); event.stopPropagation()
                const delta = (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 15 : 1)
                const rotated = new Map(selectedObjects.map((object) => [object.id, rotateDrawing(object, rotationFrame.center, delta)]))
                onObjectsChange(objects.map((object) => rotated.get(object.id) ?? object))
              }}>
              <title>Перетащите для поворота. Shift — шаг 15°. Стрелки ← / → — поворот с клавиатуры.</title>
              <circle r="12" fill="white" stroke="var(--ttk-red)" strokeWidth="1.5" />
              <path d="M 5 -3 A 6 6 0 1 0 5 4 M 5 -7 V -2 H 0" fill="none" stroke="var(--ttk-red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
            </g>
          </g>}
          {polygonPoints.length > 0 && <g data-polygon-construction>
            <polyline data-polygon-preview points={[...polygonPoints, ...(polygon.cursor ? [polygon.cursor] : [])].map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none" stroke="var(--ttk-red)" strokeWidth="2" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            {polygon.cursor && polygonPoints.length >= 2 && <line x1={polygon.cursor.x} y1={polygon.cursor.y} x2={polygonPoints[0].x} y2={polygonPoints[0].y}
              stroke="var(--ttk-red)" strokeWidth="1" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
            {polygonEdges.map((edge, index) => <text key={index} data-polygon-edge-length={index} data-current-edge={edge.current || undefined}
              x={(edge.start.x + edge.end.x) / 2} y={(edge.start.y + edge.end.y) / 2 - 10 / zoom}
              fontSize={12 / zoom} textAnchor="middle" fill="var(--ttk-body)" stroke="white" strokeWidth={3 / zoom}
              style={{ paintOrder: 'stroke' }} pointerEvents="none">
              {formatMetres(Math.hypot(edge.end.x - edge.start.x, edge.end.y - edge.start.y))} м
            </text>)}
            {polygonPoints.map((point, index) => <circle key={index} data-polygon-point={index}
              cx={point.x} cy={point.y} r={(index === 0 ? 7 : 4) / zoom} fill={index === 0 ? 'var(--ttk-red)' : 'white'}
              stroke="var(--ttk-red)" strokeWidth={1.5 / zoom}
              role={index === 0 && polygonPoints.length >= 3 ? 'button' : undefined}
              aria-label={index === 0 && polygonPoints.length >= 3 ? 'Замкнуть многоугольник' : undefined}
              tabIndex={index === 0 && polygonPoints.length >= 3 ? 0 : undefined}
              onKeyDown={(event) => { if (index === 0 && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); finishPolygon() } }}
              style={{ cursor: index === 0 && polygonPoints.length >= 3 ? 'pointer' : 'crosshair' }} />)}
          </g>}
          {selectionBox && <rect data-selection-box
            x={Math.min(selectionBox.start.x, selectionBox.end.x)} y={Math.min(selectionBox.start.y, selectionBox.end.y)}
            width={Math.abs(selectionBox.end.x - selectionBox.start.x)} height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
            fill="var(--ttk-drawing-fill)" stroke="var(--ttk-red)" strokeWidth="1" strokeDasharray="5 3"
            vectorEffect="non-scaling-stroke" pointerEvents="none" />}
          {snapTarget && <circle cx={snapTarget.x} cy={snapTarget.y} r={7 / zoom}
            fill="var(--ttk-red-hover)" stroke="white" strokeWidth={1.5 / zoom} pointerEvents="none" />}
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 pointer-events-none rounded border border-line bg-surface/90 px-2 py-1 text-xs text-muted">
        {tool === 'polygon' ? `Многоугольник: ${polygonPoints.length} вершин · клик по первой точке — завершить · правая кнопка / Escape — отменить` : `Колесико / два пальца — перемещение · Ctrl + колесо — масштаб · ячейка ${gridSize} м`}
      </div>
    </div>
  )
}
>>>>>>> Stashed changes
