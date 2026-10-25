import type { DrawingObject, DrawingTool, MarkerKind, Point } from '../../types/drawing'

export const PIXELS_PER_METRE = 50
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4

export const SHAPE_TOOLS: { id: DrawingTool; label: string; icon: string }[] = [
  { id: 'select', label: 'Выделение', icon: '⌘' }, { id: 'dimension', label: 'Линейка', icon: '↔' },
  { id: 'vertices', label: 'Вершины', icon: '◇' }, { id: 'stairs', label: 'Лестница', icon: '≡' },
  { id: 'line', label: 'Линия', icon: '─' }, { id: 'polyline', label: 'Ломаная', icon: '⌁' },
  { id: 'rectangle', label: 'Прямоугольник', icon: '▭' }, { id: 'ellipse', label: 'Эллипс', icon: '◯' },
  { id: 'triangle', label: 'Треугольник', icon: '△' }, { id: 'diamond', label: 'Ромб', icon: '♢' },
  { id: 'pentagon', label: 'Пятиугольник', icon: '⬠' }, { id: 'hexagon', label: 'Шестиугольник', icon: '⬡' },
  { id: 'star', label: 'Звезда', icon: '☆' }, { id: 'arrow', label: 'Стрелка', icon: '➜' },
  { id: 'polygon', label: 'Многоугольник', icon: '⬟' },
]

export const isStairs = (object: DrawingObject) => object.shapeKind === 'stairs'

export const MARKER_LABELS: Record<MarkerKind, string> = { info: 'Информационная', navigation: 'Навигационная', status: 'Статусная', service: 'Служебная' }
export function objectName(object: DrawingObject) {
  if (object.type === 'marker') return `${MARKER_LABELS[object.markerKind ?? 'info']} метка`
  return object.isSquare ? 'Квадрат' : SHAPE_TOOLS.find((tool) => tool.id === (object.shapeKind ?? object.type))?.label ?? 'Фигура'
}

function pointBounds(points: Point[]) {
  const left = Math.min(...points.map((point) => point.x))
  const top = Math.min(...points.map((point) => point.y))
  const right = Math.max(...points.map((point) => point.x))
  const bottom = Math.max(...points.map((point) => point.y))
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

export function objectLocalBounds(object: DrawingObject) { return pointBounds(object.points) }

export function objectCenter(object: DrawingObject): Point {
  const box = objectLocalBounds(object)
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
}

export function rotatePoint(point: Point, center: Point, degrees: number): Point {
  const angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle)
  const x = point.x - center.x, y = point.y - center.y
  return { x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos }
}

export function drawingTransform(object: DrawingObject) {
  const center = objectCenter(object)
  return object.rotation ? `rotate(${object.rotation} ${center.x} ${center.y})` : undefined
}

function boxCorners(box: ReturnType<typeof pointBounds>): Point[] {
  return [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.right, y: box.bottom }, { x: box.left, y: box.bottom }]
}

export function drawingPoints(object: DrawingObject): Point[] {
  const points = object.type === 'rectangle' ? boxCorners(objectLocalBounds(object)) : object.points
  const rotation = object.rotation ?? 0
  if (!rotation) return points
  const center = objectCenter(object)
  return points.map((point) => rotatePoint(point, center, rotation))
}

export function objectBounds(object: DrawingObject) {
  const box = objectLocalBounds(object)
  if (!object.rotation) return box
  if (object.type !== 'ellipse') return pointBounds(drawingPoints(object))
  const angle = object.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle)
  const rx = Math.hypot(box.width / 2 * cos, box.height / 2 * sin)
  const ry = Math.hypot(box.width / 2 * sin, box.height / 2 * cos)
  const center = objectCenter(object)
  return { left: center.x - rx, right: center.x + rx, top: center.y - ry, bottom: center.y + ry, width: rx * 2, height: ry * 2 }
}

export function objectsBounds(objects: DrawingObject[]) {
  return pointBounds(objects.length ? objects.flatMap((object) => {
    const box = objectBounds(object)
    return [{ x: box.left, y: box.top }, { x: box.right, y: box.bottom }]
  }) : [{ x: 0, y: 0 }, { x: 1, y: 1 }])
}

