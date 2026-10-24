
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DrawingObject, DrawingTool, Point } from '../../types/drawing'

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

const GRID_COLOR = '#94a3b8'
const DIMENSION_COLOR = '#059669'
const SNAP_COLOR = '#e11d48'
const SELECT_COLOR = '#2563eb'

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
  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 })
  const [currentPoint, setCurrentPoint] = useState<Point>({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const [nextId, setNextId] = useState(objects.length)
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [snapTarget, setSnapTarget] = useState<Point | null>(null)

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') setIsCtrlPressed(true)
      if (event.key === 'Shift') setIsShiftPressed(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') setIsCtrlPressed(false)
      if (event.key === 'Shift') setIsShiftPressed(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const snapPoints = useMemo(() => {
    const points: Point[] = []
    for (const obj of objects) {
      if (obj.type === 'line') {
        points.push(obj.points[0], obj.points[1])
      }
      if (obj.type === 'rectangle') {
        const x1 = Math.min(obj.points[0].x, obj.points[1].x)
        const y1 = Math.min(obj.points[0].y, obj.points[1].y)
        const x2 = Math.max(obj.points[0].x, obj.points[1].x)
        const y2 = Math.max(obj.points[0].y, obj.points[1].y)
        points.push(
          { x: x1, y: y1 },
          { x: x2, y: y1 },
          { x: x1, y: y2 },
          { x: x2, y: y2 }
        )
      }
    }
    return points
  }, [objects])

  const snapRadiusSvg = 14 / zoom

  const findSnapPoint = useCallback(
    (pt: Point): Point | null => {
      if (!isShiftPressed) return null
      let nearest: Point | null = null
      let minDist = snapRadiusSvg
      for (const sp of snapPoints) {
        const d = dist(pt, sp)
        if (d < minDist) {
          minDist = d
          nearest = sp
        }
      }
      return nearest
    },
    [isShiftPressed, snapPoints, snapRadiusSvg]
  )

  const applyGridSnap = useCallback(
    (pt: Point): Point => {
      if (!snapToGrid) return pt
      return {
        x: Math.round(pt.x / gridSize) * gridSize,
        y: Math.round(pt.y / gridSize) * gridSize,
      }
    },
    [gridSize, snapToGrid]
  )

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      // Перетаскивание выделенного объекта
      if (tool === 'select' && selectedId) {
        const pt = svgPoint(event.clientX, event.clientY)
        const obj = objects.find((o) => o.id === selectedId)
        if (obj) {
          const x = Math.min(obj.points[0].x, obj.points[1].x)
          const y = Math.min(obj.points[0].y, obj.points[1].y)
          const w = Math.abs(obj.points[1].x - obj.points[0].x)
          const h = Math.abs(obj.points[1].y - obj.points[0].y)
          if (
            pt.x >= x - 10 &&
            pt.x <= x + w + 10 &&
            pt.y >= y - 10 &&
            pt.y <= y + h + 10
          ) {
            setDragOffset({ x: pt.x - x, y: pt.y - y })
            setIsDragging(true)
            setIsDrawing(false)
            return
          }
        }
      }

      if (tool === 'select') {
        const pt = svgPoint(event.clientX, event.clientY)
        const clicked = findObjectAt(objects, pt, gridSize, snapToGrid)
        onSelect(clicked ? clicked.id : null)
        setIsDrawing(false)
        setIsDragging(false)
        setSnapTarget(null)
        return
      }

      // Рисование нового объекта
      const rawPt = svgPoint(event.clientX, event.clientY)
      const snapped = findSnapPoint(rawPt)
      const pt = snapped ?? applyGridSnap(rawPt)
      setSnapTarget(snapped)
      setStartPoint(pt)
      setCurrentPoint(pt)
      setIsDrawing(true)
      setIsDragging(false)
    },
    [tool, selectedId, objects, onSelect, svgPoint, findSnapPoint, findObjectAt, applyGridSnap, gridSize, snapToGrid]
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (isDragging && selectedId) {
        const pt = svgPoint(event.clientX, event.clientY)
        const snapped = findSnapPoint(pt)
        const finalPt = snapped ?? applyGridSnap(pt)
        setSnapTarget(snapped)

        const obj = objects.find((o) => o.id === selectedId)
        if (!obj) return

        const dx = finalPt.x - dragOffset.x
        const dy = finalPt.y - dragOffset.y
        const w = Math.abs(obj.points[1].x - obj.points[0].x)
        const h = Math.abs(obj.points[1].y - obj.points[0].y)

        onObjectsChange(
          objects.map((o) => {
            if (o.id !== selectedId) return o
            return {
              ...o,
              points: [
                { x: dx, y: dy },
                { x: dx + w, y: dy + h },
              ],
            }
          })
        )
        setCurrentPoint(finalPt)
        return
      }

      if (!isDrawing) return
      const rawPt = svgPoint(event.clientX, event.clientY)
      const snapped = findSnapPoint(rawPt)
      const pt = snapped ?? applyGridSnap(rawPt)
      setSnapTarget(snapped)
      setCurrentPoint(pt)
    },
    [isDragging, selectedId, objects, onObjectsChange, svgPoint, findSnapPoint, applyGridSnap, dragOffset]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
      setSnapTarget(null)
      return
    }

    if (!isDrawing) return
    const snapped = findSnapPoint(currentPoint)
    const end = snapped ?? applyGridSnap(currentPoint)

    const newId = `obj-${nextId}`
    const w = Math.abs(end.x - startPoint.x)
    const h = Math.abs(end.y - startPoint.y)

    let newObject: DrawingObject | null = null

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
        points: [{ x, y }, { x: x + w, y: y + h }],
        stroke: '#1e293b',
        strokeWidth: 2,
        fill: 'rgba(37, 99, 235, 0.05)',
        width: w,
        height: h,
      }
    } else if (tool === 'square') {
      const size = Math.min(w, h)
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
    setSnapTarget(null)
  }, [tool, startPoint, currentPoint, nextId, objects, onObjectsChange, onSelect, findSnapPoint, applyGridSnap])

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      if (!isCtrlPressed) return
      event.preventDefault()
      const delta = -event.deltaY * 0.001
      const newZoom = Math.min(4, Math.max(0.25, zoom + delta))
      onZoomChange(newZoom)
    },
    [isCtrlPressed, onZoomChange, zoom]
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

  const selectedObj = objects.find((o) => o.id === selectedId)

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern
            id="grid"
            width={gridSize * zoom}
            height={gridSize * zoom}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 0 0 L ${gridSize * zoom} 0`}
              stroke={GRID_COLOR}
              strokeWidth="1"
            />
            <path
              d={`M 0 0 L 0 ${gridSize * zoom}`}
              stroke={GRID_COLOR}
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {objects.map((obj) => {
          const isSelected = obj.id === selectedId
          if (obj.type === 'line') {
            return (
              <g key={obj.id}>
                <line
                  x1={obj.points[0].x}
                  y1={obj.points[0].y}
                  x2={obj.points[1].x}
                  y2={obj.points[1].y}
                  stroke={obj.stroke ?? '#1e293b'}
                  strokeWidth={obj.strokeWidth ?? 2}
                  className={isSelected ? 'cursor-move' : ''}
                />
                {isSelected && (
                  <>
                    <circle
                      cx={obj.points[0].x}
                      cy={obj.points[0].y}
                      r={4 / zoom}
                      fill={SELECT_COLOR}
                      stroke="white"
                      strokeWidth="1"
                    />
                    <circle
                      cx={obj.points[1].x}
                      cy={obj.points[1].y}
                      r={4 / zoom}
                      fill={SELECT_COLOR}
                      stroke="white"
                      strokeWidth="1"
                    />
                  </>
                )}
              </g>
            )
          }
          if (obj.type === 'rectangle') {
            const x = Math.min(obj.points[0].x, obj.points[1].x)
            const y = Math.min(obj.points[0].y, obj.points[1].y)
            const w = Math.abs(obj.points[1].x - obj.points[0].x)
            const h = Math.abs(obj.points[1].y - obj.points[0].y)
            return (
              <g key={obj.id}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  stroke={obj.stroke ?? '#1e293b'}
                  strokeWidth={obj.strokeWidth ?? 2}
                  fill={obj.fill ?? 'transparent'}
                  className={isSelected ? 'cursor-move' : ''}
                />
                {isSelected && (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r={4 / zoom}
                      fill={SELECT_COLOR}
                      stroke="white"
                      strokeWidth="1"
                    />
                    <circle
                      cx={x + w}
                      cy={y + h}
                      r={4 / zoom}
                      fill={SELECT_COLOR}
                      stroke="white"
                      strokeWidth="1"
                    />
                    <text
                      x={x + w / 2}
                      y={y - 8}
                      fill={DIMENSION_COLOR}
                      fontSize={12 / zoom}
                      fontWeight="700"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {w.toFixed(0)} × {h.toFixed(0)}
                    </text>
                  </>
                )}
              </g>
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

        {isDrawing && tool !== 'select' && (
          <text
            x={(startPoint.x + currentPoint.x) / 2}
            y={(startPoint.y + currentPoint.y) / 2 - 10}
            fill={DIMENSION_COLOR}
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            pointerEvents="none"
          >
            {Math.abs(currentPoint.x - startPoint.x).toFixed(0)} ×
            {Math.abs(currentPoint.y - startPoint.y).toFixed(0)}
          </text>
        )}

        {snapTarget && isShiftPressed && (
          <circle
            cx={snapTarget.x}
            cy={snapTarget.y}
            r={14 / zoom}
            fill={SNAP_COLOR}
            stroke="white"
            strokeWidth="1.5"
            pointerEvents="none"
            filter="drop-shadow(0 0 2px rgba(225, 29, 72, 0.6))"
          />
        )}
      </svg>

      {selectedObj && selectedId && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm text-sm font-medium text-slate-700">
          {selectedObj.type === 'rectangle'
            ? `${Math.abs(selectedObj.points[1].x - selectedObj.points[0].x).toFixed(0)} × ${Math.abs(selectedObj.points[1].y - selectedObj.points[0].y).toFixed(0)} м`
            : 'Линия'}
        </div>
      )}
    </div>
  )
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
