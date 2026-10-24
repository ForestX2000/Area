import type { DrawingObject } from '../types/drawing'
import { PIXELS_PER_METRE } from './editor/drawingGeometry'

export default function DrawingPlan({ objects, label, className = 'block h-auto w-full' }: {
  objects: DrawingObject[]
  label: string
  className?: string
}) {
  const bounds = objects.reduce((bounds, object) => {
    for (const point of object.points.slice(0, 2)) {
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
      {objects.map((object) => {
        const [a, b] = object.points
        return (
          <g key={object.id} data-plan-object-id={object.id}>
            {object.type === 'rectangle' ? (
              <rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)}
                fill={object.fill ?? 'var(--ttk-drawing-fill)'} stroke={object.stroke ?? 'var(--ttk-graphite)'}
                strokeWidth={object.strokeWidth ?? 2} strokeDasharray={object.strokeDasharray} vectorEffect="non-scaling-stroke" />
            ) : (
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={object.stroke ?? 'var(--ttk-graphite)'} strokeWidth={object.strokeWidth ?? 2}
                strokeDasharray={object.strokeDasharray} vectorEffect="non-scaling-stroke" />
            )}
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
