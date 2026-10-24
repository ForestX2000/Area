import type { DrawingObject } from '../types/drawing'
import type { Project, ProjectFloor } from '../types/project'
import { getProjects, saveProjects } from './projectStorage'
import { deleteFloorMedia } from './mapStorage'
import { deletePoints } from './pointStorage'

export const DEFAULT_FLOOR_ID = 'default'

export function getFloors(project: Project): ProjectFloor[] {
  const seen = new Set<string>()
  const floors = (Array.isArray(project.floors) ? project.floors : []).filter((floor) => {
    if (!floor || typeof floor.id !== 'string' || !floor.id || seen.has(floor.id)) return false
    seen.add(floor.id)
    return true
  }).map((floor, index) => ({ ...floor, drawings: Array.isArray(floor.drawings) ? floor.drawings : floor.id === DEFAULT_FLOOR_ID ? project.drawings ?? [] : [], number: Number.isSafeInteger(floor.number) && floor.number > 0 ? floor.number : index + 1,
    name: typeof floor.name === 'string' && floor.name.trim() ? floor.name : String(index + 1) }))
  return floors.length ? floors : [{ id: DEFAULT_FLOOR_ID, number: 1, name: '1', drawings: project.drawings ?? [] }]
}

export function getFloor(project: Project, requestedId?: string | null): ProjectFloor {
  const floors = getFloors(project)
  return floors.find((floor) => floor.id === requestedId) ?? floors.find((floor) => floor.id === project.activeFloorId) ?? floors[0]
}

export function floorStorageId(projectId: string, floorId: string) {
  // Legacy media and point keys continue to belong to the original first floor.
  return floorId === DEFAULT_FLOOR_ID ? projectId : `${projectId}:floor:${floorId}`
}

export function floorUrl(path: string, floorId: string, explicit = false) {
  if (floorId === DEFAULT_FLOOR_ID && !explicit) return path
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  params.set('floor', floorId)
  return `${pathname}?${params}`
}

function changeProject(projectId: string, update: (project: Project) => Project) {
  const projects = getProjects()
  if (!projects.some((project) => project.id === projectId)) throw new Error('Проект не найден.')
  saveProjects(projects.map((project) => project.id === projectId ? update(project) : project))
}

export function activateFloor(projectId: string, floorId: string) {
  changeProject(projectId, (project) => {
    if (!getFloors(project).some((floor) => floor.id === floorId)) throw new Error('Этаж не найден.')
    return { ...project, floors: getFloors(project), activeFloorId: floorId }
  })
}

export function addFloor(projectId: string): ProjectFloor {
  let created!: ProjectFloor
  changeProject(projectId, (project) => {
    const floors = getFloors(project)
    const number = Math.max(...floors.map((floor) => floor.number)) + 1
    created = { id: crypto.randomUUID(), number, name: String(number), drawings: [] }
    return { ...project, floors: [...floors, created], activeFloorId: created.id }
  })
  return created
}

export function renameFloor(projectId: string, floorId: string, name: string) {
  const trimmed = name.trim().slice(0, 80)
  if (!trimmed) throw new Error('Введите название этажа.')
  changeProject(projectId, (project) => ({ ...project, floors: getFloors(project).map((floor) => floor.id === floorId ? { ...floor, name: trimmed } : floor) }))
}

export function saveFloorDrawings(projectId: string, floorId: string, drawings: DrawingObject[]) {
  changeProject(projectId, (project) => {
    const floors = getFloors(project)
    // An old editor must never recreate a floor that has just been deleted.
    if (!floors.some((floor) => floor.id === floorId)) return project
    return { ...project, floors: floors.map((floor) => floor.id === floorId ? { ...floor, drawings } : floor),
      ...(floorId === DEFAULT_FLOOR_ID ? { drawings } : {}) }
  })
}

export async function removeFloor(projectId: string, floorId: string): Promise<{ activeId: string; cleanupFailed: boolean }> {
  let activeId = ''
  changeProject(projectId, (project) => {
    const floors = getFloors(project)
    if (floors.length <= 1) throw new Error('Нельзя удалить единственный этаж.')
    if (!floors.some((floor) => floor.id === floorId)) throw new Error('Этаж не найден.')
    const remaining = floors.filter((floor) => floor.id !== floorId)
    activeId = project.activeFloorId && remaining.some((floor) => floor.id === project.activeFloorId) ? project.activeFloorId : remaining[0].id
    return { ...project, floors: remaining, activeFloorId: activeId, ...(floorId === DEFAULT_FLOOR_ID ? { drawings: undefined } : {}) }
  })
  const storageId = floorStorageId(projectId, floorId)
  const project = getProjects().find((item) => item.id === projectId)
  const protectedIds = project ? getFloors(project).map((floor) => floorStorageId(projectId, floor.id)) : []
  const cleanup = await Promise.allSettled([deleteFloorMedia(storageId, protectedIds), Promise.resolve().then(() => deletePoints(storageId))])
  return { activeId, cleanupFailed: cleanup.some((result) => result.status === 'rejected') }
}
