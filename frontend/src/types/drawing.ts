
<<<<<<< Updated upstream
export type DrawingTool = 'select' | 'line' | 'rectangle' | 'square' | 'dimension'
=======
export type ShapeType = 'line' | 'rectangle' | 'dimension' | 'ellipse' | 'polygon' | 'polyline'
export type MarkerKind = 'info' | 'navigation' | 'status' | 'service'
export type DrawingTool = 'select' | 'vertices' | ShapeType | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | `marker-${MarkerKind}`
>>>>>>> Stashed changes

export interface Point {
  x: number
  y: number
}

export interface DrawingObject {
  id: string
<<<<<<< Updated upstream
  type: 'line' | 'rectangle' | 'dimension'
  points: Point[]
=======
  type: ShapeType | 'marker'
  shapeKind?: DrawingTool
  markerKind?: MarkerKind
  description?: string
  targetProjectId?: string
  panoramaKey?: string
  status?: 'ready' | 'progress' | 'blocked'
  points: Point[]
  rotation?: number
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  selectedId: string | null
=======
  selectedIds: string[]
>>>>>>> Stashed changes
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
