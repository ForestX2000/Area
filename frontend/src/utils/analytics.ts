import { useMemo, useSyncExternalStore } from 'react'
import { getCurrentUser } from './auth'

export type AnalyticsEventType = 'view' | 'click' | 'panorama'

export interface AnalyticsEvent {
  id: string
  ts: number
  type: AnalyticsEventType
  userId: string
  role: string
  page: string
  /** Как открыта эта страница (для просмотров) — по кнопке внутри сайта, ссылке, метке кампании. */
  source: string
  /** Источник входа в сессию: по нему фильтруются и клики, и открытия панорам этого визита. */
  entry?: string
  projectId?: string
  mode?: '2d' | '3d'
  /** Нажатая кнопка или открытая панорама. */
  target?: string
  demo?: true
}

const STORAGE_KEY = 'space-map-analytics'
const CHANGE_EVENT = 'space-map:analytics-changed'
// ~200 байт на событие: лимит держит журнал в пределах ~1 МБ localStorage.
const MAX_EVENTS = 5000
const DAY = 24 * 60 * 60 * 1000

export const PAGE_LABELS: Record<string, string> = {
  home: 'Главная',
  viewer: 'Просмотр объекта',
  map: '2D-карта',
  editor: 'Редактор',
  project: 'Страница проекта',
  workspace: 'Workspace',
  profile: 'Профиль',
}

const SOURCE_LABELS: Record<string, string> = {
  'objects-list': 'Список объектов',
  'projects-list': 'Карточки проектов',
  workspace: 'Workspace',
  marker: 'Навигационная метка',
  'in-app': 'Переход внутри сайта',
  direct: 'Прямая ссылка',
}

export function sourceLabel(source: string): string {
  if (source.startsWith('utm:')) return `Кампания «${source.slice(4)}»`
  if (source.startsWith('ref:')) return `Сайт ${source.slice(4)}`
  return SOURCE_LABELS[source] ?? source
}

function eventId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(2)), (part) => part.toString(36)).join('')
}

function parse(serialized: string): AnalyticsEvent[] {
  try {
    const parsed: unknown = JSON.parse(serialized)
    return Array.isArray(parsed) ? parsed as AnalyticsEvent[] : []
  } catch {
    return []
  }
}

function snapshot() {
  try { return localStorage.getItem(STORAGE_KEY) ?? '[]' } catch { return '[]' }
}

export function readEvents(): AnalyticsEvent[] {
  return parse(snapshot())
}

function writeEvents(events: AnalyticsEvent[]) {
  let kept = events.slice(-MAX_EVENTS)
  // При переполнении хранилища жертвуем старой половиной журнала, а не данными проектов.
  while (kept.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept))
      break
    } catch {
      kept = kept.slice(Math.ceil(kept.length / 2))
    }
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

const ENTRY_KEY = 'space-map-entry-source'

function sessionEntry(event: Pick<AnalyticsEvent, 'type' | 'source'>): string {
  let entry: string | null = null
  try {
    entry = sessionStorage.getItem(ENTRY_KEY)
    if (event.type === 'view' && event.source !== 'in-app' && event.source !== entry) {
      entry = event.source
      sessionStorage.setItem(ENTRY_KEY, entry)
    }
  } catch {
    // Без sessionStorage источник входа определяется по самому событию.
  }
  return entry ?? (event.source === 'in-app' ? 'direct' : event.source)
}

export function track(event: Omit<AnalyticsEvent, 'id' | 'ts' | 'userId' | 'role' | 'entry'>) {
  const user = getCurrentUser()
  if (!user) return
  writeEvents([...readEvents(), { ...event, entry: sessionEntry(event), id: eventId(), ts: Date.now(), userId: user.id, role: user.role }])
}

export function clearEvents(onlyDemo = false) {
  writeEvents(onlyDemo ? readEvents().filter((event) => !event.demo) : [])
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useAnalyticsEvents(): AnalyticsEvent[] {
  const serialized = useSyncExternalStore(subscribe, snapshot)
  return useMemo(() => parse(serialized), [serialized])
}

/** Страница сайта по адресу; null — страница не считается посещением (вход, статистика). */
export function describeRoute(pathname: string, search: string): { page: string; projectId?: string; mode?: '2d' | '3d' } | null {
  const mode = new URLSearchParams(search).get('mode') === '3d' ? '3d' : '2d'
  let match = pathname.match(/^\/objects\/([^/]+)\/?$/)
  if (match) return { page: 'viewer', projectId: decodeURIComponent(match[1]), mode }
  match = pathname.match(/^\/projects\/([^/]+)\/map\/?$/)
  if (match) return { page: 'map', projectId: decodeURIComponent(match[1]), mode }
  match = pathname.match(/^\/projects\/([^/]+)\/editor\/?$/)
  if (match) return { page: 'editor', projectId: decodeURIComponent(match[1]) }
  match = pathname.match(/^\/projects\/([^/]+)\/?$/)
  if (match && match[1] !== 'new') return { page: 'project', projectId: decodeURIComponent(match[1]) }
  if (pathname === '/') return { page: 'home' }
  if (pathname.startsWith('/workspace')) return { page: 'workspace' }
  if (pathname === '/profile') return { page: 'profile' }
  return null
}

/** Откуда пришёл посетитель: метка кампании, кнопка внутри сайта, внешний сайт или прямая ссылка. */
export function detectSource(stateSource: unknown, search: string, firstLoad: boolean): string {
  const utm = new URLSearchParams(search).get('utm_source')
  if (utm) return `utm:${utm.trim().slice(0, 40)}`
  if (typeof stateSource === 'string' && stateSource) return stateSource
  if (!firstLoad) return 'in-app'
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null
    if (referrer && referrer.host !== window.location.host) return `ref:${referrer.hostname.replace(/^www\./, '')}`
  } catch {
    // Некорректный referrer считаем прямым переходом.
  }
  return 'direct'
}

