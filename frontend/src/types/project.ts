
import type { DrawingObject } from './drawing'

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  drawings?: DrawingObject[]
}