// A changed local bounding box moves its rotation pivot. Translate the stored
// points so that editing a corner or vertex keeps the other world points fixed.
function keepWorldFrame(original: DrawingObject, updated: DrawingObject): DrawingObject {
  const center = objectCenter(updated)
  const world = rotatePoint(center, objectCenter(original), original.rotation ?? 0)
  return { ...updated, rotation: original.rotation, points: updated.points.map((point) => ({ x: point.x + world.x - center.x, y: point.y + world.y - center.y })) }
}

export function rotateDrawing(object: DrawingObject, center: Point, degrees: number): DrawingObject {
  if (Math.abs(degrees) < 1e-10) return object
  const pivot = objectCenter(object)
  const next = rotatePoint(pivot, center, degrees)
  const rotation = ((object.rotation ?? 0) + degrees) % 360
  return { ...object, rotation: (rotation + 360) % 360,
    points: object.points.map((point) => ({ x: point.x + next.x - pivot.x, y: point.y + next.y - pivot.y })) }
}

export function createDrawing(tool: DrawingTool, start: Point, end: Point, id: string): DrawingObject {
  const base = { id, stroke: tool === 'dimension' ? 'var(--ttk-body)' : 'var(--ttk-graphite)', strokeWidth: 2 }
  if (tool.startsWith('marker-')) return { ...base, type: 'marker', markerKind: tool.slice(7) as MarkerKind, points: [start, start], status: 'ready' }
  if (tool === 'stairs') return { ...base, type: 'rectangle', shapeKind: 'stairs', points: [start, end],
    width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y), fill: 'var(--ttk-drawing-fill)' }
  if (['line', 'dimension', 'ellipse', 'rectangle'].includes(tool)) return {
    ...base, type: tool as DrawingObject['type'], points: [start, end],
    ...(['rectangle', 'ellipse'].includes(tool) ? { width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y), fill: 'var(--ttk-drawing-fill)' } : {}),
  }
  const left = Math.min(start.x, end.x), top = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x), height = Math.abs(end.y - start.y)
  const at = (x: number, y: number) => ({ x: left + width * x, y: top + height * y })
  let points: Point[]
  if (tool === 'triangle') points = [at(0.5, 0), at(1, 1), at(0, 1)]
  else if (tool === 'diamond') points = [at(0.5, 0), at(1, 0.5), at(0.5, 1), at(0, 0.5)]
  else if (tool === 'arrow') points = [at(0, 0.3), at(0.6, 0.3), at(0.6, 0), at(1, 0.5), at(0.6, 1), at(0.6, 0.7), at(0, 0.7)]
  else if (tool === 'polyline') points = [start, at(0.5, 0), end]
  else if (tool === 'polygon') points = [at(0, 0), at(0.8, 0), at(1, 1), at(0.2, 1)]
  else {
    const count = tool === 'star' ? 10 : tool === 'pentagon' ? 5 : 6
    points = Array.from({ length: count }, (_, index) => {
      const angle = index * Math.PI * 2 / count - Math.PI / 2
      const radius = tool === 'star' && index % 2 ? 0.22 : 0.5
      return at(0.5 + Math.cos(angle) * radius, 0.5 + Math.sin(angle) * radius)
    })
  }
  return { ...base, type: tool === 'polyline' ? 'polyline' : 'polygon', shapeKind: tool, points, fill: tool === 'polyline' ? 'none' : 'var(--ttk-drawing-fill)' }
}

export function vertices(object: DrawingObject): Point[] {
  if (object.type === 'ellipse' || object.type === 'marker' || isStairs(object)) return []
  if (object.type === 'rectangle') return resizeHandles(object)
  return drawingPoints(object)
}

export function resizeHandles(object: DrawingObject): Point[] {
  if (object.type === 'marker') return []
  if (object.type === 'line' || object.type === 'dimension') return drawingPoints(object)
  return boxCorners(objectLocalBounds(object)).map((point) => rotatePoint(point, objectCenter(object), object.rotation ?? 0))
}

