export interface PanoramaHotspot {
  id: string
  pitch: number
  yaw: number
  kind: 'info' | 'scene'
  title: string
  description?: string
  /** Переход: id панорамы (точки или навигационной метки) того же этажа. */
  targetId?: string
}

const KEY = 'space-map-hotspots'
const key = (projectId: string, panoramaId: string) => `${projectId}:${panoramaId}`

function readAll(): Record<string, PanoramaHotspot[]> {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

export function getHotspots(projectId: string, panoramaId: string): PanoramaHotspot[] {
  const list = readAll()[key(projectId, panoramaId)]
  return Array.isArray(list) ? list.filter((item) => item && typeof item.id === 'string' && Number.isFinite(item.pitch) && Number.isFinite(item.yaw)) : []
}

export function saveHotspots(projectId: string, panoramaId: string, hotspots: PanoramaHotspot[]) {
  const all = readAll()
  if (hotspots.length) all[key(projectId, panoramaId)] = hotspots
  else delete all[key(projectId, panoramaId)]
  localStorage.setItem(KEY, JSON.stringify(all))
}
