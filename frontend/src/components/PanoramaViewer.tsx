import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import 'pannellum/build/pannellum.css'
import EditorNavigation from './editor/EditorNavigation'
import { describeRoute, track } from '../utils/analytics'
import { getHotspots, saveHotspots, type PanoramaHotspot } from '../utils/hotspotStorage'

interface PanoramaViewerProps {
  imageUrl: string
  title: string
  pointId: string
  panoramas: { id: string; title: string }[]
  onSelectPanorama: (id: string) => void
  onClose: () => void
  projectId: string
  /** Верхняя панель вместо навигации редактора (например, в режиме просмотра для пользователей). */
  navigation?: ReactNode
  /** Разрешает ставить и менять метки внутри панорамы. */
  editable?: boolean
  /** Метки из другого источника (публичная ссылка) вместо локального хранилища. */
  initialHotspots?: PanoramaHotspot[]
}

export default function PanoramaViewer({ imageUrl, title, pointId, panoramas, onSelectPanorama, onClose, projectId, navigation, editable = false, initialHotspots }: PanoramaViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PannellumViewer | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [hfov, setHfov] = useState(100)
  const trackedRef = useRef({ projectId, title })
  const [hotspots, setHotspots] = useState<PanoramaHotspot[]>(() => initialHotspots ?? getHotspots(projectId, pointId))
  const [placing, setPlacing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [hotspotError, setHotspotError] = useState('')
  const addedRef = useRef<string[]>([])
  const pressRef = useRef<{ x: number; y: number } | null>(null)
  const activateRef = useRef<(id: string) => void>(() => {})

  useEffect(() => { trackedRef.current = { projectId, title } }, [projectId, title])

  useEffect(() => {
    const dialog = dialogRef.current!
    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let viewer: PannellumViewer | undefined
    let observer: ResizeObserver | undefined
    const onLoad = () => {
      if (cancelled) return
      setReady(true)
      // Считаем только панорамы, которые действительно открылись.
      const page = describeRoute(window.location.pathname, window.location.search)?.page ?? 'viewer'
      track({ type: 'panorama', page, projectId: trackedRef.current.projectId, mode: '3d', source: 'in-app', target: trackedRef.current.title })
    }
    const onError = () => {
      if (!cancelled) setError('Не удалось открыть панораму. Проверьте изображение и поддержку WebGL в браузере.')
    }
    const onZoom = () => { if (!cancelled && viewer) setHfov(viewer.getHfov()) }

    async function load() {
      try {
        // Pannellum 2.x does not report all image decoding failures itself.
        const image = new Image()
        image.src = imageUrl
        await Promise.all([import('pannellum'), image.decode()])
        image.removeAttribute('src')
        if (cancelled || !containerRef.current) return
        viewer = window.pannellum.viewer(containerRef.current, {
          type: 'equirectangular', panorama: imageUrl, autoLoad: true,
          hfov: 100, minHfov: 30, maxHfov: 120, showControls: false, escapeHTML: true,
          strings: {
            loadingLabel: 'Загружаем панораму…', loadButtonLabel: 'Открыть панораму',
            noPanoramaError: 'Изображение панорамы не задано.',
            fileAccessError: 'Не удалось прочитать изображение панорамы.',
            malformedURLError: 'Некорректный адрес изображения.',
            iOS8WebGLError: 'Браузер не поддерживает формат этого изображения.',
            genericWebGLError: 'Для просмотра 360° необходима поддержка WebGL.',
            textureSizeError: 'Изображение слишком большое для этого устройства.',
            unknownError: 'Не удалось отобразить панораму.',
          },
        })
        viewerRef.current = viewer
        viewer.on('load', onLoad).on('error', onError).on('zoomchange', onZoom)
        observer = new ResizeObserver(() => viewer?.resize())
        observer.observe(containerRef.current)
      } catch {
        onError()
      }
    }

    void load()
    return () => {
      cancelled = true
      observer?.disconnect()
      viewer?.off('load', onLoad).off('error', onError).off('zoomchange', onZoom)
      viewer?.destroy()
      viewerRef.current = null
      addedRef.current = []
    }
  }, [imageUrl])

  useEffect(() => {
    activateRef.current = (id) => {
      const hotspot = hotspots.find((item) => item.id === id)
      if (!hotspot) return
      if (editable) { setEditingId(id); setOpenId(null); return }
      if (hotspot.kind === 'scene' && hotspot.targetId && panoramas.some((item) => item.id === hotspot.targetId)) onSelectPanorama(hotspot.targetId)
      else setOpenId(id)
    }
  })

  // Pannellum хранит метки у себя; при каждом изменении пересоздаём их целиком.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !ready) return
    for (const id of addedRef.current) viewer.removeHotSpot(id)
    addedRef.current = hotspots.map((hotspot) => hotspot.id)
    for (const hotspot of hotspots) {
      viewer.addHotSpot({
        id: hotspot.id, pitch: hotspot.pitch, yaw: hotspot.yaw, type: hotspot.kind,
        cssClass: `area-hotspot area-hotspot-${hotspot.kind}${editingId === hotspot.id ? ' is-editing' : ''}`,
        createTooltipFunc: (div) => {
          div.setAttribute('role', 'button')
          div.tabIndex = 0
          div.setAttribute('aria-label', `Метка в панораме: ${hotspot.title}`)
          div.dataset.hotspotId = hotspot.id
          const icon = document.createElement('span')
          icon.className = 'area-hotspot-icon'
          icon.textContent = hotspot.kind === 'scene' ? '➜' : 'i'
          const label = document.createElement('span')
          label.className = 'area-hotspot-label'
          label.textContent = hotspot.title
          div.append(icon, label)
          div.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateRef.current(hotspot.id) }
          })
        },
        clickHandlerFunc: () => activateRef.current(hotspot.id),
      })
    }
  }, [hotspots, ready, editingId])

  function persist(next: PanoramaHotspot[]) {
    setHotspots(next)
    try {
      saveHotspots(projectId, pointId, next)
      setHotspotError('')
    } catch {
      setHotspotError('Не удалось сохранить метки: мало места в браузере.')
    }
  }

  function updateHotspot(id: string, changes: Partial<PanoramaHotspot>) {
    persist(hotspots.map((hotspot) => hotspot.id === id ? { ...hotspot, ...changes } : hotspot))
  }

  const buttonClass = 'rounded-lg border border-line bg-surface px-4 py-2 text-sm text-body transition enabled:hover:bg-brand-soft enabled:hover:text-brand disabled:opacity-40'
  const fieldClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body'
  const editing = editable ? hotspots.find((hotspot) => hotspot.id === editingId) : undefined
  const opened = hotspots.find((hotspot) => hotspot.id === openId)
  const targets = panoramas.filter((item) => item.id !== pointId)

  function changeZoom(delta: number) {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.stopMovement()
    viewer.setHfov(Math.min(120, Math.max(30, viewer.getHfov() + delta)), false)
  }

  function resetView() {
    viewerRef.current?.stopMovement()
    viewerRef.current?.lookAt(0, 0, 100, false)
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="panorama-title"
      onCancel={(event) => {
        event.preventDefault()
        if (placing) setPlacing(false)
        else if (editingId) setEditingId(null)
        else if (openId) setOpenId(null)
        else onClose()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-page p-0 text-body">
      <div className="flex h-full flex-col">
        {navigation ?? <EditorNavigation projectId={projectId} mode="3d" can3D onModeChange={onClose} onBack={onClose} />}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-brand">3D · Панорама 360°</p>
            <h2 id="panorama-title" className="break-words font-semibold text-ink">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {panoramas.length > 1 && (
              <select aria-label="Панорама точки" value={pointId} onChange={(event) => onSelectPanorama(event.target.value)}
                className="max-w-56 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                {panoramas.map((point) => <option key={point.id} value={point.id}>{point.title}</option>)}
              </select>
            )}
          </div>
        </header>

        <div className={`relative min-h-0 flex-1 bg-black ${placing ? 'area-placing' : ''}`}
          onPointerDown={(event) => { pressRef.current = placing && event.button === 0 ? { x: event.clientX, y: event.clientY } : null }}
          onPointerUp={(event) => {
            const press = pressRef.current
            pressRef.current = null
            const viewer = viewerRef.current
            if (!placing || !press || !viewer || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) return
            if ((event.target as Element).closest('.pnlm-hotspot-base, [data-hotspot-panel]')) return
            const [pitch, yaw] = viewer.mouseEventToCoords(event.nativeEvent)
            const created: PanoramaHotspot = { id: crypto.randomUUID(), pitch, yaw, kind: 'info', title: `Метка ${hotspots.length + 1}` }
            persist([...hotspots, created])
            setEditingId(created.id)
            setPlacing(false)
          }}>
          <div ref={containerRef} aria-label={`Панорама 360°: ${title}`} role="application"
            data-viewer-status={error ? 'error' : ready ? 'ready' : 'loading'} data-hotspot-count={hotspots.length} className="h-full w-full" />
          {error ? (
            <div role="alert" className="absolute inset-0 flex items-center justify-center bg-page p-6 text-center">
              <p className="max-w-md">{error} Вернитесь к 2D-карте, чтобы заменить файл.</p>
            </div>
          ) : !ready && (
            <p role="status" className="pointer-events-none absolute bottom-4 left-0 w-full text-center text-sm text-white">Загружаем панораму…</p>
          )}
          {placing && <p role="status" className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/75 px-4 py-2 text-sm text-white">
            Кликни по панораме, чтобы поставить метку · Esc — отмена
          </p>}

          {editing && <section data-hotspot-panel aria-label="Метка в панораме" onPointerDown={(event) => event.stopPropagation()}
            className="absolute right-3 top-3 z-10 grid w-72 max-w-[calc(100%-24px)] gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Метка в панораме</h3>
              <button type="button" aria-label="Закрыть настройки метки" onClick={() => setEditingId(null)} className="rounded px-1.5 text-lg leading-none text-muted hover:text-brand">×</button>
            </div>
            <label className="grid gap-1 text-xs text-muted">Название
              <input aria-label="Название метки в панораме" value={editing.title} maxLength={80} onChange={(event) => updateHotspot(editing.id, { title: event.target.value })} className={fieldClass} />
            </label>
            <label className="grid gap-1 text-xs text-muted">Тип
              <select aria-label="Тип метки в панораме" value={editing.kind} onChange={(event) => updateHotspot(editing.id, { kind: event.target.value as PanoramaHotspot['kind'] })} className={fieldClass}>
                <option value="info">Информация</option>
                <option value="scene">Переход в другую панораму</option>
              </select>
            </label>
            {editing.kind === 'info' ? (
              <label className="grid gap-1 text-xs text-muted">Описание
                <textarea aria-label="Описание метки в панораме" value={editing.description ?? ''} maxLength={1000} rows={3}
                  onChange={(event) => updateHotspot(editing.id, { description: event.target.value })} className={fieldClass} />
              </label>
            ) : targets.length ? (
              <label className="grid gap-1 text-xs text-muted">Куда ведёт
                <select aria-label="Переход к панораме" value={editing.targetId ?? ''} onChange={(event) => updateHotspot(editing.id, { targetId: event.target.value || undefined })} className={fieldClass}>
                  <option value="">Выберите панораму</option>
                  {targets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </label>
            ) : <p className="text-xs leading-5 text-muted">Для перехода нужна другая панорама на этом этаже.</p>}
            <div className="flex flex-wrap gap-2">
              {editing.kind === 'scene' && editing.targetId && targets.some((item) => item.id === editing.targetId) && (
                <button type="button" onClick={() => onSelectPanorama(editing.targetId!)} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-brand-soft">Перейти</button>
              )}
              <button type="button" onClick={() => { persist(hotspots.filter((hotspot) => hotspot.id !== editing.id)); setEditingId(null) }}
                className="rounded-lg border border-brand-border px-3 py-1.5 text-sm text-brand-hover hover:bg-brand-soft">Удалить метку</button>
              <button type="button" onClick={() => setEditingId(null)} className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover">Готово</button>
            </div>
            {hotspotError && <p role="alert" className="text-xs text-brand-hover">{hotspotError}</p>}
          </section>}

          {opened && !editing && <section data-hotspot-panel aria-label="Описание метки" onPointerDown={(event) => event.stopPropagation()}
            className="absolute bottom-4 left-4 z-10 w-80 max-w-[calc(100%-32px)] rounded-2xl border border-line bg-surface p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="break-words font-semibold text-ink">{opened.title}</h3>
              <button type="button" aria-label="Закрыть описание метки" onClick={() => setOpenId(null)} className="rounded px-1.5 text-lg leading-none text-muted hover:text-brand">×</button>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-muted">{opened.description || (opened.kind === 'scene' ? 'Переход пока не настроен.' : 'Описание не добавлено.')}</p>
          </section>}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-line bg-surface p-3">
          {editable && <button type="button" aria-pressed={placing} disabled={!ready || !!error}
            onClick={() => { setPlacing((value) => !value); setEditingId(null) }}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${placing ? 'border-brand bg-brand text-white' : 'border-brand-border text-brand enabled:hover:bg-brand-soft'}`}>
            {placing ? 'Отменить установку' : '+ Метка в панораме'}
          </button>}
          {hotspots.length > 0 && <span className="text-xs text-muted">Меток: {hotspots.length}</span>}
          <button type="button" aria-label="Уменьшить масштаб панорамы" disabled={!ready || !!error}
            onClick={() => changeZoom(10)} className={buttonClass}>−</button>
          <output aria-label="Масштаб панорамы" data-hfov={hfov} className="min-w-16 text-center text-sm">{Math.round(10000 / hfov)}%</output>
          <button type="button" aria-label="Увеличить масштаб панорамы" disabled={!ready || !!error}
            onClick={() => changeZoom(-10)} className={buttonClass}>+</button>
          <button type="button" disabled={!ready || !!error} onClick={resetView} className={buttonClass}>Сбросить вид</button>
          <span className="text-xs text-muted">Перетаскивание — осмотр · колесо / жест двумя пальцами — масштаб</span>
        </footer>
      </div>
    </dialog>
  )
}
