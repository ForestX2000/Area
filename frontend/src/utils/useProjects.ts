import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Project } from '../types/project'
import { activateFloor, getFloor } from './floorStorage'

function subscribe(callback: () => void) {
  window.addEventListener('space-map:projects-changed', callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener('space-map:projects-changed', callback)
    window.removeEventListener('storage', callback)
  }
}

function snapshot() {
  try { return localStorage.getItem('space-map-projects') ?? '[]' } catch { return '[]' }
}

export function useProjects(): Project[] {
  const serialized = useSyncExternalStore(subscribe, snapshot)
  return useMemo(() => {
    try { const parsed: unknown = JSON.parse(serialized); return Array.isArray(parsed) ? parsed as Project[] : [] } catch { return [] }
  }, [serialized])
}

export function useProjectFloor(projectId: string | undefined, requestedId: string | null) {
  const project = useProjects().find((project) => project.id === projectId)
  const floor = project ? getFloor(project, requestedId) : null
  const floorId = floor?.id
  const activeId = project?.activeFloorId
  useEffect(() => {
    if (projectId && requestedId === floorId && floorId !== activeId) {
      try { activateFloor(projectId, floorId) } catch { /* A direct link remains readable when storage is unavailable. */ }
    }
  }, [projectId, requestedId, floorId, activeId])
  return { project, floor }
}