export interface StatsFilter {
  /** null — за всё время. */
  days: number | null
  projectId?: string
  source?: string
  role?: string
}

export function filterEvents(events: AnalyticsEvent[], filter: StatsFilter, now = Date.now()): AnalyticsEvent[] {
  const from = filter.days === null ? 0 : startOfDay(now) - (filter.days - 1) * DAY
  return events.filter((event) => event.ts >= from
    && (!filter.projectId || event.projectId === filter.projectId)
    && (!filter.source || (event.entry ?? event.source) === filter.source)
    && (!filter.role || event.role === filter.role))
}

export function countBy(events: AnalyticsEvent[], key: (event: AnalyticsEvent) => string | undefined): [string, number][] {
  const counts = new Map<string, number>()
  for (const event of events) {
    const value = key(event)
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])
}

export interface StatsSummary {
  views: number
  visitors: number
  clicks: number
  panoramas: number
}

export function summarize(events: AnalyticsEvent[]): StatsSummary {
  const views = events.filter((event) => event.type === 'view')
  return {
    views: views.length,
    visitors: new Set(views.map((event) => event.userId)).size,
    clicks: events.filter((event) => event.type === 'click').length,
    panoramas: events.filter((event) => event.type === 'panorama').length,
  }
}

function startOfDay(ts: number) {
  const date = new Date(ts)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export interface DailyPoint {
  day: number
  views: number
  visitors: number
}

export function dailySeries(events: AnalyticsEvent[], days: number | null, now = Date.now()): DailyPoint[] {
  const views = events.filter((event) => event.type === 'view')
  const first = views.reduce((min, event) => Math.min(min, event.ts), now)
  const span = days ?? Math.min(90, Math.max(7, Math.round((startOfDay(now) - startOfDay(first)) / DAY) + 1))
  const today = startOfDay(now)
  return Array.from({ length: span }, (_, index) => {
    const day = today - (span - 1 - index) * DAY
    const items = views.filter((event) => event.ts >= day && event.ts < day + DAY)
    return { day, views: items.length, visitors: new Set(items.map((event) => event.userId)).size }
  })
}

// Детерминированный генератор, чтобы демо-статистика выглядела одинаково при каждой генерации.
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(random: () => number, weighted: [T, number][]): T {
  const total = weighted.reduce((sum, [, weight]) => sum + weight, 0)
  let point = random() * total
  for (const [value, weight] of weighted) {
    point -= weight
    if (point <= 0) return value
  }
  return weighted[weighted.length - 1][0]
}

/** Правдоподобная активность за 30 дней для демонстрации; события помечены demo и удаляются отдельно. */
export function generateDemoEvents(projectIds: string[], userIds: { id: string; role: string }[], now = Date.now()): AnalyticsEvent[] {
  if (projectIds.length === 0) return []
  const random = seededRandom(20261024)
  const guests = Array.from({ length: 28 }, (_, index) => ({ id: `guest-${index + 1}`, role: 'user' }))
  const people = [...userIds, ...guests]
  const popularity = projectIds.map((_, index) => 1 / (index + 1.4))
  const sources: [string, number][] = [
    ['objects-list', 42], ['direct', 14], ['workspace', 9], ['marker', 9],
    ['ref:yandex.ru', 9], ['utm:telegram', 8], ['ref:google.com', 5], ['utm:email', 4],
  ]
  const buttons: [string, number][] = [
    ['Открыть в 2D', 26], ['Открыть в 3D', 18], ['Выбрать точку', 16], ['Открыть панораму', 12],
    ['Панорама точки', 8], ['Сбросить вид', 6], ['Увеличить масштаб панорамы', 6], ['Этаж', 5], ['Режим 3D', 5],
  ]
  const events: AnalyticsEvent[] = []
  const today = startOfDay(now)
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const day = today - daysAgo * DAY
    const weekday = new Date(day).getDay()
    // Будни активнее выходных, к концу месяца посещаемость растёт.
    const volume = 16 * (weekday === 0 || weekday === 6 ? 0.55 : 1) * (0.75 + (29 - daysAgo) / 60)
    const visits = Math.round(volume * (0.8 + random() * 0.4))
    for (let visit = 0; visit < visits; visit++) {
      const projectId = pick(random, projectIds.map((id, index) => [id, popularity[index]] as [string, number]))
      const person = people[Math.floor(random() * people.length)]
      const mode = random() < 0.32 ? '3d' : '2d'
      let ts = day + (8 + random() * 13) * 60 * 60 * 1000
      if (ts > now) ts = now - random() * 60 * 60 * 1000
      const entry = pick(random, sources)
      const base = { userId: person.id, role: person.role, projectId, page: 'viewer', mode, entry, demo: true } as const
      events.push({ ...base, id: eventId(), ts, type: 'view', source: entry })
      const clicks = Math.floor(random() * 4)
      for (let click = 0; click < clicks; click++) {
        events.push({ ...base, id: eventId(), ts: ts + (click + 1) * 15000, type: 'click', source: 'in-app', target: pick(random, buttons) })
      }
      if (mode === '3d' || random() < 0.2) {
        events.push({ ...base, id: eventId(), ts: ts + 5000, type: 'panorama', source: 'in-app', mode: '3d', target: 'Панорама' })
      }
    }
  }
  return events.sort((a, b) => a.ts - b.ts)
}

export function addDemoEvents(events: AnalyticsEvent[]) {
  writeEvents([...readEvents().filter((event) => !event.demo), ...events].sort((a, b) => a.ts - b.ts))
}
