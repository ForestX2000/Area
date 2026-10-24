import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { DrawingObject, DrawingTool, Point } from '../../types/drawing'
import { createDrawing, MAX_ZOOM, MIN_ZOOM, PIXELS_PER_METRE, pointToSegmentDistance, resizeDrawing, resizeHandles } from './drawingGeometry'

interface CanvasEditorProps {
  objects: DrawingObject[]
  onObjectsChange: (objects: DrawingObject[]) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  tool: DrawingTool
  gridSize: number
  snapToGrid: boolean
  zoom: number
  onZoomChange: (zoom: number) => void
}

type Gesture =
  | { kind: 'pan'; pointerId: number; start: Point; pan: Point }
  | { kind: 'draw'; pointerId: number; start: Point; tool: DrawingTool }
  | { kind: 'move'; pointerId: number; start: Point; original: DrawingObject }
  | { kind: 'resize'; pointerId: number; start: Point; original: DrawingObject; handle: number }

const formatMetres = (value: number) => (value / PIXELS_PER_METRE).toFixed(2)

export default function CanvasEditor({ objects, onObjectsChange, selectedId, onSelect,
  tool, gridSize, snapToGrid, zoom, onZoomChange }: CanvasEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const contentRef = useRef<SVGGElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const viewportRef = useRef({ zoom, pan: { x: 0, y: 0 } })
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [draft, setDraft] = useState<DrawingObject | null>(null)
  const [snapTarget, setSnapTarget] = useState<Point | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const patternId = useId().replace(/:/g, '')
  const cellSize = Math.max(0.1, gridSize) * PIXELS_PER_METRE

  useLayoutEffect(() => { viewportRef.current.zoom = zoom }, [zoom])

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

  function resolvePoint(point: Point, shiftKey: boolean, excludedId?: string): Point {
    let nearest: Point | null = null
    let distance = 14 / zoom
    if (shiftKey) {
      for (const object of objects) {
        if (object.id === excludedId) continue
        const [a, b] = object.points
        const corners = object.type === 'rectangle'
          ? [a, b, { x: a.x, y: b.y }, { x: b.x, y: a.y }] : [a, b]
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
    return objects.toReversed().find((object) => {
      const [a, b] = object.points
      if (object.type !== 'rectangle') return pointToSegmentDistance(point, a, b) <= tolerance
      return point.x >= Math.min(a.x, b.x) - tolerance && point.x <= Math.max(a.x, b.x) + tolerance
        && point.y >= Math.min(a.y, b.y) - tolerance && point.y <= Math.max(a.y, b.y) + tolerance
    })
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if ((event.button !== 0 && event.button !== 1) || gestureRef.current) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    if (event.button === 1) {
      gestureRef.current = { kind: 'pan', pointerId: event.pointerId,
        start: svgPoint(event, false), pan: { ...viewportRef.current.pan } }
      setIsPanning(true)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    const point = svgPoint(event)
    const handle = (event.target as Element).closest('[data-resize-handle]')
    const resized = handle ? objects.find((object) => object.id === selectedId) : undefined
    if (resized && handle) {
      gestureRef.current = { kind: 'resize', pointerId: event.pointerId, start: point,
        original: resized, handle: Number(handle.getAttribute('data-resize-handle')) }
      setDraft(resized)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    const original = tool === 'select' ? findObject(point) : undefined
    if (tool === 'select') onSelect(original?.id ?? null)
    if (tool === 'select' && !original) return
    const start = original ? point : resolvePoint(point, event.shiftKey)
    gestureRef.current = original ? { kind: 'move', pointerId: event.pointerId, start, original }
      : { kind: 'draw', pointerId: event.pointerId, start, tool }
    setDraft(original ?? createDrawing(tool, start, start, 'preview'))
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function updateGesture(event: PointerEvent<SVGSVGElement>): DrawingObject | null {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.kind === 'pan') return null
    const raw = svgPoint(event)
    if (gesture.kind === 'draw') {
      const end = resolvePoint(raw, event.shiftKey)
      return createDrawing(gesture.tool, gesture.start, end, 'preview')
    }
    const original = gesture.original
    if (Math.hypot(raw.x - gesture.start.x, raw.y - gesture.start.y) < 2 / zoom) return original
    if (gesture.kind === 'resize') {
      return resizeDrawing(original, gesture.handle, resolvePoint(raw, event.shiftKey, original.id))
    }
    const anchor = original.points[0]
    const target = resolvePoint({ x: anchor.x + raw.x - gesture.start.x,
      y: anchor.y + raw.y - gesture.start.y }, event.shiftKey, original.id)
    return { ...original, points: original.points.map((point) => ({
      x: point.x + target.x - anchor.x, y: point.y + target.y - anchor.y,
    })) }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const gesture = gestureRef.current
    if (gesture?.kind === 'pan' && gesture.pointerId === event.pointerId) {
      const point = svgPoint(event, false)
      const nextPan = { x: gesture.pan.x + point.x - gesture.start.x, y: gesture.pan.y + point.y - gesture.start.y }
      viewportRef.current = { ...viewportRef.current, pan: nextPan }
      setPan(nextPan)
      return
    }
    const next = updateGesture(event)
    if (next) setDraft(next)
  }

  function clearGesture() {
    gestureRef.current = null
    setDraft(null)
    setSnapTarget(null)
    setIsPanning(false)
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const next = updateGesture(event)
    if (next) {
      const [a, b] = next.points
      const valid = next.type === 'rectangle' ? Math.abs(a.x - b.x) > 0.01 && Math.abs(a.y - b.y) > 0.01
        : Math.hypot(a.x - b.x, a.y - b.y) > 0.01
      if (gesture.kind === 'move' || (gesture.kind === 'resize' && valid)) {
        onObjectsChange(objects.map((object) => object.id === next.id ? next : object))
      } else if (gesture.kind === 'draw' && valid) {
        next.id = crypto.randomUUID()
        onObjectsChange([...objects, next])
        onSelect(next.id)
      }
    }
    clearGesture()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function renderObject(object: DrawingObject, preview = false) {
    const [a, b] = object.points
    const selected = object.id === selectedId && !preview
    const width = Math.abs(b.x - a.x)
    const height = Math.abs(b.y - a.y)
    const label = object.type === 'rectangle' ? `${formatMetres(width)} × ${formatMetres(height)} м`
      : `${formatMetres(Math.hypot(width, height))} м`
    return (
      <g key={object.id} data-object-id={preview ? undefined : object.id} data-object-type={object.type}
        data-preview={preview || undefined} pointerEvents={preview ? 'none' : undefined}>
        {object.type === 'rectangle' ? (
          <rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={width} height={height}
            fill={object.fill ?? 'transparent'} stroke={selected ? 'var(--ttk-red)' : object.stroke ?? 'var(--ttk-graphite)'}
            strokeWidth={object.strokeWidth ?? 2} strokeDasharray={preview ? '4 4' : object.strokeDasharray}
            vectorEffect="non-scaling-stroke" />
        ) : (
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={selected ? 'var(--ttk-red)' : object.stroke ?? 'var(--ttk-graphite)'} strokeWidth={object.strokeWidth ?? 2}
            strokeDasharray={preview ? '4 4' : object.strokeDasharray} vectorEffect="non-scaling-stroke" />
        )}
        {(selected || object.type === 'dimension') && (selected ? resizeHandles(object) : [a, b]).map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={(selected ? 6 : 4) / zoom}
            data-resize-handle={selected ? index : undefined}
            style={selected ? { cursor: object.type !== 'rectangle' ? 'move' : index % 2 === 0 ? 'nwse-resize' : 'nesw-resize' } : undefined}
            fill={selected ? 'var(--ttk-red)' : 'var(--ttk-body)'} stroke="white" strokeWidth={1 / zoom} />
        ))}
        {(selected || preview || object.type === 'dimension' || object.label) && (
          <text x={(a.x + b.x) / 2} y={Math.min(a.y, b.y) - 10 / zoom} fontSize={12 / zoom}
            fill="var(--ttk-body)" textAnchor="middle" pointerEvents="none">
            {object.label ? `${object.label} · ` : ''}{label}
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
            clearGesture()
            if (gesture && event.currentTarget.hasPointerCapture(gesture.pointerId)) event.currentTarget.releasePointerCapture(gesture.pointerId)
          }
        }}
        onPointerCancel={clearGesture} onLostPointerCapture={clearGesture}>
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
          {objects.map((object) => renderObject(draft?.id === object.id ? draft : object))}
          {draft?.id === 'preview' && renderObject(draft, true)}
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
