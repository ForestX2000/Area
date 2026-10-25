import { useState } from 'react'
import type { Project } from '../types/project'
import type { Workspace } from '../types/workspace'

export const PROJECT_DRAG_TYPE = 'application/x-area-project'

export default function FolderCard({ folder, projects, onOpen, onDelete, onDropProject }: {
  folder: Workspace
  projects: Project[]
  onOpen: () => void
  onDelete: () => void
  onDropProject: (projectId: string) => void
}) {
  const [over, setOver] = useState(false)
  const inside = folder.nodes.map((node) => projects.find((project) => project.id === node.projectId)).filter((project): project is Project => Boolean(project))

  return (
    <article data-project-kind="folder" aria-label={`Папка: ${folder.name}`}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(PROJECT_DRAG_TYPE)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        const projectId = event.dataTransfer.getData(PROJECT_DRAG_TYPE)
        setOver(false)
        if (!projectId) return
        event.preventDefault()
        onDropProject(projectId)
      }}
      className={`overflow-hidden rounded-2xl border bg-surface shadow-sm transition duration-200 ${over ? 'border-brand ring-4 ring-brand-soft' : 'border-line hover:-translate-y-1 hover:border-brand-border hover:shadow-lg'}`}>
      <button type="button" onClick={onOpen} className="flex h-44 w-full flex-col justify-between bg-page p-5 text-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-12 w-12 text-brand" aria-hidden="true">
          <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.6l2 2h8.4A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-10Z" />
        </svg>
        {inside.length > 0
          ? <ul className="space-y-0.5 text-xs text-muted">{inside.slice(0, 3).map((project) => <li key={project.id} className="truncate">• {project.name}</li>)}
            {inside.length > 3 && <li>и ещё {inside.length - 3}</li>}</ul>
          : <p className="text-xs text-muted">{over ? 'Отпусти, чтобы положить карту в папку' : 'Перетащи сюда карту'}</p>}
      </button>
      <div className="p-5">
        <h3 className="truncate text-lg font-bold text-body" title={folder.name}>{folder.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{folder.description || 'Папка проектов'}</p>
        <p className="mt-3 text-xs text-muted">Карт в папке: {inside.length}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-hover">
            Открыть папку <span aria-hidden="true">→</span>
          </button>
          <button type="button" onClick={onDelete} aria-label={`Удалить папку ${folder.name}`}
            className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-brand-soft hover:text-brand">Удалить</button>
        </div>
      </div>
    </article>
  )
}
