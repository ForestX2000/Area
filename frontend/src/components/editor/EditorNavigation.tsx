import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjects } from '../../utils/useProjects'
import { getWorkspaces } from '../../utils/workspaceStorage'
import { getPoints } from '../../utils/pointStorage'
import FloorPicker from './FloorPicker'
import ShareDialog from '../ShareDialog'
import { floorStorageId, floorUrl, getFloor } from '../../utils/floorStorage'
import { api } from '../../utils/api'

export default function EditorNavigation({ projectId, mode = '2d', can3D, onModeChange, onBack }: {
  projectId: string; mode?: '2d' | '3d'; can3D?: boolean; onModeChange?: () => void; onBack?: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const projects = useProjects()
  const project = projects.find((project) => project.id === projectId)
  const floorId = project ? getFloor(project, params.get('floor')).id : 'default'
  const storageId = floorStorageId(projectId, floorId)
  const floorPath = (path: string) => floorUrl(path, floorId, params.has('floor'))
  const collection = getWorkspaces(projects, false)
  const workspace = collection.workspaces.find((item) => item.id === collection.activeId && item.nodes.some((node) => node.projectId === projectId))
    ?? collection.workspaces.find((item) => item.nodes.some((node) => node.projectId === projectId))
  const [hasPanorama, setHasPanorama] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    if (can3D !== undefined) return
    void Promise.all(getPoints(storageId).map((point) => api.fetchPanorama(storageId, point.id)))
      .then((files) => { if (!cancelled) setHasPanorama(files.some(Boolean)) })
      .catch(() => { if (!cancelled) setHasPanorama(false) })
    return () => { cancelled = true }
  }, [storageId, can3D])
  return <nav aria-label="Навигация редактора" className="flex w-full flex-wrap items-center justify-center gap-3 border-b border-line bg-surface px-3 py-3">
    {onBack ? <button type="button" onClick={onBack} aria-label="К 2D-карте" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-brand-soft">←</button>
      : <Link to={`/projects/${projectId}`} aria-label="Назад к проекту" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-brand-soft">←</Link>}
    <span className="max-w-60 truncate text-sm font-semibold text-ink" title={project?.name}>{project?.name ?? 'Проект'}</span>
    {mode === '3d' && onBack ? <button type="button" onClick={onBack} className="rounded-lg border border-brand-border bg-brand-soft px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white">2D-карта и панорамы</button>
      : <Link to={floorPath(`/projects/${projectId}/map?mode=2d`)} className="rounded-lg border border-brand-border bg-brand-soft px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white">2D-карта и панорамы</Link>}
    {workspace && <Link to={`/workspace/${workspace.id}`} className="max-w-48 truncate rounded-lg border border-brand-border bg-brand-soft px-3 py-2 text-sm text-brand">{workspace.name}</Link>}
    {project && <FloorPicker project={project} mode={mode} />}
    {project && <button type="button" onClick={() => setShareOpen(true)} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-brand-soft">Поделиться</button>}
    {shareOpen && project && <ShareDialog project={project} onClose={() => setShareOpen(false)} />}
    <div className="flex items-center gap-2 text-xs text-muted"><span>2D</span>
      <button type="button" role="switch" aria-label="Режим 3D" aria-checked={mode === '3d'} disabled={mode === '2d' && !(can3D ?? hasPanorama)}
        title={(can3D ?? hasPanorama) ? 'Переключить 2D / 3D' : 'Добавьте панораму на 2D-карте'}
        onClick={() => onModeChange ? onModeChange() : navigate(floorPath(`/projects/${projectId}/map?mode=${mode === '2d' ? '3d' : '2d'}`))}
        className={`relative h-6 w-11 rounded-full transition disabled:opacity-40 ${mode === '3d' ? 'bg-brand' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition ${mode === '3d' ? 'left-[22px]' : 'left-0.5'}`} />
      </button><span>3D</span></div>
    {location.state?.floorWarning && <p role="alert" className="w-full text-center text-xs text-brand-hover">{location.state.floorWarning}</p>}
  </nav>
}
