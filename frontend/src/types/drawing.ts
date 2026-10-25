
export type ShapeType = 'line' | 'rectangle' | 'dimension' | 'ellipse' | 'polygon' | 'polyline'
export type MarkerKind = 'info' | 'navigation' | 'status' | 'service'
export type DrawingTool = 'select' | 'vertices' | ShapeType | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | 'stairs' | `marker-${MarkerKind}`

export interface Point {
  x: number
  y: number
}

export interface DrawingObject {
  id: string
  type: ShapeType | 'marker'
  shapeKind?: DrawingTool
  markerKind?: MarkerKind
  description?: string
  targetProjectId?: string
  /** Лестница: этаж, на который она ведёт. */
  targetFloorId?: string
  /** Замкнутая фигура, через которую маршрут может проходить (коридор, холл). */
  passable?: boolean
  panoramaKey?: string
  status?: 'ready' | 'progress' | 'blocked'
  points: Point[]
  rotation?: number
  strokeWidth?: number
  stroke?: string
  fill?: string
  label?: string
  width?: number
  height?: number
  strokeDasharray?: string
  isSquare?: boolean
  [key: string]: unknown
}

export interface CanvasState {
  objects: DrawingObject[]
  selectedIds: string[]
  tool: DrawingTool
  gridSize: number
  snapToGrid: boolean
  zoom: number
  pan: Point
}

export interface DimensionData {
  id: string
  start: Point
  end: Point
  value: string
  offset: number
  orientation: 'horizontal' | 'vertical'
}
