import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import WorkspaceBoard from '../components/workspace/WorkspaceBoard'
import { getProjects } from '../utils/projectStorage'
import { getWorkspaces, saveWorkspaces } from '../utils/workspaceStorage'
import type { Workspace, WorkspaceCollection } from '../types/workspace'
import { useConfirmation } from '../contexts/useConfirmation'

export default function WorkspacePage() {
  const confirm = useConfirmation()
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const [projects] = useState(() => getProjects())
  const [collection, setCollection] = useState(() => {
    const saved = getWorkspaces(projects, false)
    return saved.workspaces.some((workspace) => workspace.id === workspaceId) ? { ...saved, activeId: workspaceId! } : saved
  })
  const initialCollection = useRef(collection)
  const [error, setError] = useState('')
  const active = collection.workspaces.find((workspace) => workspace.id === workspaceId) ?? collection.workspaces.find((workspace) => workspace.id === collection.activeId)

  useEffect(() => {
    try {
      saveWorkspaces(initialCollection.current)
    } catch {
      // The initial layout can be reconstructed; edits report storage failures.
    }
  }, [])

  function updateCollection(next: WorkspaceCollection) {
    setCollection(next)
    try {
      saveWorkspaces(next)
      setError('')
    } catch {
      setError('Не удалось сохранить Workspace в браузере. Изменения доступны до закрытия страницы.')
    }
  }

  function updateWorkspace(next: Workspace) {
    updateCollection({ ...collection, workspaces: collection.workspaces.map((workspace) => workspace.id === next.id ? next : workspace) })
  }

  async function removeWorkspace() {
    if (!active) return
    if (!await confirm({ title: 'Удалить Workspace?', message: `Workspace «${active.name}» будет удалён. Карты останутся в проектах.` })) return
    const remaining = collection.workspaces.filter((workspace) => workspace.id !== active.id)
    updateCollection({ version: 1, activeId: remaining[0]?.id ?? '', workspaces: remaining })
    navigate(remaining.length ? `/workspace/${remaining[0].id}` : '/')
  }

  if (!active) return <section className="rounded-2xl border border-line bg-surface p-8 text-center">
    <h1 className="text-2xl font-bold text-ink">Пока нет Workspace</h1>
    <p className="mt-3 text-muted">Сохранённые Workspace отображаются в общем списке «Мои проекты».</p>
    <Link to="/" className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2 text-white">К моим проектам</Link>
  </section>

  return (
    <section className="text-body">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-muted hover:text-brand">← Все проекты</Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">2D Workspace</h1>
          <p className="mt-2 text-sm text-muted">Размещайте карты на общем холсте и объединяйте их в контейнеры.</p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 gap-1 text-xs text-muted">Workspace
          <select aria-label="Выбрать Workspace" value={active.id}
            onChange={(event) => { updateCollection({ ...collection, activeId: event.target.value }); navigate(`/workspace/${event.target.value}`) }}
            className="w-60 max-w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body">
            {collection.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
        </label>
        <label key={active.id + active.name} className="grid min-w-0 gap-1 text-xs text-muted">Название Workspace
          <input aria-label="Название текущего Workspace" defaultValue={active.name} maxLength={120}
            onBlur={(event) => {
              const name = event.target.value.trim()
              if (name && name !== active.name) updateWorkspace({ ...active, name })
              else event.target.value = active.name
            }}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
            className="w-60 max-w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body" />
        </label>
        <button type="button" onClick={removeWorkspace} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:border-brand-border hover:text-brand">Удалить Workspace</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-brand-border bg-brand-soft p-3 text-sm text-brand-strong">{error}</p>}
      <WorkspaceBoard key={active.id} workspace={active} projects={projects} onChange={updateWorkspace} />

    </section>
  )
}
