import type { DrawingObject } from '../../types/drawing'
import { drawingTransform, isStairs, objectLocalBounds, PIXELS_PER_METRE } from './drawingGeometry'

const STEP = 0.3 * PIXELS_PER_METRE

function Stairs({ object, style }: { object: DrawingObject; style: Record<string, unknown> }) {
  const box = objectLocalBounds(object)
  const vertical = box.height >= box.width
  const length = vertical ? box.height : box.width
  const count = Math.max(1, Math.floor(length / STEP))
  const steps = Array.from({ length: count - 1 }, (_, index) => box[vertical ? 'top' : 'left'] + length * (index + 1) / count)
  const { transform, ...lineStyle } = style
  const cx = box.left + box.width / 2, cy = box.top + box.height / 2
  // Стрелка показывает подъём вдоль длинной стороны.
  const arrow = vertical
    ? `M ${cx} ${box.bottom - 4} V ${box.top + 6} M ${cx - 5} ${box.top + 12} L ${cx} ${box.top + 6} L ${cx + 5} ${box.top + 12}`
    : `M ${box.left + 4} ${cy} H ${box.right - 6} M ${box.right - 12} ${cy - 5} L ${box.right - 6} ${cy} L ${box.right - 12} ${cy + 5}`
  return <g data-stairs transform={transform as string | undefined}>
    <rect x={box.left} y={box.top} width={box.width} height={box.height} fill={object.fill ?? 'transparent'} {...lineStyle} />
    {steps.map((value, index) => vertical
      ? <line key={index} x1={box.left} x2={box.right} y1={value} y2={value} {...lineStyle} strokeWidth={1} />
      : <line key={index} y1={box.top} y2={box.bottom} x1={value} x2={value} {...lineStyle} strokeWidth={1} />)}
    {box.width > 12 && box.height > 12 && <path d={arrow} fill="none" stroke="var(--ttk-red)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
  </g>
}

export default function DrawingShape({ object, stroke, preview = false }: { object: DrawingObject; stroke?: string; preview?: boolean }) {
  const box = objectLocalBounds(object)
  const [a, b] = object.points
  const style = { stroke: stroke ?? object.stroke ?? 'var(--ttk-graphite)', strokeWidth: object.strokeWidth ?? 2,
    strokeDasharray: preview ? '4 4' : object.strokeDasharray, vectorEffect: 'non-scaling-stroke' as const, transform: drawingTransform(object) }
  if (object.type === 'marker') {
    const kind = object.markerKind ?? 'info'
    const colour = kind === 'status' ? object.status === 'blocked' ? '#b91c1c' : object.status === 'progress' ? '#b45309' : '#216e4e' : kind === 'service' ? '#737373' : 'var(--ttk-red)'
    return <g data-marker-kind={kind} transform={drawingTransform(object)}>
      <title>{object.label || 'Метка'}{object.description ? `: ${object.description}` : ''}</title>
      <circle cx={a.x} cy={a.y} r="13" fill={colour} stroke={stroke ?? 'white'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <text x={a.x} y={a.y + 4} textAnchor="middle" fontSize="14" fill="white" pointerEvents="none">{kind === 'info' ? 'i' : kind === 'navigation' ? '➜' : kind === 'status' ? '●' : '⚙'}</text>
    </g>
  }
  if (isStairs(object)) return <Stairs object={object} style={style} />
  if (object.type === 'rectangle') return <rect x={box.left} y={box.top} width={box.width} height={box.height} fill={object.fill ?? 'transparent'} {...style} />
  if (object.type === 'ellipse') return <ellipse cx={box.left + box.width / 2} cy={box.top + box.height / 2} rx={box.width / 2} ry={box.height / 2} fill={object.fill ?? 'transparent'} {...style} />
  if (object.type === 'polygon') return <polygon points={object.points.map((point) => `${point.x},${point.y}`).join(' ')} fill={object.fill ?? 'transparent'} {...style} />
  if (object.type === 'polyline') return <polyline points={object.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" {...style} />
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...style} />
}
