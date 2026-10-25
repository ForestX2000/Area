import type { ProjectFloor } from '../../types/project'
import { endpointOptions, type RouteEndpoint, type RouteRequest, type RouteResult } from '../../utils/routing'

const WALK_SPEED = 1.3

function encode(endpoint?: RouteEndpoint) {
  if (!endpoint) return ''
  return endpoint.point ? `point:${endpoint.floorId}` : `${endpoint.floorId}::${endpoint.objectId}`
}

export default function RoutePanel({ floors, request, result, currentFloorId, onChange, onGoToFloor, compact = false }: {
  floors: ProjectFloor[]
  request: RouteRequest
  result: RouteResult | null
  currentFloorId: string
  onChange: (request: RouteRequest) => void
  onGoToFloor: (floorId: string) => void
  compact?: boolean
}) {
  const options = endpointOptions(floors)
  const floorName = (id: string) => floors.find((floor) => floor.id === id)?.name ?? '?'
  const selectClass = 'w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-body'

  function select(side: 'from' | 'to', value: string) {
    const current = request[side]
    if (value === encode(current)) return
    const [floorId, objectId] = value.split('::')
    onChange({ ...request, [side]: value ? { floorId, objectId } : undefined })
  }

  function field(side: 'from' | 'to', label: string) {
    const current = request[side]
    return <label className="grid gap-1 text-xs text-muted">{label}
      <select aria-label={`Маршрут: ${label.toLowerCase()}`} value={encode(current)} onChange={(event) => select(side, event.target.value)} className={selectClass}>
        <option value="">Выберите объект</option>
        {current?.point && <option value={encode(current)}>Точка на плане · этаж {floorName(current.floorId)}</option>}
        {current?.objectId && !options.some((option) => option.objectId === current.objectId) && <option value={encode(current)}>Объект на плане · этаж {floorName(current.floorId)}</option>}
        {options.map((option) => <option key={`${option.floorId}::${option.objectId}`} value={`${option.floorId}::${option.objectId}`}>{option.label}</option>)}
      </select>
    </label>
  }

  const minutes = result && !('error' in result) ? Math.max(1, Math.round(result.length / WALK_SPEED / 60)) : 0

  return <section aria-label="Маршрут" className={compact ? 'space-y-2' : 'space-y-2 border-t border-line pt-3'}>
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Маршрут</h2>
      {(request.from || request.to) && <button type="button" onClick={() => onChange({})} className="text-xs text-brand hover:underline">Сбросить</button>}
    </div>
    {field('from', 'Откуда')}
    <button type="button" aria-label="Поменять местами начало и конец" disabled={!request.from && !request.to}
      onClick={() => onChange({ from: request.to, to: request.from })}
      className="mx-auto block rounded-md px-2 text-sm text-muted hover:bg-surface-muted hover:text-brand disabled:opacity-40">⇅</button>
    {field('to', 'Куда')}
    {!options.length && !request.from && <p className="text-xs leading-5 text-muted">Для выбора точек маршрута задайте названия помещениям или добавьте метки. Также точки можно выбрать в меню действий на плане.</p>}
    {result && ('error' in result
      ? <p role="alert" className="rounded-lg bg-brand-soft p-2 text-xs leading-5 text-brand-strong">{result.error}</p>
      : <div role="status" aria-label="Результат маршрута" className="rounded-lg border border-line bg-surface-muted p-2 text-xs">
        <p className="font-semibold text-ink">{result.length.toFixed(1)} м · ≈ {minutes} мин пешком</p>
        {result.legs.length > 1 && <ol className="mt-2 space-y-1">{result.legs.map((leg, index) => <li key={index} className="flex items-center justify-between gap-2">
          <span>{index + 1}. Этаж {floorName(leg.floorId)}: {leg.length.toFixed(1)} м{index < result.legs.length - 1 ? ' → лестница' : ''}</span>
          {leg.floorId !== currentFloorId && <button type="button" onClick={() => onGoToFloor(leg.floorId)} className="shrink-0 text-brand hover:underline">Показать</button>}
        </li>)}</ol>}
      </div>)}
  </section>
}
