import type { RouteLeg, RouteResult } from '../../utils/routing'

/** Отрезки маршрута на одном этаже; размеры не зависят от масштаба холста. */
export default function RouteOverlay({ result, floorId, zoom = 1 }: { result: RouteResult | null; floorId: string; zoom?: number }) {
  if (!result || 'error' in result) return null
  const legs = result.legs
  const unit = 1 / zoom
  const badge = (key: string, x: number, y: number, text: string, colour: string) => <g key={key} pointerEvents="none">
    <circle cx={x} cy={y} r={11 * unit} fill={colour} stroke="white" strokeWidth={2 * unit} />
    <text x={x} y={y + 4 * unit} fontSize={12 * unit} fontWeight={700} fill="white" textAnchor="middle">{text}</text>
  </g>
  const visible = legs.map((leg, index) => ({ leg, index })).filter(({ leg }) => leg.floorId === floorId)
  if (!visible.length) return null
  const line = (leg: RouteLeg) => leg.points.map((point) => `${point.x},${point.y}`).join(' ')
  return <g data-route-overlay pointerEvents="none">
    {visible.map(({ leg, index }) => <g key={index} data-route-leg={index}>
      <polyline points={line(leg)} fill="none" stroke="white" strokeWidth={8 * unit} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <polyline points={line(leg)} fill="none" stroke="var(--ttk-red)" strokeWidth={4 * unit} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={`${10 * unit} ${6 * unit}`} className="route-flow" />
    </g>)}
    {visible.map(({ leg, index }) => {
      const first = leg.points[0], last = leg.points.at(-1)!
      return [
        badge(`start-${index}`, first.x, first.y, index === 0 ? 'А' : '⇅', index === 0 ? 'var(--ttk-graphite)' : '#2563eb'),
        badge(`end-${index}`, last.x, last.y, index === legs.length - 1 ? 'Б' : '⇅', index === legs.length - 1 ? 'var(--ttk-red)' : '#2563eb'),
      ]
    })}
  </g>
}
