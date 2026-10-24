import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { Project } from '../../types/project'
import { activateFloor, addFloor, getFloor, getFloors, removeFloor, renameFloor } from '../../utils/floorStorage'

export default function FloorPicker({ project, mode = '2d' }: { project: Project; mode?: '2d' | '3d' }) {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const floors = getFloors(project)
  const active = getFloor(project, params.get('floor'))
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerId = useId()

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select() }
  }, [editing])

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        if (editing && name.trim()) {
          try { renameFloor(project.id, editing, name) } catch { setError('Не удалось сохранить название этажа.'); return }
        }
        setOpen(false); setEditing(null)
      }
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open, editing, name, project.id])

  function goToFloor(id: string, cleanupFailed = false) {
    const next = new URLSearchParams(location.search)
    next.set('floor', id)
    if (location.pathname.endsWith('/map')) next.set('mode', mode)
    navigate(`${location.pathname}?${next}`, { replace: true, state: cleanupFailed ? { floorWarning: 'Этаж удалён, но не удалось полностью очистить его файлы из хранилища браузера.' } : null })
    setOpen(false)
    setEditing(null)
  }

  function saveName() {
    if (!editing) return
    try { renameFloor(project.id, editing, name); setEditing(null); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить название этажа.') }
  }

  return <div ref={rootRef} className="relative min-w-0 max-w-full"
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation()
        if (editing) { setEditing(null); setError('') }
        else { setOpen(false); triggerRef.current?.focus() }
      }
      if (open && (event.ctrlKey || event.metaKey)) event.stopPropagation()
    }}>
    <button ref={triggerRef} type="button" aria-label={`Этаж: ${active.name}`} aria-expanded={open} aria-haspopup="dialog" aria-controls={pickerId}
      onClick={() => { setOpen((value) => !value); setEditing(null); setError('') }}
      className="inline-flex max-w-48 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-brand-soft">
      <span className="truncate">Этаж: {active.name}</span><span aria-hidden="true" className="text-xs text-muted">▾</span>
    </button>
    {open && <div id={pickerId} role="dialog" aria-label="Этажи" className="absolute left-1/2 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-line bg-white p-2 text-body shadow-xl">
      <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted">Этажи</p>
      <ul aria-label="Список этажей" className="max-h-64 space-y-1 overflow-y-auto">
        {floors.map((floor) => <li key={floor.id} className={`flex min-w-0 items-center gap-1 rounded-lg ${active.id === floor.id ? 'bg-brand-soft' : 'hover:bg-surface-muted'}`}>
          {editing === floor.id ? <form onSubmit={(event) => { event.preventDefault(); saveName() }} className="min-w-0 flex-1 p-1">
            <input ref={inputRef} aria-label="Название этажа" value={name} maxLength={80} onChange={(event) => setName(event.target.value)}
              onBlur={() => { if (name.trim()) saveName(); else { setEditing(null); setError('') } }}
              className="w-full rounded-md border border-brand-border bg-white px-2 py-2 text-sm outline-none focus:border-brand" />
          </form> : <button type="button" disabled={busy} aria-pressed={active.id === floor.id} onClick={() => {
            try { activateFloor(project.id, floor.id); goToFloor(floor.id) }
            catch { setError('Не удалось переключить этаж. Проверьте доступное место в браузере.') }
          }} className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${active.id === floor.id ? 'text-brand' : ''}`} title={floor.name}>{floor.name}</button>}
          <button type="button" disabled={busy} aria-label={`Переименовать этаж ${floor.name}`} title="Переименовать этаж"
            onClick={() => { setEditing(floor.id); setName(floor.name); setError('') }}
            className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-white hover:text-brand">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m16 3 5 5M4 16l-1 5 5-1L21 7a2.1 2.1 0 0 0-4-4L4 16Z" />
            </svg>
          </button>
        </li>)}
      </ul>
      <div className="mt-2 grid gap-1 border-t border-line pt-2">
        <button type="button" disabled={busy} onClick={() => {
          try { const floor = addFloor(project.id); goToFloor(floor.id) }
          catch { setError('Не удалось добавить этаж. Проверьте доступное место в браузере.') }
        }} className="rounded-lg px-3 py-2 text-left text-sm text-brand hover:bg-brand-soft disabled:opacity-40">+ Добавить этаж</button>
        <button type="button" disabled={busy || floors.length <= 1} title={floors.length <= 1 ? 'Нельзя удалить единственный этаж' : `Удалить этаж ${active.name}`} onClick={async () => {
          if (!window.confirm(`Удалить этаж «${active.name}» вместе с его чертежом, планом, метками и панорамами? Это действие нельзя отменить.`)) return
          setBusy(true)
          try { const result = await removeFloor(project.id, active.id); goToFloor(result.activeId, result.cleanupFailed) }
          catch { setError('Не удалось удалить этаж. Проверьте доступное место в браузере.'); setBusy(false) }
        }} className="rounded-lg px-3 py-2 text-left text-sm text-brand-hover enabled:hover:bg-brand-soft disabled:opacity-40">Удалить этаж</button>
      </div>
      {error && <p role="alert" className="px-2 py-2 text-xs text-brand-hover">{error}</p>}
    </div>}
  </div>
}