export function resizeDrawing(object: DrawingObject, handle: number, end: Point): DrawingObject {
  if (object.rotation) return keepWorldFrame(object, resizeDrawing({ ...object, rotation: 0 }, handle, rotatePoint(end, objectCenter(object), -object.rotation)))
  if (object.type === 'line' || object.type === 'dimension') return { ...object, points: object.points.map((point, index) => index === handle ? end : point) }
  const opposite = resizeHandles(object)[(handle + 2) % 4]
  let finish = end
  if (object.isSquare) {
    const size = Math.max(Math.abs(end.x - opposite.x), Math.abs(end.y - opposite.y))
    finish = { x: opposite.x + (end.x < opposite.x ? -size : size), y: opposite.y + (end.y < opposite.y ? -size : size) }
  }
  if (object.type === 'rectangle' || object.type === 'ellipse') return { ...object, points: [opposite, finish], width: Math.abs(finish.x - opposite.x), height: Math.abs(finish.y - opposite.y) }
  const original = resizeHandles(object)[handle]
  return { ...object, points: object.points.map((point) => ({
    x: opposite.x + (point.x - opposite.x) * (finish.x - opposite.x) / (original.x - opposite.x || 1),
    y: opposite.y + (point.y - opposite.y) * (finish.y - opposite.y) / (original.y - opposite.y || 1),
  })) }
}

export function scaleDrawing(object: DrawingObject, width: number, height: number): DrawingObject {
  if (object.rotation) return keepWorldFrame(object, scaleDrawing({ ...object, rotation: 0 }, width, height))
  if (object.type === 'rectangle' || object.type === 'ellipse' || object.type === 'line' || object.type === 'dimension') {
    const [a, b] = object.points
    return { ...object, width, height, points: [a, { x: a.x + (b.x < a.x ? -width : width), y: a.y + (b.y < a.y ? -height : height) }] }
  }
  const box = objectBounds(object)
  return { ...object, points: object.points.map((point) => ({ x: box.left + (point.x - box.left) * width / (box.width || 1), y: box.top + (point.y - box.top) * height / (box.height || 1) })) }
}

export function moveVertex(object: DrawingObject, index: number, point: Point): DrawingObject {
  if (object.rotation) return keepWorldFrame(object, moveVertex({ ...object, rotation: 0 }, index, rotatePoint(point, objectCenter(object), -object.rotation)))
  return { ...object, type: object.type === 'rectangle' ? 'polygon' : object.type, shapeKind: ['rectangle', 'polygon'].includes(object.type) ? 'polygon' : object.shapeKind, isSquare: undefined,
    points: vertices(object).map((original, current) => current === index ? point : original) }
}

export function canAddVertex(object: DrawingObject) { return !isStairs(object) && ['rectangle', 'polygon', 'line', 'polyline'].includes(object.type) }
export function canDeleteVertex(object: DrawingObject) { return vertices(object).length > (['rectangle', 'polygon'].includes(object.type) ? 3 : 2) }

export function addVertex(object: DrawingObject, point?: Point): { object: DrawingObject; index: number } {
  if (object.rotation) {
    const added = addVertex({ ...object, rotation: 0 }, point ? rotatePoint(point, objectCenter(object), -object.rotation) : undefined)
    return { ...added, object: keepWorldFrame(object, added.object) }
  }
  const points = vertices(object)
  const closed = object.type === 'rectangle' || object.type === 'polygon'
  let index = 0, best = point ? Infinity : -Infinity
  for (let current = 0; current < points.length - (closed ? 0 : 1); current++) {
    const a = points[current], b = points[(current + 1) % points.length]
    const value = point ? pointToSegmentDistance(point, a, b) : Math.hypot(b.x - a.x, b.y - a.y)
    if (point ? value < best : value > best) { index = current; best = value }
  }
  const a = points[index], b = points[(index + 1) % points.length]
  const dx = b.x - a.x, dy = b.y - a.y
  const ratio = point ? Math.max(0.05, Math.min(0.95, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1))) : 0.5
  const inserted = { x: a.x + dx * ratio, y: a.y + dy * ratio }
  return { index: index + 1, object: { ...object, type: closed ? 'polygon' : 'polyline', shapeKind: closed ? 'polygon' : 'polyline', isSquare: undefined, points: [...points.slice(0, index + 1), inserted, ...points.slice(index + 1)] } }
}

