export interface WorkspaceNode {
  projectId: string
  x: number
  y: number
}

export interface WorkspaceGroup {
  id: string
  name: string
  projectIds: string[]
}

export interface WorkspaceContent {
  nodes: WorkspaceNode[]
  groups: WorkspaceGroup[]
}

export interface Workspace extends WorkspaceContent {
  id: string
  name: string
  view: { x: number; y: number; zoom: number }
  description?: string
}

export interface WorkspaceCollection {
  version: 1
  activeId: string
  workspaces: Workspace[]
}
