<<<<<<< Updated upstream

import { useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
=======
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import 'pannellum/build/pannellum.css'
import EditorNavigation from './editor/EditorNavigation'
import { describeRoute, track } from '../utils/analytics'
>>>>>>> Stashed changes

interface PanoramaViewerProps {
  imageUrl: string
  title: string
<<<<<<< Updated upstream
  onClose: () => void
}

export default function PanoramaViewer({
  imageUrl,
  title,
  onClose,
}: PanoramaViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const dragStart = useRef<{
    x: number
    y: number
    originX: number
    originY: number
  } | null>(null)

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()

    setZoom((current) =>
      Math.min(4, Math.max(0.5, current - event.deltaY * 0.001)),
    )
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      originX: position.x,
      originY: position.y,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current

    if (!start) return

    setPosition({
      x: start.originX + event.clientX - start.x,
      y: start.originY + event.clientY - start.y,
    })
  }

  function handlePointerUp() {
    dragStart.current = null
  }

  function resetView() {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  const buttonClass =
    'rounded-lg border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#4A4A4A] transition hover:border-[#E23E1A] hover:bg-[#FCEBE7] hover:text-[#E23E1A]'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F5F5F5] text-[#4A4A4A]">
      <header className="flex items-center justify-between gap-4 border-b border-[#E5E5E5] bg-white px-4 py-3">
        <h2 className="truncate font-semibold text-[#4A4A4A]">
          {title}
        </h2>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-[#E23E1A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#C93416]"
        >
          Закрыть ✕
        </button>
      </header>

      <div
        className="flex flex-1 touch-none items-center justify-center overflow-hidden bg-[#F5F5F5]"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
      >
        <img
          src={imageUrl}
          alt={title}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            cursor: 'grab',
          }}
        />
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-[#E5E5E5] bg-white p-3">
        <button
          type="button"
          onClick={() =>
            setZoom((current) => Math.max(0.5, current - 0.25))
          }
          className={buttonClass}
        >
          −
        </button>

        <span className="min-w-16 text-center text-sm font-medium text-[#4A4A4A]">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={() =>
            setZoom((current) => Math.min(4, current + 0.25))
          }
          className={buttonClass}
        >
          +
        </button>

        <button
          type="button"
          onClick={resetView}
          className={buttonClass}
        >
          Сбросить
        </button>
      </footer>
    </div>
=======
  pointId: string
  panoramas: { id: string; title: string }[]
  onSelectPanorama: (id: string) => void
  onClose: () => void
  projectId: string
  /** Верхняя панель вместо навигации редактора (например, в режиме просмотра для пользователей). */
  navigation?: ReactNode
}

export default function PanoramaViewer({ imageUrl, title, pointId, panoramas, onSelectPanorama, onClose, projectId, navigation }: PanoramaViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PannellumViewer | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [hfov, setHfov] = useState(100)
  const trackedRef = useRef({ projectId, title })

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
    }
  }, [imageUrl])

  const buttonClass = 'rounded-lg border border-line bg-surface px-4 py-2 text-sm text-body transition enabled:hover:bg-brand-soft enabled:hover:text-brand disabled:opacity-40'

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

        <div className="relative min-h-0 flex-1 bg-black">
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

        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-line bg-surface p-3">
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
>>>>>>> Stashed changes
  )
}
