import { useEffect, useState } from 'react'
import type { DrawingObject } from '../types/drawing'
import { getMapImage, getPanorama } from '../utils/mapStorage'
import { getPoints } from '../utils/pointStorage'
import DrawingShape from './editor/DrawingShape'
import { objectsBounds } from './editor/drawingGeometry'
import { floorStorageId, getFloor } from '../utils/floorStorage'
import { useProjects } from '../utils/useProjects'

interface ProjectPreviewProps {
  projectId: string
  name: string
  drawings?: DrawingObject[]
  mode?: 'content' | 'map'
}

type PreviewKind = 'panorama' | 'plan'

async function thumbnail(file: Blob, kind: PreviewKind): Promise<Blob> {
  const source = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const context = canvas.getContext('2d')
    if (!context) return file
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    // Keep the whole plan visible; crop a photograph to fill the cover.
    const ratio = (kind === 'plan' ? Math.min : Math.max)(
      canvas.width / image.naturalWidth, canvas.height / image.naturalHeight,
    )
    const width = image.naturalWidth * ratio
    const height = image.naturalHeight * ratio
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((result) => resolve(result ?? file), kind === 'plan' ? 'image/png' : 'image/jpeg', 0.85)
    })
  } finally {
    URL.revokeObjectURL(source)
  }
}

function DrawingPreview({ objects, name }: { objects: DrawingObject[]; name: string }) {
  const bounds = objectsBounds(objects)
  const width = Math.max(1, bounds.right - bounds.left)
  const height = Math.max(1, bounds.bottom - bounds.top)
  const padding = Math.max(10, Math.max(width, height) * 0.08)
  return (
    <svg role="img" aria-label={`Чертёж проекта «${name}»`} className="h-full w-full p-3"
      viewBox={`${bounds.left - padding} ${bounds.top - padding} ${width + padding * 2} ${height + padding * 2}`}>
      {objects.map((object) => <DrawingShape key={object.id} object={object} />)}
    </svg>
  )
}

export default function ProjectPreview(props: ProjectPreviewProps) {
  const project = useProjects().find((project) => project.id === props.projectId)
  const floor = project ? getFloor(project) : null
  const storageId = floorStorageId(props.projectId, floor?.id ?? 'default')
  return <FloorPreview key={`${storageId}:${props.mode}`} {...props} storageId={storageId} drawings={floor?.drawings ?? props.drawings} />
}

function FloorPreview({ storageId, name, drawings = [], mode = 'content' }: ProjectPreviewProps & { storageId: string }) {
  const [preview, setPreview] = useState<{ url: string; kind: PreviewKind } | null>(null)

  useEffect(() => {
    let cancelled = false
    let previewUrl: string | null = null

    async function displayImage(file: Blob | undefined, kind: PreviewKind): Promise<boolean> {
      if (!file || cancelled) return false
      try {
        const image = await thumbnail(file, kind)
        if (cancelled) return false
        previewUrl = URL.createObjectURL(image)
        setPreview({ url: previewUrl, kind })
        return true
      } catch {
        // An unreadable image must not prevent using another project asset.
        return false
      }
    }

    async function load() {
      try {
        for (const point of mode === 'map' ? [] : getPoints(storageId)) {
          if (cancelled) return
          if (await displayImage(await getPanorama(storageId, point.id), 'panorama')) return
        }
      } catch {
        // Continue with the plan or drawing if a panorama cannot be loaded.
      }
      try {
        if (!cancelled) await displayImage(await getMapImage(storageId), 'plan')
      } catch {
        // The saved drawing remains available when IndexedDB is unavailable.
      }
    }

    void load()
    return () => {
      cancelled = true
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [storageId, mode])

  const objects = drawings.filter((object) => object.markerKind !== 'service' && object.points?.length >= 2
    && object.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)))
  const label = preview ? preview.kind === 'panorama' ? 'Фото' : 'План' : objects.length ? 'Чертёж' : 'Проект'

  return (
    <div className="project-preview relative h-44 overflow-hidden bg-surface-muted p-0">
      {preview ? (
        <img src={preview.url} alt={`${preview.kind === 'panorama' ? 'Фото' : 'План'} проекта «${name}»`}
          className={`h-full w-full ${preview.kind === 'panorama' ? 'object-cover' : 'object-contain'}`}
          decoding="async" onError={() => setPreview(null)} />
      ) : objects.length ? (
        <DrawingPreview objects={objects} name={name} />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-muted">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8" cy="9" r="1.5" />
            <path d="m3 17 5-5 4 4 4-6 5 7" />
          </svg>
          <span className="text-xs">Добавьте план, панораму или чертёж</span>
        </div>
      )}
      <span className="absolute left-3 top-3 rounded-full border border-line bg-white/95 px-3 py-1 text-xs font-medium text-body">
        {label}
      </span>
    </div>
  )
}
