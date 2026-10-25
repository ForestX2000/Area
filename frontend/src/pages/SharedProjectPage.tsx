import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import DrawingPlan from '../components/DrawingPlan'
import PanoramaViewer from '../components/PanoramaViewer'
import ThemeToggle from '../components/ThemeToggle'
import RouteOverlay from '../components/route/RouteOverlay'
import RoutePanel from '../components/route/RoutePanel'
import type { DrawingObject } from '../types/drawing'
import type { MapPoint } from '../types/mapPoint'
import { findRoute } from '../utils/routing'
import { useRouteRequest } from '../utils/routeStore'
import { loadShare, ShareError, shareFileUrl, type SharedProject } from '../utils/share'

type Selection = { kind: 'point'; point: MapPoint } | { kind: 'marker'; object: DrawingObject } | null

const STATUS_LABELS = { ready: 'Готово', progress: 'В работе', blocked: 'Недоступно' } as const

/** Просмотр проекта по публичной ссылке: без входа, без редактирования. */
export default function SharedProjectPage() {
  const { shareId = '' } = useParams<{ shareId: string }>()
  const [project, setProject] = useState<SharedProject | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadShare(shareId)
      .then((snapshot) => { if (!cancelled) setProject(snapshot) })
      .catch((reason) => { if (!cancelled) setError(reason instanceof ShareError ? reason.message : 'Не удалось открыть проект.') })
    return () => { cancelled = true }
  }, [shareId])

  return (
    <div className="min-h-screen bg-page text-body">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="flex min-h-[64px] items-center gap-3 px-4 sm:px-6">
          <BrandLogo compact />
          <span className="ml-auto rounded-full border border-line px-3 py-1 text-xs text-muted">Только просмотр</span>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {error ? (
          <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-8 text-center">
            <h1 className="text-xl font-bold text-ink">Проект не открылся</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
          </section>
        ) : !project ? (
          <p role="status" className="py-16 text-center text-sm text-muted">Загружаем проект…</p>
        ) : <SharedViewer shareId={shareId} project={project} />}
      </main>
    </div>
  )
}

function SharedViewer({ shareId, project }: { shareId: string; project: SharedProject }) {
  const [floorId, setFloorId] = useState(project.floors[0]?.id ?? '')
  const [selection, setSelection] = useState<Selection>(null)
  const [panoramaId, setPanoramaId] = useState<string | null>(null)
  const [route, setRoute] = useRouteRequest(`share:${shareId}`)
  const floor = project.floors.find((item) => item.id === floorId) ?? project.floors[0]
  if (!floor) return <p className="text-center text-sm text-muted">В проекте нет этажей.</p>

  const panorama = floor.panoramas.find((entry) => entry.id === panoramaId)
  const hasPanorama = (id: string) => floor.panoramas.some((entry) => entry.id === id)
  const routeResult = route.from && route.to ? findRoute(project.floors, { from: route.from, to: route.to }) : null
  const hasPlan = Boolean(floor.plan) || floor.drawings.length > 0

  function selectFloor(id: string) {
    setFloorId(id)
    setSelection(null)
    setPanoramaId(null)
  }

  function activateMarker(object: DrawingObject) {
    if (object.markerKind === 'navigation' && hasPanorama(object.id)) setPanoramaId(object.id)
    else setSelection({ kind: 'marker', object })
  }

  const navigation = (
    <nav aria-label="Навигация просмотра" className="flex w-full flex-wrap items-center justify-center gap-3 border-b border-line bg-surface px-3 py-3">
      <button type="button" onClick={() => setPanoramaId(null)} aria-label="К плану" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-brand-soft">← К плану</button>
      <span className="max-w-60 truncate text-sm font-semibold text-ink">{project.name}</span>
      {project.floors.length > 1 && <span className="text-sm text-muted">Этаж {floor.name}</span>}
    </nav>
  )

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-ink" title={project.name}>{project.name}</h1>
          {project.description && <p className="truncate text-sm text-muted">{project.description}</p>}
        </div>
        {project.floors.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Этаж
            <select aria-label="Этаж" value={floor.id} onChange={(event) => selectFloor(event.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body">
              {project.floors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="План" className="rounded-2xl border border-line bg-surface p-3 sm:p-5">
          {hasPlan ? (
            <div className="relative mx-auto w-full overflow-hidden rounded-lg bg-page">
              {floor.plan
                ? <img src={shareFileUrl(shareId, floor.plan)} alt={`План: ${project.name}`} className="block h-auto w-full select-none" draggable={false} />
                : <DrawingPlan objects={floor.drawings} label={`План: ${project.name}`} onMarkerActivate={activateMarker}>
                  <RouteOverlay result={routeResult} floorId={floor.id} />
                </DrawingPlan>}
              {floor.points.map((point, index) => (
                <button key={point.id} type="button" aria-label={`Точка: ${point.title}`}
                  aria-pressed={selection?.kind === 'point' && selection.point.id === point.id}
                  onClick={() => setSelection({ kind: 'point', point })}
                  className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-xs font-bold text-white shadow-md transition hover:scale-110 ${hasPanorama(point.id) ? 'bg-brand' : 'bg-body'}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}>
                  {index + 1}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-page p-8 text-center">
              <p className="max-w-sm text-sm text-muted">План этого этажа не добавлен.{floor.panoramas.length ? ' Панорамы можно открыть в списке справа.' : ''}</p>
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
                  <button type="button" onClick={() => setPanoramaId(id)}
                    className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
                    Открыть панораму 360°
                  </button>
                )}
              </>
            })() : <p className="text-sm text-muted">Выберите точку или метку на плане, чтобы увидеть описание и открыть панораму.</p>}
          </section>

          {project.floors.some((item) => item.drawings.length > 0) && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <RoutePanel compact floors={project.floors} request={route} result={routeResult} currentFloorId={floor.id} onChange={setRoute} onGoToFloor={selectFloor} />
            </div>
          )}

          <section aria-label="Панорамы этажа" className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">Панорамы 360°</h2>
            {floor.panoramas.length === 0 ? <p className="text-sm text-muted">Панорамы пока не добавлены.</p>
              : <ul className="space-y-1">
                {floor.panoramas.map((entry) => (
                  <li key={entry.id}>
                    <button type="button" onClick={() => setPanoramaId(entry.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-soft hover:text-brand">
                      <span className="truncate">{entry.title}</span>
                      <span className="shrink-0 text-xs text-muted">360°</span>
                    </button>
                  </li>
                ))}
              </ul>}
          </section>
        </aside>
      </div>

      {panorama && (
        <PanoramaViewer key={panorama.id} imageUrl={shareFileUrl(shareId, panorama.file)} title={panorama.title}
          projectId={`share:${shareId}`} pointId={panorama.id} initialHotspots={floor.hotspots[panorama.id] ?? []}
          panoramas={floor.panoramas} onSelectPanorama={setPanoramaId} onClose={() => setPanoramaId(null)} navigation={navigation} />
      )}
    </>
  )
}
