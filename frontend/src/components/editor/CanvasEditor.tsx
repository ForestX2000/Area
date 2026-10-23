
import { useCallback, useMemo, useRef, useState } from 'react'
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
const SELECT_COLOR = '#2563eb'
const SELECT_BG = 'rgba(37, 99, 235, 0.1)'
const DIMENSION_COLOR = '#059669'

function snap(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

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
        // Простой hit-test: ищем ближайший объект
        const clicked = findObjectAt(objects, pt, gridSize, snapToGrid)
        onSelect(clicked ? clicked.id : null)
        setIsDrawing(false)
        return
      }

      const pt = snapPoint(svgPoint(event.clientX, event.clientY))
      setStartPoint(pt)
      setCurrentPoint(pt)
      setIsDrawing(true)
    },
    [tool, objects, gridSize, snapToGrid, onSelect, svgPoint]
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing) return
      const pt = snapPoint(svgPoint(event.clientX, event.clientY))
      setCurrentPoint(pt)
    },
    [isDrawing, svgPoint]
  )

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing) return
      const end = snapPoint(svgPoint(event.clientX, event.clientY))

      const newObject: DrawingObject =
        tool === 'line'
          ? {
              id: `obj-${nextId}`,
              type: 'line',
              points: [startPoint, end],
              stroke: '#1e293b',
              strokeWidth: 2,
            }
          : tool === 'rectangle'
            ? {
                id: `obj-${nextId}`,
                type: 'rectangle',
                points: [startPoint, end],
                stroke: '#1e293b',
                strokeWidth: 2,
                fill: 'rgba(37, 99, 235, 0.05)',
              }
            : tool === 'square'
              ? {
                  id: `obj-${nextId}`,
                  type: 'rectangle',
                  points: [startPoint, end],
                  stroke: '#1e293b',
                  strokeWidth: 2,
                  fill: 'rgba(37, 99, 235, 0.05)',
                  isSquare: true,
                }
              : null

      if (newObject) {
        onObjectsChange([...objects, newObject])
        setNextId((id) => id + 1)
        onSelect(newObject.id)
      }

      setIsDrawing(false)
    },
    [tool, startPoint, objects, nextId, onObjectsChange, onSelect, svgPoint]
  )

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault()
      const delta = -event.deltaY * 0.001
      onZoomChange((prev) => Math.min(4, Math.max(0.25, prev + delta)))
    },
    [onZoomChange]
  )

  const previewObject = useMemo(() => {
    if (!isDrawing || tool === 'select') return null

    if (tool === 'line') {
      return {
        type: 'line' as const,
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
      type: 'rectangle' as const,
      points: [{ x, y }, { x: x + w, y: y + h }],
      stroke: '#94a3b8',
      strokeWidth: 2,
      fill: 'rgba(148, 163, 184, 0.1)',
      strokeDasharray: '4',
    } as DrawingObject
  }, [isDrawing, tool, startPoint, currentPoint])

  const dimensionText = useMemo(() => {
    if (!isDrawing || (tool !== 'line' && tool !== 'rectangle' && tool !== 'square'))
      return ''
    const d = dist(startPoint, currentPoint)
    return `${(d / 100).toFixed(2)} м`
  }, [isDrawing, tool, startPoint, currentPoint])

  return (
    <div
      className="relative w-full h-full bg-slate-50 overflow-hidden"
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Сетка */}
        <defs>
          <pattern
            id="grid"
            width={gridSize * zoom}
            height={gridSize * zoom}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0 L0 0"
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

        {/* Объекты */}
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
                stroke={obj.stroke || '#1e293b'}
                strokeWidth={obj.strokeWidth || 2}
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
                stroke={obj.stroke || '#1e293b'}
                strokeWidth={obj.strokeWidth || 2}
                fill={obj.fill || 'transparent'}
                className={isSelected ? 'cursor-move' : ''}
              />
            )
          }
          return null
        })}

        {/* Предпросмотр при рисовании */}
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
                width={
                  Math.abs(previewObject.points[1].x - previewObject.points[0].x)
                }
                height={
                  Math.abs(previewObject.points[1].y - previewObject.points[0].y)
                }
                stroke={previewObject.stroke}
                strokeWidth={previewObject.strokeWidth}
                fill={previewObject.fill}
                strokeDasharray={previewObject.strokeDasharray}
              />
            )}
          </>
        )}

        {/* Размерная линия предпросмотра */}
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
      const x = Math.min(p1(obj).x, p2(obj).x)
      const y = Math.min(p1(obj).y, p2(obj).y)
      const w = Math.abs(p2(obj).x - p1(obj).x)
      const h = Math.abs(p2(obj).y - p1(obj).y)
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

function p1(obj: DrawingObject): Point {
  return obj.points[0]
}

function p2(obj: DrawingObject): Point {
  return obj.points[1]
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

function snapPoint(pt: Point): Point {
  // Snap will be applied by caller using snapToGrid logic
  return pt
}
