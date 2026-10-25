import type { DrawingObject, Point } from '../types/drawing'
import type { ProjectFloor } from '../types/project'
import { hitObject, isStairs, objectBounds, objectCenter, objectName, PIXELS_PER_METRE } from '../components/editor/drawingGeometry'

export interface RouteEndpoint {
  floorId: string
  objectId?: string
  point?: Point
}

export interface RouteRequest {
  from?: RouteEndpoint
  to?: RouteEndpoint
}

export interface RouteLeg {
  floorId: string
  points: Point[]
  length: number
  /** Лестница, по которой маршрут уходит с этого этажа. */
  exitStairsId?: string
}

export type RouteResult = { legs: RouteLeg[]; length: number } | { error: string }

const MAX_CELLS = 60_000
const PADDING = 2 * PIXELS_PER_METRE
const CLOSED = ['rectangle', 'ellipse', 'polygon']

export function endpointOptions(floors: ProjectFloor[]) {
  return floors.flatMap((floor) => (floor.drawings ?? [])
    .filter((object) => object.type !== 'dimension' && object.markerKind !== 'service' && (object.type === 'marker' || isStairs(object) || object.label?.trim()))
    .map((object) => ({ floorId: floor.id, objectId: object.id,
      label: `${object.label?.trim() || objectName(object)}${floors.length > 1 ? ` · этаж ${floor.name}` : ''}` })))
}

export function endpointPoint(floors: ProjectFloor[], endpoint: RouteEndpoint): Point | null {
  if (endpoint.point) return endpoint.point
  const object = floors.find((floor) => floor.id === endpoint.floorId)?.drawings?.find((item) => item.id === endpoint.objectId)
  if (!object) return null
  return object.type === 'marker' ? object.points[0] : objectCenter(object)
}

export function routeLength(points: Point[]) {
  return points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0)
}

/** Ищет путь по этажу: стены (линии, ломаные) и чужие помещения непроходимы. */
export function findPath(objects: DrawingObject[], start: Point, end: Point): Point[] | null {
  const contains = (object: DrawingObject, point: Point) => hitObject(object, point, 0)
  const blockers = objects.filter((object) => object.type !== 'marker' && object.type !== 'dimension' && !isStairs(object)
    && !object.passable && !(CLOSED.includes(object.type) && (contains(object, start) || contains(object, end))))
  const points = [start, end, ...blockers.flatMap((object) => {
    const box = objectBounds(object)
    return [{ x: box.left, y: box.top }, { x: box.right, y: box.bottom }]
  })]
  const left = Math.min(...points.map((point) => point.x)) - PADDING
  const top = Math.min(...points.map((point) => point.y)) - PADDING
  const width = Math.max(...points.map((point) => point.x)) + PADDING - left
  const height = Math.max(...points.map((point) => point.y)) + PADDING - top
  const cell = Math.max(10, Math.sqrt(width * height / MAX_CELLS))
  const cols = Math.ceil(width / cell) + 1, rows = Math.ceil(height / cell) + 1
  const tolerance = cell * 0.6
  const boxes = blockers.map((object) => {
    const box = objectBounds(object)
    return { object, left: box.left - tolerance, right: box.right + tolerance, top: box.top - tolerance, bottom: box.bottom + tolerance }
  })
  const blocked = new Uint8Array(cols * rows)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const point = { x: left + col * cell, y: top + row * cell }
      if (boxes.some((box) => point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom && hitObject(box.object, point, tolerance))) blocked[row * cols + col] = 1
    }
  }
  const toCell = (point: Point) => Math.round((point.y - top) / cell) * cols + Math.round((point.x - left) / cell)
  const centre = (index: number) => ({ x: left + (index % cols) * cell, y: top + Math.floor(index / cols) * cell })
  const nearestFree = (index: number) => {
    if (!blocked[index]) return index
    const seen = new Set([index]), queue = [index]
    for (let head = 0; head < queue.length && head < 4000; head++) {
      const current = queue[head]
      if (!blocked[current]) return current
      for (const next of [current - 1, current + 1, current - cols, current + cols]) {
        if (next >= 0 && next < blocked.length && !seen.has(next)) { seen.add(next); queue.push(next) }
      }
    }
    return -1
  }
  const from = nearestFree(toCell(start)), to = nearestFree(toCell(end))
  if (from < 0 || to < 0) return null

  // A* по восьми направлениям; по диагонали — только если обе соседние клетки свободны.
  const cost = new Float64Array(cols * rows).fill(Infinity)
  const parent = new Int32Array(cols * rows).fill(-1)
  const closed = new Uint8Array(cols * rows)
  const heap: [number, number][] = []
  const push = (item: [number, number]) => {
    heap.push(item)
    for (let i = heap.length - 1; i > 0;) {
      const up = (i - 1) >> 1
      if (heap[up][0] <= heap[i][0]) break
      ;[heap[up], heap[i]] = [heap[i], heap[up]]; i = up
    }
  }
  const pop = () => {
    const top = heap[0], last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      for (let i = 0; ;) {
        const l = i * 2 + 1, r = l + 1
        let m = i
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]; i = m
      }
    }
    return top
  }
  const tx = to % cols, ty = Math.floor(to / cols)
  const heuristic = (index: number) => {
    const dx = Math.abs(index % cols - tx), dy = Math.abs(Math.floor(index / cols) - ty)
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
  }
  cost[from] = 0
  push([heuristic(from), from])
  while (heap.length) {
    const [, current] = pop()
    if (closed[current]) continue
    if (current === to) break
    closed[current] = 1
    const x = current % cols, y = Math.floor(current / cols)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const next = ny * cols + nx
        if (blocked[next] || closed[next]) continue
        if (dx && dy && (blocked[y * cols + nx] || blocked[ny * cols + x])) continue
        const value = cost[current] + (dx && dy ? Math.SQRT2 : 1)
        if (value < cost[next]) { cost[next] = value; parent[next] = current; push([value + heuristic(next), next]) }
      }
    }
  }
  if (from !== to && parent[to] < 0) return null
  const cells: number[] = [to]
  while (cells[0] !== from) cells.unshift(parent[cells[0]])

  // Срезаем углы: следующая точка пути — самая дальняя видимая по прямой.
  const visible = (a: Point, b: Point) => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (cell / 3))
    for (let i = 1; i < steps; i++) {
      const index = toCell({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps })
      if (blocked[index]) return false
    }
    return true
  }
  const path = cells.map(centre)
  const smooth = [path[0]]
  for (let i = 0; i < path.length - 1;) {
    let j = path.length - 1
    while (j > i + 1 && !visible(path[i], path[j])) j--
    smooth.push(path[j]); i = j
  }
  const result = [start, ...smooth, end].filter((point, index, list) => index === 0 || Math.hypot(point.x - list[index - 1].x, point.y - list[index - 1].y) > 0.5)
  return result.length > 1 ? result : [start, end]
}

