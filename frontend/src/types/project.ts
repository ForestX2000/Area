
import type { DrawingObject } from './drawing'

export interface ProjectFloor {
  id: string
  number: number
  name: string
  drawings?: DrawingObject[]
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  drawings?: DrawingObject[]
  floors?: ProjectFloor[]
  activeFloorId?: string
  /** Постоянная публичная ссылка на карту; создаётся один раз. */
  shareId?: string
}
