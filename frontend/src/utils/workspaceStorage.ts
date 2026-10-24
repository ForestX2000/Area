import type { Project } from '../types/project'
import type { Workspace, WorkspaceCollection, WorkspaceGroup, WorkspaceNode } from '../types/workspace'

const STORAGE_KEY = 'space-map-workspaces'
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const coordinate = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? Math.max(-1e7, Math.min(1e7, value)) : fallback

export function createWorkspace(name: string, projectIds: string[] = []): Workspace {
  return {
    id: crypto.randomUUID(), name: name.trim().slice(0, 120) || 'Workspace',
    nodes: projectIds.map((projectId, index) => ({ projectId, x: 40 + index % 3 * 320, y: 80 + Math.floor(index / 3) * 320 })),
    groups: [], view: { x: 0, y: 0, zoom: 1 },
  }
}

export function cleanGroups(groups: WorkspaceGroup[], nodes: WorkspaceNode[]): WorkspaceGroup[] {
  const present = new Set(nodes.map((node) => node.projectId))
  return groups.map((group) => ({ ...group, projectIds: group.projectIds.filter((id) => present.has(id)) }))
    .filter((group) => group.projectIds.length >= 2)
}

export function getWorkspaces(projects: Project[]): WorkspaceCollection {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.workspaces)) {
      const projectIds = new Set(projects.map((project) => project.id))
      const seenWorkspaces = new Set<string>()
      const workspaces: Workspace[] = []
      for (const saved of parsed.workspaces) {
        if (!isRecord(saved) || typeof saved.id !== 'string' || !saved.id || seenWorkspaces.has(saved.id)) continue
        seenWorkspaces.add(saved.id)
        const seenNodes = new Set<string>()
        const nodes: WorkspaceNode[] = []
        for (const node of Array.isArray(saved.nodes) ? saved.nodes : []) {
          if (!isRecord(node) || typeof node.projectId !== 'string' || !projectIds.has(node.projectId) || seenNodes.has(node.projectId)) continue
          seenNodes.add(node.projectId)
          nodes.push({ projectId: node.projectId, x: coordinate(node.x), y: coordinate(node.y) })
        }
        const grouped = new Set<string>()
        const groupIds = new Set<string>()
        const groups: WorkspaceGroup[] = []
        for (const group of Array.isArray(saved.groups) ? saved.groups : []) {
          if (!isRecord(group) || typeof group.id !== 'string' || groupIds.has(group.id) || !Array.isArray(group.projectIds)) continue
          const members = [...new Set(group.projectIds.filter((id): id is string => typeof id === 'string' && seenNodes.has(id) && !grouped.has(id)))]
          if (members.length < 2) continue
          members.forEach((id) => grouped.add(id))
          groupIds.add(group.id)
          groups.push({ id: group.id, name: typeof group.name === 'string' ? group.name.slice(0, 120) : 'Контейнер', projectIds: members })
        }
        const view = isRecord(saved.view) ? saved.view : {}
        workspaces.push({ id: saved.id, name: typeof saved.name === 'string' ? saved.name.slice(0, 120) : 'Workspace', nodes, groups,
          view: { x: coordinate(view.x), y: coordinate(view.y), zoom: Math.min(2, Math.max(0.25, coordinate(view.zoom, 1))) } })
      }
      if (workspaces.length > 0) return { version: 1, workspaces, activeId: workspaces.some((workspace) => workspace.id === parsed.activeId) ? parsed.activeId as string : workspaces[0].id }
    }
  } catch {
    // A damaged layout must not prevent access to the original maps.
  }
  const workspace = createWorkspace('Основной Workspace', projects.map((project) => project.id))
  return { version: 1, activeId: workspace.id, workspaces: [workspace] }
}

export function saveWorkspaces(collection: WorkspaceCollection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
}