function floorRoute(floors: ProjectFloor[], fromId: string, toId: string): string[] | null {
  const linked = (a: ProjectFloor, b: ProjectFloor) => (a.drawings ?? []).some((object) => isStairs(object) && object.targetFloorId === b.id)
    || (b.drawings ?? []).some((object) => isStairs(object) && object.targetFloorId === a.id)
  const previous = new Map<string, string>([[fromId, '']])
  const queue = [fromId]
  while (queue.length) {
    const current = queue.shift()!
    if (current === toId) break
    const floor = floors.find((item) => item.id === current)!
    for (const next of floors) {
      if (!previous.has(next.id) && next.id !== current && linked(floor, next)) { previous.set(next.id, current); queue.push(next.id) }
    }
  }
  if (!previous.has(toId)) return null
  const path = [toId]
  while (path[0] !== fromId) path.unshift(previous.get(path[0])!)
  return path
}

export function findRoute(floors: ProjectFloor[], request: Required<RouteRequest>): RouteResult {
  const start = endpointPoint(floors, request.from), end = endpointPoint(floors, request.to)
  if (!start || !end) return { error: 'Начало или конец маршрута удалены с чертежа.' }
  const floorIds = floorRoute(floors, request.from.floorId, request.to.floorId)
  if (!floorIds) return { error: 'Этажи не связаны лестницей. Добавь лестницу и выбери, на какой этаж она ведёт.' }
  const legs: RouteLeg[] = []
  let position = start
  for (let index = 0; index < floorIds.length; index++) {
    const floor = floors.find((item) => item.id === floorIds[index])!
    const nextId = floorIds[index + 1]
    let target = end, exit: DrawingObject | undefined, entry: Point | undefined
    if (nextId) {
      const next = floors.find((item) => item.id === nextId)!
      const distance = (object: DrawingObject, point: Point) => Math.hypot(objectCenter(object).x - point.x, objectCenter(object).y - point.y)
      const own = (floor.drawings ?? []).filter((object) => isStairs(object) && object.targetFloorId === nextId)
      const back = (next.drawings ?? []).filter((object) => isStairs(object) && object.targetFloorId === floor.id)
      // Лестница есть только на одном этаже — считаем, что лестничный пролёт на другом этаже в том же месте.
      exit = (own.length ? own : back).toSorted((a, b) => distance(a, position) - distance(b, position))[0]
      target = objectCenter(exit)
      const arrival = back.length ? back.toSorted((a, b) => distance(a, target) - distance(b, target))[0] : undefined
      entry = arrival ? objectCenter(arrival) : target
    }
    const points = findPath((floor.drawings ?? []), position, target)
    if (!points) return { error: `Не удалось найти проход на этаже ${floor.name}. Проверь стены или отметь коридоры как «Проходимая зона».` }
    legs.push({ floorId: floor.id, points, length: routeLength(points) / PIXELS_PER_METRE, exitStairsId: exit?.id })
    if (entry) position = entry
  }
  return { legs, length: legs.reduce((sum, leg) => sum + leg.length, 0) }
}
