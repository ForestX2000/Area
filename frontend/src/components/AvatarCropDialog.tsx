import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { createPortal } from 'react-dom'

// Область кадрирования на экране и размер итогового аватара.
const VIEW = 280
const OUTPUT = 256
const MAX_ZOOM = 4

interface Crop {
  zoom: number
  // Смещение центра фото относительно центра рамки, в пикселях экрана.
  x: number
  y: number
}

function clampCrop(crop: Crop, image: { width: number; height: number }): Crop {
  const scale = Math.max(VIEW / image.width, VIEW / image.height) * crop.zoom
  const limitX = Math.max(0, (image.width * scale - VIEW) / 2)
  const limitY = Math.max(0, (image.height * scale - VIEW) / 2)
  return { zoom: crop.zoom, x: Math.min(limitX, Math.max(-limitX, crop.x)), y: Math.min(limitY, Math.max(-limitY, crop.y)) }
}

/** Кадрирование аватара: перетаскивание и масштаб под круглой маской, результат — квадрат 256×256. */
export default function AvatarCropDialog({ file, onCancel, onSave }: {
  file: File
  onCancel: () => void
  onSave: (dataUrl: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 0, y: 0 })
  const drag = useRef<{ pointerId: number; startX: number; startY: number; crop: Crop } | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    const element = new Image()
    let cancelled = false
    element.src = objectUrl
    element.decode()
      .then(() => { if (!cancelled) { setImage(element); setUrl(objectUrl) } })
      .catch(() => { if (!cancelled) setError('Не удалось открыть изображение. Выберите другой файл.') })
    return () => {
      cancelled = true
      URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  const size = image ? { width: image.naturalWidth, height: image.naturalHeight } : null
  const scale = size ? Math.max(VIEW / size.width, VIEW / size.height) * crop.zoom : 1

  function update(next: Crop) {
    if (size) setCrop(clampCrop({ ...next, zoom: Math.min(MAX_ZOOM, Math.max(1, next.zoom)) }, size))
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, crop }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start || start.pointerId !== event.pointerId) return
    update({ ...start.crop, x: start.crop.x + event.clientX - start.startX, y: start.crop.y + event.clientY - start.startY })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 20 : 5
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
    if (moves[event.key]) {
      event.preventDefault()
      update({ ...crop, x: crop.x + moves[event.key][0], y: crop.y + moves[event.key][1] })
    } else if (event.key === '+' || event.key === '=') update({ ...crop, zoom: crop.zoom + 0.1 })
    else if (event.key === '-') update({ ...crop, zoom: crop.zoom - 0.1 })
  }

  function handleSave() {
    if (!image || !size) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const sourceSize = VIEW / scale
    const sourceX = size.width / 2 - crop.x / scale - sourceSize / 2
    const sourceY = size.height / 2 - crop.y / scale - sourceSize / 2
    const context = canvas.getContext('2d')!
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT)
    onSave(canvas.toDataURL('image/jpeg', 0.9))
  }

  return createPortal(
    <dialog ref={dialogRef} aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-body shadow-2xl backdrop:bg-black/50"
      onCancel={(event) => { event.preventDefault(); onCancel() }}>
      <div className="p-6">
        <h2 id={titleId} className="text-xl font-bold text-ink">Кадрирование аватара</h2>
        <p className="mt-1 text-sm text-muted">Перетащите фото, чтобы выбрать область. Колесо или ползунок меняют масштаб.</p>
        {error ? (
          <p role="alert" className="mt-5 rounded-lg border border-brand-border bg-brand-soft p-3 text-sm text-brand-strong">{error}</p>
        ) : (
          <>
            <div role="application" aria-label="Область кадрирования" tabIndex={0}
              className="relative mx-auto mt-5 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-black active:cursor-grabbing"
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
              onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}
              onWheel={(event) => update({ ...crop, zoom: crop.zoom - event.deltaY * 0.0015 })}
              onKeyDown={handleKeyDown}>
              {url && size && (
                <img src={url} alt="" draggable={false} className="pointer-events-none absolute max-w-none"
                  style={{
                    width: size.width * scale, height: size.height * scale,
                    left: VIEW / 2 - (size.width * scale) / 2 + crop.x, top: VIEW / 2 - (size.height * scale) / 2 + crop.y,
                  }} />
              )}
              {/* Затемнение вне круга показывает, что попадёт в аватар. */}
              <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.55)] ring-2 ring-white/80" />
            </div>
            <label className="mt-5 flex items-center gap-3 text-sm">
              <span className="shrink-0 text-muted">Масштаб</span>
              <input type="range" aria-label="Масштаб" min={1} max={MAX_ZOOM} step={0.01} value={crop.zoom} disabled={!image}
                onChange={(event) => update({ ...crop, zoom: Number(event.target.value) })} className="w-full" />
            </label>
          </>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-line bg-surface-muted px-6 py-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-subtle">Отмена</button>
        <button type="button" onClick={handleSave} disabled={!image}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">Сохранить аватар</button>
      </div>
    </dialog>,
    document.body,
  )
}
