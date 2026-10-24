
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
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)

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

  // Отслеживаем нажатую клавишу Ctrl глобально
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') setIsCtrlPressed(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') setIsCtrlPressed(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

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
    (event: React.WheelEvent<SVGSVGElement>) => {
      // Масштаб меняется только при зажатом Ctrl и когда курсор над областью карты
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

  const dimensionText = useMemo(() => {
    if (!isDrawing || tool === 'select') return ''
    const d = dist(startPoint, currentPoint)
    return `${(d / 100).toFixed(2)} м`
  }, [isDrawing, tool, startPoint, currentPoint])

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden">
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
            {/* Верхняя и левая линии клетки — при повторении pattern получается ровная квадратная сетка */}
            <path
              d={`M 0 0 L ${gridSize * zoom} 0`}
              stroke={GRID_COLOR}
              strokeWidth="0.5"
            />
            <path
              d={`M 0 0 L 0 ${gridSize * zoom}`}
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
