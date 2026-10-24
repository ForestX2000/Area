
export type DrawingTool = 'select' | 'line' | 'rectangle' | 'dimension'

export interface Point {
  x: number
  y: number
}

export interface DrawingObject {
  id: string
  type: 'line' | 'rectangle' | 'dimension'
  points: Point[]
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
  selectedId: string | null
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
