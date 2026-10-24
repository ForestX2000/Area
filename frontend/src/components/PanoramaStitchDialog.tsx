import { useEffect, useId, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { createPortal } from 'react-dom'
import { useObjectUrl } from '../utils/useObjectUrl'
import { MAX_STITCH_PHOTOS, MIN_STITCH_PHOTOS, RECOMMENDED_STITCH_PHOTOS, StitchRequestError, stitchPanorama } from '../utils/panoramaStitch'
import type { StitchedPanorama } from '../utils/panoramaStitch'

interface Photo {
  id: string
  file: File
  url: string
  portrait: boolean
}

type Stage = { kind: 'select' } | { kind: 'stitching' } | { kind: 'result'; result: StitchedPanorama }

const TIPS: [string, string][] = [
  ['Не сходите с места', 'Встаньте в центр помещения и поворачивайтесь вокруг телефона, а не вокруг себя: камера должна оставаться в одной точке.'],
  ['Снимайте по кругу с перекрытием', `Делайте кадр каждые 30°: ${RECOMMENDED_STITCH_PHOTOS} снимков на полный круг. Соседние кадры должны перекрываться на треть — по общим деталям они и склеиваются.`],
  ['Держите телефон ровно', 'Вертикально, на уровне глаз и на одной высоте. Не наклоняйте телефон вбок.'],
  ['Добавьте пол и потолок', 'Для полного обзора сделайте по 3–4 кадра с наклоном вверх и вниз. Иначе пол и потолок заполнятся размытым фоном.'],
  ['Одинаковая экспозиция', 'Зафиксируйте экспозицию и фокус долгим нажатием на экран. Отключите HDR, вспышку и широкоугольный объектив.'],
  ['Без движения и пустых стен', 'Люди и движущиеся предметы оставляют «призраков» на швах. Однотонную стену вплотную склеить нельзя — захватывайте мебель, двери, картины.'],
]

function sectorPath(index: number, count: number) {
  const point = (angle: number, radius: number) => `${(Math.sin(angle) * radius).toFixed(2)} ${(-Math.cos(angle) * radius).toFixed(2)}`
  const start = (index / count) * 2 * Math.PI + 0.03
  const end = ((index + 1) / count) * 2 * Math.PI - 0.03
  return `M ${point(start, 16)} L ${point(start, 44)} A 44 44 0 0 1 ${point(end, 44)} L ${point(end, 16)} A 16 16 0 0 0 ${point(start, 16)} Z`
}

// Вид сверху: человек в центре и сектора кадров по кругу; заполняются по мере добавления фото.
function ShotPlan({ taken }: { taken: number }) {
  return <figure className="flex flex-col items-center gap-2">
    <svg viewBox="-50 -50 100 100" className="h-36 w-36" role="img" aria-label={`Схема съёмки: снимков ${taken} из ${RECOMMENDED_STITCH_PHOTOS}`}>
      {Array.from({ length: RECOMMENDED_STITCH_PHOTOS }, (_, index) => (
        <path key={index} d={sectorPath(index, RECOMMENDED_STITCH_PHOTOS)}
          className={index < taken ? 'fill-brand' : 'fill-surface-subtle stroke-line'} strokeWidth="0.5" />
      ))}
      <circle r="9" className="fill-ink" />
      <path d="M -3 -14 L 0 -19 L 3 -14 Z" className="fill-ink" />
    </svg>
    <figcaption className="text-xs text-muted">Снимков: {taken} из ~{RECOMMENDED_STITCH_PHOTOS} на круг</figcaption>
  </figure>
}

async function isPortrait(file: File) {
  const bitmap = await createImageBitmap(file)
  const portrait = bitmap.height > bitmap.width
  bitmap.close()
  return portrait
}

export default function PanoramaStitchDialog({ title, onClose, onComplete }: {
  title: string
  onClose: () => void
  onComplete: (file: File) => void | Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [photos, setPhotos] = useState<Photo[]>([])
  const photosRef = useRef(photos)
  const [stage, setStage] = useState<Stage>({ kind: 'select' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resultUrl, replaceResultUrl] = useObjectUrl()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { photosRef.current = photos }, [photos])

  useEffect(() => {
    const dialog = dialogRef.current!
    dialog.showModal()
    return () => {
      dialog.close()
      abortRef.current?.abort()
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.url)
    }
  }, [])

  async function addFiles(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (files.length === 0) return
    setError('')
    const checked = await Promise.all(files.map(async (file) => {
      try {
        return { file, portrait: await isPortrait(file) }
      } catch {
        return null
      }
    }))
    const readable = checked.filter((item): item is { file: File; portrait: boolean } => item !== null)
    const rejected = files.length - readable.length
    const room = MAX_STITCH_PHOTOS - photosRef.current.length
    if (rejected > 0) setError(`Файлов не удалось открыть как изображение: ${rejected}.`)
    else if (readable.length > room) setError(`Можно загрузить не больше ${MAX_STITCH_PHOTOS} снимков.`)
    const added = readable.slice(0, Math.max(0, room)).map(({ file, portrait }) => ({
      id: crypto.randomUUID(), file, portrait, url: URL.createObjectURL(file),
    }))
    setPhotos((current) => [...current, ...added])
  }

  function removePhoto(id: string) {
    const photo = photos.find((item) => item.id === id)
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotos(photos.filter((item) => item.id !== id))
  }

  async function handleStitch() {
    const controller = new AbortController()
    abortRef.current = controller
    setError('')
    setStage({ kind: 'stitching' })
    try {
      const result = await stitchPanorama(photos.map((photo) => photo.file), controller.signal)
      replaceResultUrl(result.file)
      setStage({ kind: 'result', result })
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(caught instanceof StitchRequestError ? caught.message : 'Не удалось склеить панораму.')
      setStage({ kind: 'select' })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  function cancelStitch() {
    abortRef.current?.abort()
    setStage({ kind: 'select' })
  }

  async function handleSave(file: File) {
    setSaving(true)
    try {
      await onComplete(file)
    } finally {
      setSaving(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragging(false)
    if (stage.kind === 'select') void addFiles(event.dataTransfer.files)
  }

  const result = stage.kind === 'result' ? stage.result : null
  const dropped = result ? photos.map((_, index) => index).filter((index) => !result.usedImages.includes(index)) : []
  const mixedOrientation = photos.some((photo) => photo.portrait) && photos.some((photo) => !photo.portrait)
  const warnings = stage.kind !== 'select' ? [] : [
    photos.length > 0 && photos.length < MIN_STITCH_PHOTOS && `Добавьте минимум ${MIN_STITCH_PHOTOS} снимка.`,
    photos.length >= MIN_STITCH_PHOTOS && photos.length < 8 && `Для полного круга обычно нужно 8–${RECOMMENDED_STITCH_PHOTOS} снимков — из этих получится частичная панорама.`,
    mixedOrientation && 'Снимки разной ориентации: лучше снимать все кадры одинаково — вертикально или горизонтально.',
  ].filter((warning): warning is string => Boolean(warning))
  const resultHints = !result ? [] : [
    result.horizontalCoverage < 340 && `Круг не замкнут: снято около ${Math.round(result.horizontalCoverage)}°. Добавьте снимки, чтобы закрыть оставшиеся ${360 - Math.round(result.horizontalCoverage)}°.`,
    result.verticalCoverage < 120 && 'Пол и потолок не сняты — они заполнены размытым фоном. Для полного обзора добавьте кадры с наклоном вверх и вниз.',
    dropped.length > 0 && `Снимки ${dropped.map((index) => index + 1).join(', ')} не удалось связать с остальными — они не вошли в панораму. Переснимите их с большим перекрытием.`,
  ].filter((hint): hint is string => Boolean(hint))

  const buttonClass = 'rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-subtle disabled:opacity-50'
  const primaryClass = 'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50'

  return createPortal(<dialog ref={dialogRef} aria-labelledby={titleId}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-2xl border border-line bg-surface p-0 text-body shadow-2xl backdrop:bg-black/50"
    onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}
    onKeyDown={(event) => event.stopPropagation()}
    onPointerDown={(event) => event.stopPropagation()}>
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <header className="border-b border-line px-6 py-4">
        <p className="text-xs font-medium text-brand">Панорама 360° из фотографий</p>
        <h2 id={titleId} className="break-words text-xl font-bold text-ink">Собрать панораму: {title}</h2>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {result ? <section aria-label="Результат склейки" className="space-y-3">
          {resultUrl && <img src={resultUrl} alt={`Склеенная панорама: ${title}`} className="aspect-[2/1] w-full rounded-xl border border-line bg-page object-cover" />}
          <p role="status" className="text-sm font-medium text-ink">
            Охват: {Math.round(result.horizontalCoverage)}° по горизонтали, {Math.round(result.verticalCoverage)}° по вертикали · снимков в панораме: {result.usedImages.length} из {result.totalImages}
          </p>
          {resultHints.length > 0
            ? <ul className="space-y-2">{resultHints.map((hint) => <li key={hint} className="rounded-lg border border-brand-border bg-brand-soft px-3 py-2 text-sm text-brand-hover">{hint}</li>)}</ul>
            : <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm">Полная панорама — можно сохранять.</p>}
        </section> : <div className="grid gap-5 md:grid-cols-[1fr_auto]">
          <details open className="group rounded-xl border border-line bg-surface-muted p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">Как снимать</summary>
            <ol className="mt-3 space-y-2.5">
              {TIPS.map(([heading, text], index) => <li key={heading} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{index + 1}</span>
                <span><span className="font-medium text-ink">{heading}.</span> <span className="text-muted">{text}</span></span>
              </li>)}
            </ol>
          </details>
          <ShotPlan taken={photos.length} />
        </div>}

        <section aria-label="Снимки"
          onDragOver={(event) => { if (stage.kind === 'select') { event.preventDefault(); setDragging(true) } }}
          onDragLeave={() => setDragging(false)} onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-4 transition ${dragging ? 'border-brand bg-brand-soft' : 'border-line'}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{photos.length ? `Снимков: ${photos.length}. Порядок не важен.` : 'Перетащите снимки сюда или выберите файлы.'}</p>
            {stage.kind === 'select' && <label className="cursor-pointer rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-soft focus-within:ring-2 focus-within:ring-brand">
              + Добавить снимки
              <input type="file" accept="image/*" multiple aria-label="Добавить снимки" className="sr-only"
                onChange={(event) => { void addFiles(event.target.files); event.target.value = '' }} />
            </label>}
          </div>
          {photos.length > 0 && <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {photos.map((photo, index) => {
              const left = dropped.includes(index)
              return <li key={photo.id} className={`relative overflow-hidden rounded-lg border ${left ? 'border-brand ring-2 ring-brand' : 'border-line'}`}>
                <img src={photo.url} alt={`Снимок ${index + 1}`} className={`h-20 w-full object-cover ${left ? 'opacity-50' : ''}`} />
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs text-white">{index + 1}</span>
                {left && <span className="absolute inset-x-0 bottom-0 bg-brand px-1 text-center text-xs text-white">не вошёл</span>}
                {stage.kind === 'select' && <button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Убрать снимок ${index + 1}`}
                  className="absolute right-1 top-1 h-6 w-6 rounded-full bg-surface/90 text-sm leading-none text-ink shadow hover:bg-brand hover:text-white">×</button>}
              </li>
            })}
          </ul>}
        </section>

        {warnings.length > 0 && <ul className="space-y-1">{warnings.map((warning) => <li key={warning} className="text-sm text-muted">⚠ {warning}</li>)}</ul>}
        {error && <p role="alert" className="rounded-lg border border-brand-border bg-brand-soft px-3 py-2 text-sm text-brand-hover">{error}</p>}
        {stage.kind === 'stitching' && <div role="status" className="flex items-center gap-3 text-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
          Склеиваем {photos.length} снимков… Обычно это занимает до минуты.
        </div>}
      </div>

      <footer className="flex flex-wrap justify-end gap-3 border-t border-line bg-surface-muted px-6 py-4">
        {stage.kind === 'select' && <>
          <button type="button" onClick={onClose} className={buttonClass}>Отмена</button>
          <button type="button" onClick={() => void handleStitch()} disabled={photos.length < MIN_STITCH_PHOTOS} className={primaryClass}>Собрать панораму</button>
        </>}
        {stage.kind === 'stitching' && <button type="button" onClick={cancelStitch} className={buttonClass}>Остановить</button>}
        {result && <>
          <button type="button" onClick={() => setStage({ kind: 'select' })} disabled={saving} className={buttonClass}>Изменить снимки</button>
          <button type="button" onClick={() => void handleSave(result.file)} disabled={saving} className={primaryClass}>
            {saving ? 'Сохраняем…' : 'Сохранить панораму'}
          </button>
        </>}
      </footer>
    </div>
  </dialog>, document.body)
}