export function deleteVertex(object: DrawingObject, index: number): DrawingObject {
  if (object.rotation) return keepWorldFrame(object, deleteVertex({ ...object, rotation: 0 }, index))
  return { ...object, type: object.type === 'rectangle' ? 'polygon' : object.type, shapeKind: ['rectangle', 'polygon'].includes(object.type) ? 'polygon' : object.shapeKind, isSquare: undefined, points: vertices(object).filter((_, current) => current !== index) }
}

export function pointToSegmentDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x, dy = end.y - start.y
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(point.x - start.x - ratio * dx, point.y - start.y - ratio * dy)
}

function inPolygon(point: Point, points: Point[]) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function hitObject(object: DrawingObject, point: Point, tolerance: number): boolean {
  if (object.rotation) return hitObject({ ...object, rotation: 0 }, rotatePoint(point, objectCenter(object), -object.rotation), tolerance)
  const box = objectBounds(object)
  if (object.type === 'marker') return Math.hypot(point.x - object.points[0].x, point.y - object.points[0].y) <= 14 + tolerance
  if (object.type === 'rectangle') return point.x >= box.left - tolerance && point.x <= box.right + tolerance && point.y >= box.top - tolerance && point.y <= box.bottom + tolerance
  if (object.type === 'ellipse') return ((point.x - (box.left + box.right) / 2) / (box.width / 2 + tolerance)) ** 2 + ((point.y - (box.top + box.bottom) / 2) / (box.height / 2 + tolerance)) ** 2 <= 1
  const points = object.points
  if (object.type === 'polygon' && inPolygon(point, points)) return true
  return points.some((a, index) => (index < points.length - 1 || object.type === 'polygon') && pointToSegmentDistance(point, a, points[(index + 1) % points.length]) <= tolerance)
}

export function intersectsSelection(object: DrawingObject, start: Point, end: Point): boolean {
  const left = Math.min(start.x, end.x), right = Math.max(start.x, end.x), top = Math.min(start.y, end.y), bottom = Math.max(start.y, end.y)
  if (object.type === 'marker') return object.points[0].x + 14 >= left && object.points[0].x - 14 <= right && object.points[0].y + 14 >= top && object.points[0].y - 14 <= bottom
  if (object.type === 'ellipse') {
    const box = objectLocalBounds(object), center = objectCenter(object)
    if (center.x >= left && center.x <= right && center.y >= top && center.y <= bottom) return true
    const corners = boxCorners({ left, right, top, bottom, width: right - left, height: bottom - top }).map((point) => {
      const local = rotatePoint(point, center, -(object.rotation ?? 0))
      return { x: (local.x - center.x) / Math.max(box.width / 2, 1e-9), y: (local.y - center.y) / Math.max(box.height / 2, 1e-9) }
    })
    return corners.some((point, index) => pointToSegmentDistance({ x: 0, y: 0 }, point, corners[(index + 1) % 4]) <= 1)
  }
  const points = drawingPoints(object)
  const closed = object.type === 'rectangle' || object.type === 'polygon'
  if (closed && [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }].some((point) => inPolygon(point, points))) return true
  return points.some((a, index) => {
    if (index === points.length - 1 && !closed) return false
    const b = points[(index + 1) % points.length]
    let near = 0, far = 1
    for (const axis of [{ origin: a.x, delta: b.x - a.x, min: left, max: right }, { origin: a.y, delta: b.y - a.y, min: top, max: bottom }]) {
      if (axis.delta === 0) { if (axis.origin < axis.min || axis.origin > axis.max) return false; continue }
      const first = (axis.min - axis.origin) / axis.delta, second = (axis.max - axis.origin) / axis.delta
      near = Math.max(near, Math.min(first, second)); far = Math.min(far, Math.max(first, second))
      if (near > far) return false
    }
    return true
  })
}
