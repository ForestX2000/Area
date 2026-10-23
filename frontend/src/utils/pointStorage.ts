
import type { MapPoint } from '../types/mapPoint'

const STORAGE_KEY = 'space-map-points'

type PointsByProject = Record<string, MapPoint[]>

function readAllPoints(): PointsByProject {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? (JSON.parse(data) as PointsByProject) : {}
  } catch {
    return {}
  }
}

export function getPoints(projectId: string): MapPoint[] {
  return readAllPoints()[projectId] ?? []
}

export function savePoints(
  projectId: string,
  points: MapPoint[],
): void {
  const allPoints = readAllPoints()
  allPoints[projectId] = points
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allPoints))
}
