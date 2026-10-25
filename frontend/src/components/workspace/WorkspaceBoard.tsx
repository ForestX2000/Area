import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../../types/project'
import type { Workspace, WorkspaceContent, WorkspaceNode } from '../../types/workspace'
import { cleanGroups } from '../../utils/workspaceStorage'
import ProjectPreview from '../ProjectPreview'

const WIDTH = 280
const HEIGHT = 272
const content = ({ nodes, groups }: Workspace): WorkspaceContent => ({ nodes, groups })
const limitZoom = (zoom: number) => Math.min(2, Math.max(0.25, zoom))

type Gesture =
  | { kind: 'pan'; pointerId: number; x: number; y: number; view: Workspace['view'] }
  | { kind: 'move'; pointerId: number; x: number; y: number; nodes: WorkspaceNode[]; ids: string[]; zoom: number }
  | { kind: 'frame'; pointerId: number; x: number; y: number; previous: string[]; additive: boolean }

function bounds(nodes: WorkspaceNode[]) {
  const left = Math.min(...nodes.map((node) => node.x)) - 24
  const top = Math.min(...nodes.map((node) => node.y)) - 48
  const right = Math.max(...nodes.map((node) => node.x + WIDTH)) + 24
  const bottom = Math.max(...nodes.map((node) => node.y + HEIGHT)) + 24
  return { left, top, width: right - left, height: bottom - top }
}

