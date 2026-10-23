
import type { Project } from '../types/project'

const STORAGE_KEY = 'space-map-projects'

export function getProjects(): Project[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return []
    }

    return JSON.parse(saved) as Project[]
  } catch {
    return []
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function createProject(
  name: string,
  description: string,
): Project {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
  }
}
