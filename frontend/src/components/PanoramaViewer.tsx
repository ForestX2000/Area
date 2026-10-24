
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
  )
}
