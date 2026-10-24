import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { DailyPoint } from '../../utils/analytics'
import { formatDay, formatNumber, formatPercent } from './format'

// Все графики — одна серия, поэтому цвет один: красный ТТК из токенов (в тёмной теме свой шаг).

export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">{typeof value === 'number' ? formatNumber(value) : value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/** Доля от целого: заливка цветом бренда на светлом шаге того же тона. */
export function Meter({ label, value, detail }: { label: string; value: number; detail?: ReactNode }) {
  const share = Math.min(1, Math.max(0, value))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-body">{label}</span>
        <span className="text-sm font-semibold text-ink">{formatPercent(share)}</span>
      </div>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}
        className="mt-2 h-3 overflow-hidden rounded-[4px] bg-brand-soft">
        <div className="h-full rounded-r-[4px] bg-brand" style={{ width: `${share * 100}%` }} />
      </div>
      {detail && <p className="mt-1.5 text-xs text-muted">{detail}</p>}
    </div>
  )
}

export interface BarItem {
  key: string
  label: string
  value: number
  href?: string
}

/** Горизонтальные столбцы: длинные русские подписи читаются слева, значение и доля — у конца столбца. */
export function BarList({ items, total, empty = 'Нет данных за выбранный период.', unit }: {
  items: BarItem[]
  total: number
  empty?: string
  unit: (value: number) => string
}) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const share = total ? item.value / total : 0
        const label = item.href
          ? <Link to={item.href} className="truncate text-body hover:text-brand hover:underline">{item.label}</Link>
          : <span className="truncate text-body">{item.label}</span>
        return (
          <li key={item.key} title={`${item.label}: ${unit(item.value)} · ${formatPercent(share)}`}
            className="group rounded-lg px-2 py-1 transition hover:bg-surface-muted">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              {label}
              <span className="shrink-0 text-xs tabular-nums text-muted"><span className="font-semibold text-ink">{formatNumber(item.value)}</span> · {formatPercent(share)}</span>
            </div>
            <div className="mt-1.5 h-2.5">
              <div className="h-full rounded-r-[4px] bg-brand transition group-hover:bg-brand-hover" style={{ width: `${Math.max(1.5, (item.value / max) * 100)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function niceMax(value: number) {
  if (value <= 4) return 4
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= value / 4)! * power
  return Math.ceil(value / step) * step
}

const HEIGHT = 240
const MARGIN = { top: 16, right: 16, bottom: 28, left: 40 }

/** Посещаемость по дням: линия с заливкой, перекрестие с подсказкой по наведению и стрелкам. */
export function DailyChart({ data, title }: { data: DailyPoint[]; title: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [active, setActive] = useState<number | null>(null)
  const descriptionId = useId()

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const max = niceMax(Math.max(...data.map((point) => point.views), 0))
  const x = (index: number) => MARGIN.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth)
  const y = (value: number) => MARGIN.top + plotHeight - (value / max) * plotHeight
  const line = data.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.views).toFixed(1)}`).join(' ')
  const area = data.length ? `${line} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : ''
  const ticks = [0, max / 2, max]
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotWidth / 70))))
  const point = active !== null ? data[active] : null

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - bounds.left - MARGIN.left) / plotWidth
    setActive(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))))
  }

  function handleKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const current = active ?? data.length - 1
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? data.length - 1 : current + (event.key === 'ArrowLeft' ? -1 : 1)
    setActive(Math.min(data.length - 1, Math.max(0, next)))
  }

  const total = data.reduce((sum, item) => sum + item.views, 0)

  return (
    <div>
      <div ref={wrapRef} className="relative">
        <svg width={width} height={HEIGHT} role="img" tabIndex={0} aria-label={`${title}: всего ${formatNumber(total)}. Стрелки — по дням.`}
          aria-describedby={descriptionId} className="block overflow-visible rounded-lg focus-visible:outline-2 focus-visible:outline-brand"
          onPointerMove={handlePointer} onPointerLeave={() => setActive(null)} onFocus={() => setActive(data.length - 1)} onBlur={() => setActive(null)} onKeyDown={handleKey}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="var(--ttk-border)" strokeWidth="1" />
              <text x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--ttk-muted)" className="tabular-nums">{formatNumber(tick)}</text>
            </g>
          ))}
          {data.map((item, index) => (index % labelEvery === 0 || index === data.length - 1) && (
            <text key={item.day} x={x(index)} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="var(--ttk-muted)" className="tabular-nums">{formatDay(item.day)}</text>
          ))}
          <path d={area} fill="var(--ttk-red)" fillOpacity="0.1" />
          <path d={line} fill="none" stroke="var(--ttk-red)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {point && active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={y(0)} stroke="var(--ttk-muted)" strokeWidth="1" />
              <circle cx={x(active)} cy={y(point.views)} r="5" fill="var(--ttk-red)" stroke="var(--ttk-white)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {point && active !== null && (
          <div role="status" className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(width - 150, Math.max(0, x(active) + 12)) }}>
            <p className="text-muted">{new Date(point.day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}</p>
            <p className="mt-1 flex items-center gap-2"><span className="h-0.5 w-3 rounded bg-brand" /><span className="text-sm font-semibold text-ink">{formatNumber(point.views)}</span> <span className="text-muted">просмотров</span></p>
            <p className="mt-0.5 pl-5"><span className="font-semibold text-ink">{formatNumber(point.visitors)}</span> <span className="text-muted">посетителей</span></p>
          </div>
        )}
      </div>
      <details id={descriptionId} className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-brand">Таблица по дням</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-xs text-muted"><tr><th className="py-1 font-medium">День</th><th className="py-1 text-right font-medium">Просмотры</th><th className="py-1 text-right font-medium">Посетители</th></tr></thead>
            <tbody>
              {[...data].reverse().map((item) => (
                <tr key={item.day} className="border-t border-line-soft">
                  <td className="py-1">{new Date(item.day).toLocaleDateString('ru-RU')}</td>
                  <td className="py-1 text-right">{formatNumber(item.views)}</td>
                  <td className="py-1 text-right">{formatNumber(item.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
