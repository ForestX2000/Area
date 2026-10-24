import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import WorkspaceBoard from '../components/workspace/WorkspaceBoard'
import { getProjects } from '../utils/projectStorage'
import { createWorkspace, getWorkspaces, saveWorkspaces } from '../utils/workspaceStorage'
import type { Workspace, WorkspaceCollection } from '../types/workspace'

function NewWorkspaceDialog({ suggestedName, onCreate, onClose }: {
  suggestedName: string; onCreate: (name: string) => void; onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState(suggestedName)
  useEffect(() => {
    const dialog = dialogRef.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) onCreate(name.trim())
  }
  return (
    <dialog ref={dialogRef} aria-labelledby="workspace-dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-line bg-white p-6 text-body shadow-xl backdrop:bg-black/35">
      <h2 id="workspace-dialog-title" className="text-xl font-bold text-ink">Новый Workspace</h2>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm">Название Workspace
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoFocus
            className="rounded-lg border border-line-strong px-3 py-2" />
        </label>
        <p className="text-sm text-muted">Добавьте карты из общего списка и расположите их на холсте.</p>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={!name.trim()} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-hover disabled:opacity-40">Создать Workspace</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 hover:bg-surface-muted">Отмена</button>
        </div>
      </form>
    </dialog>
  )
}

export default function WorkspacePage() {
  const [projects] = useState(() => getProjects())
  const [collection, setCollection] = useState(() => getWorkspaces(projects))
  const initialCollection = useRef(collection)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const active = collection.workspaces.find((workspace) => workspace.id === collection.activeId)!

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

  function removeWorkspace() {
    if (!window.confirm(`Удалить Workspace «${active.name}»? Карты останутся в проектах.`)) return
    const remaining = collection.workspaces.filter((workspace) => workspace.id !== active.id)
    if (remaining.length === 0) remaining.push(createWorkspace('Основной Workspace'))
    updateCollection({ version: 1, activeId: remaining[0].id, workspaces: remaining })
  }

  return (
    <section className="text-body">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-muted hover:text-brand">← Все проекты</Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">2D Workspace</h1>
          <p className="mt-2 text-sm text-muted">Размещайте карты на общем холсте и объединяйте их в контейнеры.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-brand px-4 py-2.5 text-white hover:bg-brand-hover">+ Новый Workspace</button>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 gap-1 text-xs text-muted">Workspace
          <select aria-label="Выбрать Workspace" value={active.id}
            onChange={(event) => updateCollection({ ...collection, activeId: event.target.value })}
            className="w-60 max-w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-body">
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
            className="w-60 max-w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-body" />
        </label>
        <button type="button" onClick={removeWorkspace} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:border-brand-border hover:text-brand">Удалить Workspace</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-brand-border bg-brand-soft p-3 text-sm text-brand-strong">{error}</p>}
      <WorkspaceBoard key={active.id} workspace={active} projects={projects} onChange={updateWorkspace} />
      {creating && <NewWorkspaceDialog suggestedName={`Workspace ${collection.workspaces.length + 1}`}
        onClose={() => setCreating(false)} onCreate={(name) => {
          const workspace = createWorkspace(name)
          updateCollection({ ...collection, activeId: workspace.id, workspaces: [...collection.workspaces, workspace] })
          setCreating(false)
        }} />}
    </section>
  )
}
