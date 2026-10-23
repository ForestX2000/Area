
import { useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'

interface PanoramaViewerProps {
  imageUrl: string
  title: string
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <h2 className="truncate font-semibold">{title}</h2>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        >
          Закрыть ✕
        </button>
      </header>

      <div
        className="flex flex-1 touch-none items-center justify-center overflow-hidden"
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

      <footer className="flex flex-wrap items-center justify-center gap-4 p-3">
        <button
          type="button"
          onClick={() =>
            setZoom((current) => Math.max(0.5, current - 0.25))
          }
          className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          −
        </button>

        <span className="min-w-16 text-center text-sm">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={() =>
            setZoom((current) => Math.min(4, current + 0.25))
          }
          className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          +
        </button>

        <button
          type="button"
          onClick={resetView}
          className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          Сбросить
        </button>
      </footer>
    </div>
  )
}
