import type { DrawingObject } from '../types/drawing'
import type { MapPoint } from '../types/mapPoint'
import type { Project } from '../types/project'
import { floorStorageId, getFloors } from './floorStorage'
import { getHotspots, type PanoramaHotspot } from './hotspotStorage'
import { getMapImage, getPanorama } from './mapStorage'
import { floorPanoramas, type PanoramaEntry } from './objectPanoramas'
import { getPoints } from './pointStorage'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export interface SharedFloor {
  id: string
  number: number
  name: string
  drawings: DrawingObject[]
  points: MapPoint[]
  /** Имя файла плана среди файлов снимка. */
  plan?: string
  panoramas: (PanoramaEntry & { file: string })[]
  hotspots: Record<string, PanoramaHotspot[]>
}

export interface SharedProject {
  version: 1
  name: string
  description: string
  floors: SharedFloor[]
}

export class ShareError extends Error {}

/** Загружает снимок проекта на сервер и возвращает id публичной ссылки. */
export async function createShare(project: Project): Promise<string> {
  const files: { name: string; blob: Blob }[] = []
  const attach = (blob: Blob) => {
    const name = `f${files.length}`
    files.push({ name, blob })
    return name
  }

  const floors: SharedFloor[] = []
  for (const floor of getFloors(project)) {
    const storageId = floorStorageId(project.id, floor.id)
    const plan = await getMapImage(storageId).catch(() => undefined)
    const panoramas: SharedFloor['panoramas'] = []
    const hotspots: SharedFloor['hotspots'] = {}
    for (const entry of await floorPanoramas(project, floor.id)) {
      const blob = await getPanorama(storageId, entry.id).catch(() => undefined)
      if (!blob) continue
      panoramas.push({ ...entry, file: attach(blob) })
      const list = getHotspots(project.id, entry.id)
      if (list.length) hotspots[entry.id] = list
    }
    floors.push({ id: floor.id, number: floor.number, name: floor.name, drawings: floor.drawings ?? [],
      points: getPoints(storageId), plan: plan ? attach(plan) : undefined, panoramas, hotspots })
  }

  const snapshot: SharedProject = { version: 1, name: project.name, description: project.description, floors }
  const form = new FormData()
  form.append('snapshot', JSON.stringify(snapshot))
  for (const file of files) {
    // Сервер принимает только изображения; Blob из IndexedDB может прийти без типа.
    const typed = file.blob.type.startsWith('image/') ? file.blob : new Blob([file.blob], { type: 'image/jpeg' })
    form.append('files', typed, file.name)
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}/shares`, { method: 'POST', body: form })
  } catch {
    throw new ShareError('Сервер недоступен. Повторите попытку позже.')
  }
  if (!response.ok) {
    const detail = await response.json().then((body) => body?.detail).catch(() => '')
    throw new ShareError(typeof detail === 'string' && detail ? detail : 'Не удалось создать ссылку.')
  }
  const { id } = await response.json() as { id: string }
  return id
}

export async function loadShare(shareId: string): Promise<SharedProject> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/shares/${encodeURIComponent(shareId)}`, { credentials: 'omit' })
  } catch {
    throw new ShareError('Сервер недоступен. Попробуйте открыть ссылку позже.')
  }
  if (response.status === 404) throw new ShareError('Ссылка не найдена или устарела.')
  if (!response.ok) throw new ShareError('Не удалось открыть проект.')
  const body = await response.json() as { snapshot: SharedProject }
  return body.snapshot
}

export const shareFileUrl = (shareId: string, name: string) =>
  `${API_URL}/shares/${encodeURIComponent(shareId)}/files/${encodeURIComponent(name)}`

export const shareUrl = (shareId: string) => `${window.location.origin}/share/${shareId}`
