import { useEffect, useRef, useState } from 'react'
import 'pannellum/build/pannellum.css'
import EditorNavigation from './editor/EditorNavigation'

interface PanoramaViewerProps {
  imageUrl: string
  title: string
  pointId: string
  panoramas: { id: string; title: string }[]
  onSelectPanorama: (id: string) => void
  onClose: () => void
  projectId: string
}

export default function PanoramaViewer({ imageUrl, title, pointId, panoramas, onSelectPanorama, onClose, projectId }: PanoramaViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PannellumViewer | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [hfov, setHfov] = useState(100)

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
    const onLoad = () => { if (!cancelled) setReady(true) }
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
    }
  }, [imageUrl])

  const buttonClass = 'rounded-lg border border-line bg-white px-4 py-2 text-sm text-body transition enabled:hover:bg-brand-soft enabled:hover:text-brand disabled:opacity-40'

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
      onCancel={(event) => { event.preventDefault(); onClose() }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-page p-0 text-body">
      <div className="flex h-full flex-col">
        <EditorNavigation projectId={projectId} mode="3d" can3D onModeChange={onClose} onBack={onClose} />
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-brand">3D · Панорама 360°</p>
            <h2 id="panorama-title" className="break-words font-semibold text-ink">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {panoramas.length > 1 && (
              <select aria-label="Панорама точки" value={pointId} onChange={(event) => onSelectPanorama(event.target.value)}
                className="max-w-56 rounded-lg border border-line bg-white px-3 py-2 text-sm">
                {panoramas.map((point) => <option key={point.id} value={point.id}>{point.title}</option>)}
              </select>
            )}
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-ink">
          <div ref={containerRef} aria-label={`Панорама 360°: ${title}`} role="application"
            data-viewer-status={error ? 'error' : ready ? 'ready' : 'loading'} className="h-full w-full" />
          {error ? (
            <div role="alert" className="absolute inset-0 flex items-center justify-center bg-page p-6 text-center">
              <p className="max-w-md">{error} Вернитесь к 2D-карте, чтобы заменить файл.</p>
            </div>
          ) : !ready && (
            <p role="status" className="pointer-events-none absolute bottom-4 left-0 w-full text-center text-sm text-white">Загружаем панораму…</p>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-line bg-white p-3">
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
