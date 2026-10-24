import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DrawingPlan from '../components/DrawingPlan'
import PanoramaViewer from '../components/PanoramaViewer'
import type { DrawingObject } from '../types/drawing'
import type { MapPoint } from '../types/mapPoint'
import { floorStorageId, getFloor, getFloors } from '../utils/floorStorage'
import { getPoints } from '../utils/pointStorage'
import { api } from '../utils/api'
import { floorPanoramas, type PanoramaEntry } from '../utils/objectPanoramas'
import { useObjectUrl } from '../utils/useObjectUrl'
import { useProjects } from '../utils/useProjects'

type Selection = { kind: 'point'; point: MapPoint } | { kind: 'marker'; object: DrawingObject } | null

const STATUS_LABELS = { ready: 'Готово', progress: 'В работе', blocked: 'Недоступно' } as const

function ModeSwitch({ mode, disabled, onToggle }: { mode: '2d' | '3d'; disabled?: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>2D</span>
      <button type="button" role="switch" aria-label="Режим 3D" aria-checked={mode === '3d'} disabled={disabled}
        title={disabled ? 'Для этого этажа нет панорам' : 'Переключить 2D / 3D'} onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition disabled:opacity-40 ${mode === '3d' ? 'bg-brand' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition ${mode === '3d' ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      <span>3D</span>
    </div>
  )
}

/** Просмотр объекта без редактирования: план, точки и метки в 2D, панорамы 360° в 3D. */
export default function ObjectViewerPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [params] = useSearchParams()
  const project = useProjects().find((item) => item.id === projectId)
  const floorId = project ? getFloor(project, params.get('floor')).id : 'default'
  // Смена объекта или этажа начинает просмотр с чистого состояния.
  return <ObjectViewer key={`${projectId}:${floorId}`} />
}

function ObjectViewer() {
  const { projectId } = useParams<{ projectId: string }>()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const projects = useProjects()
  const project = projects.find((item) => item.id === projectId)
  // Просмотр не меняет активный этаж проекта: этаж выбирается только адресом.
  const floor = project ? getFloor(project, params.get('floor')) : null
  const floors = project ? getFloors(project) : []
  const floorId = floor?.id ?? 'default'
  const storageId = projectId ? floorStorageId(projectId, floorId) : ''
  const mode = params.get('mode') === '3d' ? '3d' : '2d'

  const [planUrl, replacePlan] = useObjectUrl()
  const [points] = useState<MapPoint[]>(() => getPoints(storageId))
  const [panoramas, setPanoramas] = useState<PanoramaEntry[] | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [requestedId, setRequestedId] = useState<string | null>(null)
  const [viewerUrl, replaceViewerUrl] = useObjectUrl()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!project) return
    let cancelled = false
    api.fetchMapImage(storageId)
      .then((file) => { if (!cancelled) replacePlan(file) })
      .catch(() => { if (!cancelled) replacePlan() })
    floorPanoramas(project, floorId)
      .then((entries) => { if (!cancelled) setPanoramas(entries) })
      .catch(() => { if (!cancelled) setPanoramas([]) })
    return () => { cancelled = true }
  }, [project, floorId, storageId, replacePlan])

  const activeId = mode === '3d' && panoramas?.length
    ? panoramas.some((entry) => entry.id === requestedId) ? requestedId! : panoramas[0].id
    : null
  const active = panoramas?.find((entry) => entry.id === activeId) ?? null

  useEffect(() => {
    if (!activeId) {
      replaceViewerUrl()
      return
    }
    let cancelled = false
    replaceViewerUrl()
    api.fetchPanorama(storageId, activeId)
      .then((file) => {
        if (cancelled) return
        if (file) replaceViewerUrl(file)
        else setError('Панорама не найдена.')
      })
      .catch(() => { if (!cancelled) setError('Не удалось открыть панораму.') })
    return () => { cancelled = true }
  }, [activeId, storageId, replaceViewerUrl])

  function setMode(next: '2d' | '3d', panoramaId?: string) {
    if (panoramaId) setRequestedId(panoramaId)
    setError('')
    const nextParams = new URLSearchParams(params)
    nextParams.set('mode', next)
    setParams(nextParams)
  }

  function selectFloor(id: string) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('floor', id)
    nextParams.set('mode', '2d')
    setParams(nextParams)
  }

  function activateMarker(object: DrawingObject) {
    if (object.markerKind === 'navigation' && object.panoramaKey && panoramas?.some((entry) => entry.id === object.id)) setMode('3d', object.id)
    else if (object.markerKind === 'navigation' && object.targetProjectId) navigate(`/objects/${object.targetProjectId}?mode=2d`, { state: { source: 'marker' } })
    else setSelection({ kind: 'marker', object })
  }

  if (!project || !floor) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-8 text-center">
        <h1 className="text-xl font-bold text-ink">Объект не найден</h1>
        <p className="mt-2 text-sm text-muted">Возможно, он был удалён или ссылка устарела.</p>
        <Link to="/" className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">К списку объектов</Link>
      </section>
    )
  }

  const drawings = floor.drawings ?? []
  const hasPlan = Boolean(planUrl) || drawings.length > 0
  const hasPanorama = (id: string) => panoramas?.some((entry) => entry.id === id) ?? false
  const targetName = (id: string) => projects.find((item) => item.id === id)?.name
  const noPanoramas = mode === '3d' && panoramas !== null && panoramas.length === 0

  const navigation = (
    <nav aria-label="Навигация просмотра" className="flex w-full flex-wrap items-center justify-center gap-3 border-b border-line bg-surface px-3 py-3">
      <button type="button" onClick={() => setMode('2d')} aria-label="К плану" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-brand-soft">←</button>
      <span className="max-w-60 truncate text-sm font-semibold text-ink" title={project.name}>{project.name}</span>
      {floors.length > 1 && <span className="text-sm text-muted">{floor.name}</span>}
      <ModeSwitch mode="3d" onToggle={() => setMode('2d')} />
    </nav>
  )

  return (
    <div className="mx-auto max-w-[1400px]">
      <nav aria-label="Навигация просмотра" className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <Link to="/" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-brand-soft">← Все объекты</Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-ink" title={project.name}>{project.name}</h1>
        {floors.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Этаж
            <select aria-label="Этаж" value={floor.id} onChange={(event) => selectFloor(event.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body">
              {floors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}
        <ModeSwitch mode={mode} disabled={!panoramas?.length} onToggle={() => setMode(mode === '3d' ? '2d' : '3d')} />
      </nav>

      {(error || noPanoramas) && (
        <p role="alert" className="mb-4 rounded-lg border border-brand-border bg-brand-soft px-4 py-3 text-sm text-brand-strong">
          {error || 'Для этого этажа панорамы ещё не добавлены — показан план.'}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="План" className="rounded-2xl border border-line bg-surface p-3 sm:p-5">
          {hasPlan ? (
            <div className="relative mx-auto w-full overflow-hidden rounded-lg bg-page">
              {planUrl
                ? <img src={planUrl} alt={`План: ${project.name}`} className="block h-auto w-full select-none" draggable={false} />
                : <DrawingPlan objects={drawings} label={`План: ${project.name}`} onMarkerActivate={activateMarker} />}
              {points.map((point, index) => (
                <button key={point.id} type="button" aria-label={`Точка: ${point.title}`}
                  aria-pressed={selection?.kind === 'point' && selection.point.id === point.id}
                  title={hasPanorama(point.id) ? `${point.title} · панорама 360°` : point.title}
                  onClick={() => setSelection({ kind: 'point', point })}
                  className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-xs font-bold text-white shadow-md transition hover:scale-110 ${hasPanorama(point.id) ? 'bg-brand' : 'bg-body'}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}>
                  {index + 1}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-page p-8 text-center">
              <p className="max-w-sm text-sm text-muted">План этого этажа ещё не добавлен.{panoramas?.length ? ' Панорамы можно открыть в режиме 3D.' : ''}</p>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section aria-label="Выбранный объект" className="rounded-2xl border border-line bg-surface p-5">
            {selection ? (() => {
              const id = selection.kind === 'point' ? selection.point.id : selection.object.id
              const title = selection.kind === 'point' ? selection.point.title : selection.object.label || 'Метка'
              const description = selection.kind === 'point' ? selection.point.description : selection.object.description
              return <>
                <h2 className="break-words font-semibold text-ink">{title}</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-muted">{description || 'Описание не добавлено.'}</p>
                {selection.kind === 'marker' && selection.object.markerKind === 'status' && (
                  <p className="mt-2 text-sm">Статус: {STATUS_LABELS[selection.object.status ?? 'ready']}</p>
                )}
                {hasPanorama(id) && (
                  <button type="button" onClick={() => setMode('3d', id)}
                    className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
                    Открыть панораму 360°
                  </button>
                )}
                {selection.kind === 'marker' && selection.object.targetProjectId && (
                  <button type="button" onClick={() => navigate(`/objects/${selection.object.targetProjectId}?mode=2d`, { state: { source: 'marker' } })}
                    className="mt-2 w-full rounded-lg border border-brand-border px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-soft">
                    Перейти: {targetName(selection.object.targetProjectId) || 'связанный объект'}
                  </button>
                )}
              </>
            })() : (
              <p className="text-sm text-muted">Выберите точку или метку на плане, чтобы увидеть описание и открыть панораму.</p>
            )}
          </section>

          <section aria-label="Панорамы этажа" className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">Панорамы 360°</h2>
            {panoramas === null ? <p className="text-sm text-muted">Загружаем…</p>
              : panoramas.length === 0 ? <p className="text-sm text-muted">Панорамы пока не добавлены.</p>
                : <ul className="space-y-1">
                  {panoramas.map((entry) => (
                    <li key={entry.id}>
                      <button type="button" onClick={() => setMode('3d', entry.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-soft hover:text-brand">
                        <span className="truncate">{entry.title}</span>
                        <span className="shrink-0 text-xs text-muted">{entry.kind === 'marker' ? 'метка' : 'точка'} · 360°</span>
                      </button>
                    </li>
                  ))}
                </ul>}
          </section>
        </aside>
      </div>

      {mode === '3d' && viewerUrl && active && (
        <PanoramaViewer key={viewerUrl} imageUrl={viewerUrl} title={active.title} projectId={project.id} pointId={active.id}
          panoramas={panoramas ?? []} onSelectPanorama={(id) => setRequestedId(id)} onClose={() => setMode('2d')} navigation={navigation} />
      )}
    </div>
  )
}
