import type { DrawingObject } from '../../types/drawing'
import { objectBounds } from './drawingGeometry'

export default function DrawingShape({ object, stroke, preview = false }: { object: DrawingObject; stroke?: string; preview?: boolean }) {
  const box = objectBounds(object)
  const [a, b] = object.points
  const style = { stroke: stroke ?? object.stroke ?? 'var(--ttk-graphite)', strokeWidth: object.strokeWidth ?? 2,
    strokeDasharray: preview ? '4 4' : object.strokeDasharray, vectorEffect: 'non-scaling-stroke' as const }
  if (object.type === 'marker') {
    const kind = object.markerKind ?? 'info'
    const colour = kind === 'status' ? object.status === 'blocked' ? '#b91c1c' : object.status === 'progress' ? '#b45309' : '#216e4e' : kind === 'service' ? '#737373' : 'var(--ttk-red)'
    return <g data-marker-kind={kind}>
      <title>{object.label || 'Метка'}{object.description ? `: ${object.description}` : ''}</title>
      <circle cx={a.x} cy={a.y} r="13" fill={colour} stroke={stroke ?? 'white'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <text x={a.x} y={a.y + 4} textAnchor="middle" fontSize="14" fill="white" pointerEvents="none">{kind === 'info' ? 'i' : kind === 'navigation' ? '➜' : kind === 'status' ? '●' : '⚙'}</text>
    </g>
  }
  if (object.type === 'rectangle') return <rect x={box.left} y={box.top} width={box.width} height={box.height} fill={object.fill ?? 'transparent'} {...style} />
  if (object.type === 'ellipse') return <ellipse cx={box.left + box.width / 2} cy={box.top + box.height / 2} rx={box.width / 2} ry={box.height / 2} fill={object.fill ?? 'transparent'} {...style} />
  if (object.type === 'polygon') return <polygon points={object.points.map((point) => `${point.x},${point.y}`).join(' ')} fill={object.fill ?? 'transparent'} {...style} />
  if (object.type === 'polyline') return <polyline points={object.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" {...style} />
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...style} />
}