export default function WorkspaceBoard({ workspace, projects, onChange }: {
  workspace: Workspace; projects: Project[]; onChange: (workspace: Workspace) => void
}) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const latest = useRef(workspace)
  const changeRef = useRef(onChange)
  const gestureRef = useRef<Gesture | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [drafts, setDrafts] = useState<WorkspaceNode[] | null>(null)
  const [frame, setFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [past, setPast] = useState<WorkspaceContent[]>([])
  const [future, setFuture] = useState<WorkspaceContent[]>([])
  const [snap, setSnap] = useState(true)
  const [zoomInput, setZoomInput] = useState<string | null>(null)

  useLayoutEffect(() => { latest.current = workspace; changeRef.current = onChange }, [workspace, onChange])
  useLayoutEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      if (gestureRef.current) return
      const view = latest.current.view
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1
      let next: Workspace['view']
      if (event.ctrlKey) {
        const box = surface.getBoundingClientRect()
        const x = event.clientX - box.left
        const y = event.clientY - box.top
        const zoom = limitZoom(view.zoom * Math.exp(-event.deltaY * unit * 0.002))
        next = { zoom, x: x - (x - view.x) * zoom / view.zoom, y: y - (y - view.y) * zoom / view.zoom }
      } else next = { ...view, x: view.x - event.deltaX * unit, y: view.y - event.deltaY * unit }
      latest.current = { ...latest.current, view: next }
      changeRef.current(latest.current)
    }
    surface.addEventListener('wheel', wheel, { passive: false })
    return () => surface.removeEventListener('wheel', wheel)
  }, [])

  function publish(next: Workspace) {
    latest.current = next
    changeRef.current(next)
  }

  function commit(next: WorkspaceContent, view = latest.current.view) {
    const previous = content(latest.current)
    if (JSON.stringify(previous) === JSON.stringify(next)) return
    setPast((items) => [...items.slice(-99), previous])
    setFuture([])
    publish({ ...latest.current, ...next, view })
  }

  function undo() {
    const previous = past.at(-1)
    if (!previous) return
    setPast(past.slice(0, -1))
    setFuture([...future, content(latest.current)])
    publish({ ...latest.current, ...previous })
    setSelected([])
  }

  function redo() {
    const next = future.at(-1)
    if (!next) return
    setPast([...past.slice(-99), content(latest.current)])
    setFuture(future.slice(0, -1))
    publish({ ...latest.current, ...next })
    setSelected([])
  }

  function expand(ids: string[]) {
    const all = new Set(ids)
    for (const group of latest.current.groups) if (group.projectIds.some((id) => all.has(id))) group.projectIds.forEach((id) => all.add(id))
    return [...all]
  }

  function toggle(id: string) {
    const ids = expand([id])
    setSelected(ids.every((member) => selected.includes(member)) ? selected.filter((member) => !ids.includes(member)) : [...new Set([...selected, ...ids])])
  }

  function combine() {
    if (selected.length < 2) return
    commit({ nodes: workspace.nodes, groups: [
      ...workspace.groups.filter((group) => !group.projectIds.some((id) => selected.includes(id))),
      { id: crypto.randomUUID(), name: `Контейнер ${workspace.groups.length + 1}`, projectIds: selected },
    ] })
  }

  function split() {
    commit({ nodes: workspace.nodes, groups: workspace.groups.filter((group) => !group.projectIds.some((id) => selected.includes(id))) })
    setSelected([])
  }

  function remove() {
    const nodes = workspace.nodes.filter((node) => !selected.includes(node.projectId))
    commit({ nodes, groups: cleanGroups(workspace.groups, nodes) })
    setSelected([])
  }

  function fittedView(nodes: WorkspaceNode[]) {
    const surface = surfaceRef.current
    if (!surface || nodes.length === 0) return { x: 0, y: 0, zoom: 1 }
    const box = bounds(nodes)
    const zoom = limitZoom(Math.min((surface.clientWidth - 40) / box.width, (surface.clientHeight - 40) / box.height, 1))
    return { zoom, x: (surface.clientWidth - box.width * zoom) / 2 - box.left * zoom, y: (surface.clientHeight - box.height * zoom) / 2 - box.top * zoom }
  }

  function add(ids: string[]) {
    const missing = ids.filter((id) => !workspace.nodes.some((node) => node.projectId === id))
    const top = workspace.nodes.length ? Math.max(...workspace.nodes.map((node) => node.y)) + 320 : 80
    const additions = missing.map((projectId, index) => ({ projectId, x: 40 + index % 3 * 320, y: top + Math.floor(index / 3) * 320 }))
    const nodes = [...workspace.nodes, ...additions]
    commit({ nodes, groups: workspace.groups }, fittedView(nodes))
    setSelected(additions.map((node) => node.projectId))
  }

  function zoomTo(value: number) {
    const view = latest.current.view
    const x = (surfaceRef.current?.clientWidth ?? 0) / 2
    const y = (surfaceRef.current?.clientHeight ?? 0) / 2
    const zoom = limitZoom(value)
    publish({ ...latest.current, view: { zoom, x: x - (x - view.x) * zoom / view.zoom, y: y - (y - view.y) * zoom / view.zoom } })
  }

  function point(event: PointerEvent) {
    const box = surfaceRef.current!.getBoundingClientRect()
    const view = latest.current.view
    return { x: (event.clientX - box.left - view.x) / view.zoom, y: (event.clientY - box.top - view.y) / view.zoom }
  }

  function cancel() {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (gesture?.kind === 'frame') setSelected(gesture.previous)
    setDrafts(null)
    setFrame(null)
    if (gesture && surfaceRef.current?.hasPointerCapture(gesture.pointerId)) surfaceRef.current.releasePointerCapture(gesture.pointerId)
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (gestureRef.current || (event.button !== 0 && event.button !== 1)) return
    const target = event.target as Element
    const groupHandle = target.closest('[data-drag-group]')
    if (event.button === 0 && !groupHandle && target.closest('a, button, input, select, textarea')) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    const nodeId = target.closest('[data-project-id]')?.getAttribute('data-project-id')
    const group = groupHandle ? workspace.groups.find((group) => group.id === groupHandle.getAttribute('data-drag-group')) : undefined
    if (event.button === 1 || (event.pointerType === 'touch' && !nodeId && !group)) {
      gestureRef.current = { kind: 'pan', pointerId: event.pointerId, x: event.clientX, y: event.clientY, view: workspace.view }
    } else if (nodeId || group) {
      const id = nodeId ?? group!.projectIds[0]
      if (event.shiftKey || event.ctrlKey || event.metaKey) { toggle(id); return }
      const ids = selected.includes(id) ? selected : expand([id])
      setSelected(ids)
      gestureRef.current = { kind: 'move', pointerId: event.pointerId, x: event.clientX, y: event.clientY, nodes: workspace.nodes, ids, zoom: workspace.view.zoom }
    } else {
      const start = point(event)
      const additive = event.shiftKey || event.ctrlKey || event.metaKey
      gestureRef.current = { kind: 'frame', pointerId: event.pointerId, ...start, previous: selected, additive }
      if (!additive) setSelected([])
      setFrame({ ...start, width: 0, height: 0 })
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function movedNodes(event: PointerEvent, gesture: Extract<Gesture, { kind: 'move' }>) {
    let dx = (event.clientX - gesture.x) / gesture.zoom
    let dy = (event.clientY - gesture.y) / gesture.zoom
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 3) return gesture.nodes
    const anchor = gesture.nodes.find((node) => gesture.ids.includes(node.projectId))!
    if (snap) {
      dx = Math.round((anchor.x + dx) / 20) * 20 - anchor.x
      dy = Math.round((anchor.y + dy) / 20) * 20 - anchor.y
    }
    return gesture.nodes.map((node) => gesture.ids.includes(node.projectId) ? { ...node, x: node.x + dx, y: node.y + dy } : node)
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.kind === 'pan') {
      publish({ ...latest.current, view: { ...gesture.view, x: gesture.view.x + event.clientX - gesture.x, y: gesture.view.y + event.clientY - gesture.y } })
    } else if (gesture.kind === 'move') setDrafts(movedNodes(event, gesture))
    else {
      const end = point(event)
      const box = { x: Math.min(gesture.x, end.x), y: Math.min(gesture.y, end.y), width: Math.abs(end.x - gesture.x), height: Math.abs(end.y - gesture.y) }
      setFrame(box)
      const ids = workspace.nodes.filter((node) => node.x < box.x + box.width && node.x + WIDTH > box.x && node.y < box.y + box.height && node.y + HEIGHT > box.y).map((node) => node.projectId)
      setSelected(expand([...ids, ...(gesture.additive ? gesture.previous : [])]))
    }
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.kind === 'move') commit({ nodes: movedNodes(event, gesture), groups: workspace.groups })
    gestureRef.current = null
    setDrafts(null)
    setFrame(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function keyboard(event: KeyboardEvent) {
    if ((event.target as Element).closest('input:not([type="checkbox"]), textarea, select, [contenteditable]:not([contenteditable="false"])') || document.querySelector('dialog[open]')) return
    if (event.key === 'Escape') { cancel(); event.preventDefault(); return }
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      if (event.code === 'KeyA' || event.key.toLowerCase() === 'a') {
        event.preventDefault()
        cancel()
        setSelected(workspace.nodes.map((node) => node.projectId))
      } else if (event.code === 'KeyZ' || event.code === 'KeyY') {
        event.preventDefault()
        if (gestureRef.current) { if (event.code === 'KeyZ') cancel(); return }
        if (event.code === 'KeyY' || event.shiftKey) redo()
        else undo()
      }
    } else if (event.key === 'Delete' && selected.length > 0 && !gestureRef.current) {
      event.preventDefault()
      remove()
    }
  }

  const nodes = drafts ?? workspace.nodes
  const selectedGroups = workspace.groups.filter((group) => group.projectIds.some((id) => selected.includes(id)))
  const singleGroup = selectedGroups.length === 1 && selectedGroups[0].projectIds.length === selected.length ? selectedGroups[0] : undefined
  const buttonClass = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm enabled:hover:bg-surface-muted disabled:opacity-40'

  return (
    <div onKeyDown={keyboard} className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <button type="button" onClick={combine} disabled={selected.length < 2 || !!singleGroup} className="rounded-lg bg-brand px-3 py-2 text-sm text-white enabled:hover:bg-brand-hover disabled:opacity-40">Объединить</button>
        <button type="button" onClick={split} disabled={selectedGroups.length === 0} className={buttonClass}>Разделить</button>
        <button type="button" onClick={undo} disabled={past.length === 0} className={buttonClass} title="Ctrl + Z">Отменить</button>
        <button type="button" onClick={redo} disabled={future.length === 0} className={buttonClass} title="Ctrl + Y">Вернуть</button>
        <button type="button" onClick={() => publish({ ...workspace, view: fittedView(workspace.nodes) })} disabled={nodes.length === 0} className={buttonClass}>Вписать всё</button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" aria-label="Уменьшить масштаб Workspace" onClick={() => zoomTo(workspace.view.zoom - 0.25)} className={buttonClass}>−</button>
          <label className="flex items-center gap-1 text-sm">
            <input type="number" aria-label="Масштаб Workspace в процентах" min="25" max="200" value={zoomInput ?? Math.round(workspace.view.zoom * 100)}
              onChange={(event) => setZoomInput(event.target.value)}
              onBlur={() => { if (zoomInput?.trim() && Number.isFinite(Number(zoomInput))) zoomTo(Number(zoomInput) / 100); setZoomInput(null) }}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setZoomInput(null) }}
              className="w-20 rounded-lg border border-line bg-surface-muted px-2 py-2" />%
          </label>
          <button type="button" aria-label="Увеличить масштаб Workspace" onClick={() => zoomTo(workspace.view.zoom + 0.25)} className={buttonClass}>+</button>
        </div>
      </div>
      <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
        <div ref={surfaceRef} role="application" aria-label="Холст Workspace" tabIndex={0}
          data-zoom={workspace.view.zoom} data-pan-x={workspace.view.x} data-pan-y={workspace.view.y}
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={cancel} onLostPointerCapture={() => { if (gestureRef.current) cancel() }}
          onAuxClick={(event) => { if (event.button === 1) event.preventDefault() }}
          className="relative h-[65dvh] min-h-[420px] overflow-hidden bg-page outline-none touch-none md:h-[calc(100dvh-24rem)]"
          style={{ backgroundImage: 'linear-gradient(var(--ttk-grid-minor) 1px, transparent 1px), linear-gradient(90deg, var(--ttk-grid-minor) 1px, transparent 1px)',
            backgroundSize: `${20 * workspace.view.zoom}px ${20 * workspace.view.zoom}px`, backgroundPosition: `${workspace.view.x}px ${workspace.view.y}px` }}>
          <div data-workspace-content className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${workspace.view.x}px, ${workspace.view.y}px) scale(${workspace.view.zoom})` }}>
            {workspace.groups.map((group) => {
              const members = nodes.filter((node) => group.projectIds.includes(node.projectId))
              const box = bounds(members)
              return (
                <div key={group.id} data-workspace-group={group.id} aria-label={`Контейнер: ${group.name}`}
                  className={`pointer-events-none absolute rounded-2xl border-2 border-dashed ${group.projectIds.every((id) => selected.includes(id)) ? 'border-brand bg-brand-soft/60' : 'border-line-strong bg-surface/50'}`}
                  style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
                  <button type="button" data-drag-group={group.id} onClick={() => setSelected(group.projectIds)}
                    className="pointer-events-auto absolute left-3 top-2 max-w-[calc(100%_-_1.5rem)] cursor-grab truncate rounded-md px-2 text-sm font-medium text-body">
                    {group.name} · {group.projectIds.length} карты
                  </button>
                </div>
              )
            })}
            {nodes.map((node) => {
              const project = projects.find((project) => project.id === node.projectId)!
              return (
                <article key={node.projectId} data-project-id={node.projectId} data-selected={selected.includes(node.projectId) || undefined}
                  aria-label={`Карта: ${project.name}`}
                  className={`absolute overflow-hidden rounded-xl border bg-surface shadow-sm ${selected.includes(node.projectId) ? 'border-brand ring-2 ring-brand-border' : 'border-line-strong'}`}
                  style={{ left: node.x, top: node.y, width: WIDTH, height: HEIGHT, zIndex: selected.includes(node.projectId) ? 2 : 1 }}>
                  <div className="flex h-12 cursor-grab items-center gap-2 border-b border-line px-3 select-none">
                    <input type="checkbox" aria-label={`Выбрать карту: ${project.name}`} checked={selected.includes(node.projectId)} onChange={() => toggle(node.projectId)} />
                    <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={project.name}>{project.name}</h2>
                    <span aria-hidden="true" className="text-muted">⠿</span>
                  </div>
                  <div className="pointer-events-none"><ProjectPreview projectId={project.id} name={project.name} drawings={project.drawings} mode="map" /></div>
                  <div className="flex h-12 items-center justify-between border-t border-line px-3 text-sm">
                    <Link to={`/projects/${project.id}/map?mode=2d`} className="text-brand hover:text-brand-hover">Открыть 2D-карту</Link>
                    <Link to={`/projects/${project.id}/editor`} className="text-muted hover:text-brand">Редактор</Link>
                  </div>
                </article>
              )
            })}
            {frame && <div data-workspace-selection-frame className="pointer-events-none absolute z-10 border border-brand bg-brand/10"
              style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }} />}
          </div>
          {nodes.length === 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="text-lg font-semibold text-ink">Добавьте карты из списка «Все карты».</p>
          </div>}
        </div>
        <aside className="max-h-[65dvh] overflow-y-auto border-t border-line bg-surface p-4 md:max-h-[max(420px,calc(100dvh-24rem))] md:border-t-0 md:border-l">
          <p role="status" className="text-sm font-semibold text-ink">Выделено карт: {selected.length}</p>
          <p className="mt-2 text-xs leading-5 text-muted">Для выбора нескольких карт, используйте выделение области или сочетание Shift + клик.</p>
          {singleGroup && <label key={singleGroup.id + singleGroup.name} className="mt-4 grid gap-1 text-xs text-muted">Название контейнера
            <input aria-label="Название контейнера" defaultValue={singleGroup.name} maxLength={120}
              onBlur={(event) => {
                const name = event.target.value.trim()
                if (name) commit({ nodes: workspace.nodes, groups: workspace.groups.map((group) => group.id === singleGroup.id ? { ...group, name } : group) })
                else event.target.value = singleGroup.name
              }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-body" />
          </label>}
          <button type="button" onClick={remove} disabled={selected.length === 0} className={`${buttonClass} mt-3 w-full`} title="Delete">Убрать из Workspace</button>
          <p className="mt-2 text-xs text-muted">Исходные карты сохраняются в проектах.</p>
          <label className="mt-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={snap} onChange={(event) => setSnap(event.target.checked)} />Привязка к сетке</label>
          <div className="mt-5 border-t border-line pt-4">
            <h2 className="text-sm font-semibold text-ink">Все карты · {projects.length}</h2>
            <button type="button" disabled={workspace.nodes.length === projects.length} onClick={() => add(projects.map((project) => project.id))} className={`${buttonClass} my-3 w-full`}>Добавить все карты</button>
            {projects.length === 0 && <Link to="/" className="text-sm text-brand">Создать проект →</Link>}
            <ul className="space-y-2">
              {projects.map((project) => {
                const node = workspace.nodes.find((node) => node.projectId === project.id)
                return <li key={project.id} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
                  <span className="min-w-0 truncate" title={project.name}>{project.name}</span>
                  {node ? <button type="button" aria-label={`Показать карту: ${project.name}`} className="shrink-0 px-2 py-1 text-brand"
                    onClick={() => {
                      setSelected(expand([project.id]))
                      const surface = surfaceRef.current!
                      publish({ ...workspace, view: { ...workspace.view, x: surface.clientWidth / 2 - (node.x + WIDTH / 2) * workspace.view.zoom,
                        y: surface.clientHeight / 2 - (node.y + HEIGHT / 2) * workspace.view.zoom } })
                    }}>На холсте</button>
                    : <button type="button" aria-label={`Добавить карту: ${project.name}`} onClick={() => add([project.id])} className="shrink-0 rounded-md bg-brand-soft px-2 py-1 text-brand">+</button>}
                </li>
              })}
            </ul>
          </div>
        </aside>
      </div>
      <p className="border-t border-line px-4 py-3 text-xs leading-5 text-muted">Перетаскивание за заголовок — перемещение карты · колесико / два пальца — перемещение холста · Ctrl + колесо — масштаб · Ctrl + Z / Ctrl + Y — отмена / возврат · Delete — убрать карту из Workspace</p>
    </div>
  )
}
