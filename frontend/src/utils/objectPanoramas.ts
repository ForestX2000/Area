import type { Project } from '../types/project'
import { floorStorageId, getFloor, getFloors } from './floorStorage'
import { getPanorama } from './mapStorage'
import { getPoints } from './pointStorage'

export interface PanoramaEntry {
  id: string
  title: string
  kind: 'point' | 'marker'
}

/** Панорамы этажа: точки карты и навигационные метки чертежа, у которых файл действительно есть. */
export async function floorPanoramas(project: Project, floorId: string): Promise<PanoramaEntry[]> {
  const storageId = floorStorageId(project.id, floorId)
  const candidates: PanoramaEntry[] = [
    ...getPoints(storageId).map((point) => ({ id: point.id, title: point.title || 'Точка', kind: 'point' as const })),
    ...(getFloor(project, floorId).drawings ?? [])
      .filter((object) => object.markerKind === 'navigation' && object.panoramaKey)
      .map((object) => ({ id: object.id, title: object.label || 'Навигационная метка', kind: 'marker' as const })),
  ]
  const available = await Promise.all(candidates.map(async (entry) =>
    (await getPanorama(storageId, entry.id).catch(() => undefined)) ? entry : null))
  return available.filter((entry): entry is PanoramaEntry => entry !== null)
}

export async function projectHasPanorama(project: Project): Promise<boolean> {
  for (const floor of getFloors(project)) {
    if ((await floorPanoramas(project, floor.id)).length > 0) return true
  }
  return false
}
