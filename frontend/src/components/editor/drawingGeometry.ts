import type { DrawingObject, DrawingTool, Point } from '../../types/drawing'

// Geometry is stored in canvas units; one metre occupies 50 px at 100% zoom.
export const PIXELS_PER_METRE = 50
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4

export function createDrawing(tool: DrawingTool, start: Point, end: Point, id: string): DrawingObject {
  const rectangle = tool === 'rectangle'
  return {
    id,
    type: rectangle ? 'rectangle' : tool === 'dimension' ? 'dimension' : 'line',
    points: [start, end],
    stroke: tool === 'dimension' ? 'var(--ttk-body)' : 'var(--ttk-graphite)',
    strokeWidth: 2,
    ...(rectangle ? {
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
      fill: 'var(--ttk-drawing-fill)',
    } : {}),
  }
}

export function resizeHandles(object: DrawingObject): Point[] {
  const [a, b] = object.points
  if (object.type !== 'rectangle') return [a, b]
  const left = Math.min(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const right = Math.max(a.x, b.x)
  const bottom = Math.max(a.y, b.y)
  return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }]
}

export function resizeDrawing(object: DrawingObject, handle: number, end: Point): DrawingObject {
  if (object.type !== 'rectangle') {
    return { ...object, points: object.points.map((point, index) => index === handle ? end : point) }
  }
  const opposite = resizeHandles(object)[(handle + 2) % 4]
  let finish = end
  if (object.isSquare) {
    const size = Math.max(Math.abs(end.x - opposite.x), Math.abs(end.y - opposite.y))
    finish = { x: opposite.x + (end.x < opposite.x ? -size : size),
      y: opposite.y + (end.y < opposite.y ? -size : size) }
  }
  return { ...object, points: [opposite, finish],
    width: Math.abs(finish.x - opposite.x), height: Math.abs(finish.y - opposite.y) }
}

export function pointToSegmentDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
  return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy)
}
