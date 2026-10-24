import type { DrawingObject } from '../types/drawing'
import { PIXELS_PER_METRE } from './editor/drawingGeometry'
import DrawingShape from './editor/DrawingShape'

export default function DrawingPlan({ objects, label, className = 'block h-auto w-full', onMarkerActivate }: {
  objects: DrawingObject[]
  label: string
  className?: string
  onMarkerActivate?: (object: DrawingObject) => void
}) {
  const visibleObjects = objects.filter((object) => object.markerKind !== 'service')
  const bounds = visibleObjects.reduce((bounds, object) => {
    for (const point of object.points) {
      bounds.left = Math.min(bounds.left, point.x)
      bounds.right = Math.max(bounds.right, point.x)
      bounds.top = Math.min(bounds.top, point.y)
      bounds.bottom = Math.max(bounds.bottom, point.y)
    }
    return bounds
  }, { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity })
  const width = Math.max(1, bounds.right - bounds.left)
  const height = Math.max(1, bounds.bottom - bounds.top)
  const padding = Math.max(24, Math.max(width, height) * 0.08)

  return (
    <svg role="img" aria-label={label} className={className}
      viewBox={`${bounds.left - padding} ${bounds.top - padding} ${width + padding * 2} ${height + padding * 2}`}>
      {visibleObjects.map((object) => {
        const [a, b] = object.points
        return (
          <g key={object.id} data-plan-object-id={object.id}
            role={object.type === 'marker' && onMarkerActivate ? 'button' : undefined}
            aria-label={object.type === 'marker' ? `Метка: ${object.label || object.markerKind}` : undefined}
            tabIndex={object.type === 'marker' && onMarkerActivate ? 0 : undefined}
            onClick={object.type === 'marker' && onMarkerActivate ? (event) => { event.stopPropagation(); onMarkerActivate(object) } : undefined}
            onKeyDown={object.type === 'marker' && onMarkerActivate ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onMarkerActivate(object) } } : undefined}
            style={object.type === 'marker' && onMarkerActivate ? { cursor: 'pointer' } : undefined}>
            <DrawingShape object={object} />
            {(object.label || object.type === 'dimension') && (
              <text x={(a.x + b.x) / 2} y={Math.min(a.y, b.y) - 10} textAnchor="middle" fontSize="12" fill="var(--ttk-body)">
                {object.label}{object.label && object.type === 'dimension' ? ' · ' : ''}
                {object.type === 'dimension' ? `${(Math.hypot(b.x - a.x, b.y - a.y) / PIXELS_PER_METRE).toFixed(2)} м` : ''}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
