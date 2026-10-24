import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BarList, DailyChart, Meter, StatTile } from '../components/stats/StatsCharts'
import { formatPercent } from '../components/stats/format'
import { useConfirmation } from '../contexts/useConfirmation'
import {
  addDemoEvents, clearEvents, countBy, dailySeries, filterEvents, generateDemoEvents, PAGE_LABELS,
  sourceLabel, summarize, useAnalyticsEvents, type StatsFilter,
} from '../utils/analytics'
import { getAccountNames } from '../utils/auth'
import { useProjects } from '../utils/useProjects'

const PERIODS = [
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
  { days: null, label: 'Всё время' },
] as const

const selectClass = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body'

function Card({ title, description, children, className = '' }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const plural = (value: number, forms: [string, string, string]) => {
  const mod10 = value % 10
  const mod100 = value % 100
  const form = mod10 === 1 && mod100 !== 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2
  return `${value.toLocaleString('ru-RU')} ${forms[form]}`
}
const viewsUnit = (value: number) => plural(value, ['просмотр', 'просмотра', 'просмотров'])
const clicksUnit = (value: number) => plural(value, ['нажатие', 'нажатия', 'нажатий'])

/** Статистика для администратора: общая или по одному проекту, с выбором периода, источника и роли. */
export default function StatsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const confirm = useConfirmation()
  const projects = useProjects()
  const events = useAnalyticsEvents()
  const [days, setDays] = useState<number | null>(30)
  const [source, setSource] = useState('')
  const [role, setRole] = useState('')
  const project = projects.find((item) => item.id === projectId)
  const names = useMemo(() => getAccountNames(), [])

  const projectName = (id: string) => projects.find((item) => item.id === id)?.name ?? 'Удалённый проект'
  const userName = (id: string) => names[id] ?? (id.startsWith('guest-') ? `Гость ${id.slice(6)}` : 'Пользователь')

  const stats = useMemo(() => {
    const base: StatsFilter = { days, source: source || undefined, role: role || undefined }
    // «Все проекты» с теми же фильтрами — знаменатель для доли конкретного проекта.
    const all = filterEvents(events, base)
    const scoped = projectId ? all.filter((event) => event.projectId === projectId) : all
    const views = scoped.filter((event) => event.type === 'view')
    const clicks = scoped.filter((event) => event.type === 'click')
    const projectViews = countBy(all.filter((event) => event.type === 'view' && event.projectId), (event) => event.projectId)
    const usersByViews = countBy(views, (event) => event.userId)
    const clicksByUser = new Map(countBy(clicks, (event) => event.userId))
    return {
      summary: summarize(scoped),
      allSummary: summarize(all.filter((event) => event.projectId)),
      daily: dailySeries(scoped, days),
      sources: countBy(views, (event) => event.entry ?? event.source),
      buttons: countBy(clicks, (event) => event.target).slice(0, 10),
      pages: countBy(views, (event) => event.page),
      projectViews,
      rank: projectId ? projectViews.findIndex(([id]) => id === projectId) + 1 : 0,
      views3d: views.filter((event) => event.mode === '3d').length,
      users: usersByViews.slice(0, 8).map(([id, count]) => ({
        id, views: count, clicks: clicksByUser.get(id) ?? 0, role: scoped.find((event) => event.userId === id)?.role,
      })),
    }
  }, [events, days, source, role, projectId])

  const availableSources = useMemo(() => countBy(events.filter((event) => event.type === 'view'), (event) => event.entry ?? event.source).map(([key]) => key), [events])
  const { summary } = stats
  const hasDemo = events.some((event) => event.demo)
  // Заходы на главную и в профиль без проекта не делают статистику «непустой».
  const hasProjectEvents = events.some((event) => event.projectId)

  async function handleClear() {
    if (await confirm({ title: 'Очистить статистику?', message: 'Все записанные посещения и нажатия будут удалены. Это действие нельзя отменить.' })) clearEvents()
  }

  if (projectId && !project) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-8 text-center">
        <h1 className="text-xl font-bold text-ink">Проект не найден</h1>
        <Link to="/stats" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">← Вся статистика</Link>
      </section>
    )
  }

  return (
    // Клики по самой странице статистики не попадают в статистику.
    <div data-track-ignore className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          {project && <Link to="/stats" className="text-sm text-muted hover:text-brand">← Вся статистика</Link>}
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{project ? `Статистика: ${project.name}` : 'Статистика'}</h1>
          <p className="mt-2 text-sm text-muted">
            {project ? 'Посещаемость проекта, его доля среди всех проектов и нажатия кнопок.' : 'Посещаемость, источники переходов и нажатия кнопок по всем проектам.'}
          </p>
        </div>
        {project && <Link to={`/projects/${project.id}`} className="self-start rounded-lg border border-line px-4 py-2 text-sm hover:bg-brand-soft sm:self-auto">Открыть проект</Link>}
      </header>

      <div role="group" aria-label="Фильтры" className="flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Период" className="flex rounded-lg border border-line bg-surface p-1">
          {PERIODS.map((period) => (
            <button key={period.label} type="button" role="radio" aria-checked={days === period.days} onClick={() => setDays(period.days)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${days === period.days ? 'bg-brand text-white' : 'text-body hover:bg-brand-soft'}`}>
              {period.label}
            </button>
          ))}
        </div>
        <select aria-label="Источник" value={source} onChange={(event) => setSource(event.target.value)} className={selectClass}>
          <option value="">Все источники</option>
          {availableSources.map((key) => <option key={key} value={key}>{sourceLabel(key)}</option>)}
        </select>
        <select aria-label="Роль" value={role} onChange={(event) => setRole(event.target.value)} className={selectClass}>
          <option value="">Все пользователи</option>
          <option value="user">Пользователи</option>
          <option value="admin">Администраторы</option>
        </select>
        <select aria-label="Проект" value={projectId ?? ''} onChange={(event) => navigate(event.target.value ? `/stats/${event.target.value}` : '/stats')} className={selectClass}>
          <option value="">Все проекты</option>
          {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      {!hasProjectEvents && (
        <section className="rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center">
          <h2 className="text-lg font-semibold text-ink">Статистика пока пуста</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            Посещения и нажатия записываются автоматически, когда пользователи открывают объекты. Для демонстрации можно сгенерировать активность за 30 дней.
          </p>
          <button type="button" disabled={projects.length === 0} onClick={() => addDemoEvents(generateDemoEvents(projects.map((item) => item.id), []))}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
            Сгенерировать демо-данные
          </button>
          {projects.length === 0 && <p className="mt-2 text-xs text-muted">Сначала создайте хотя бы один проект.</p>}
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Просмотры" value={summary.views} />
        <StatTile label="Уникальные посетители" value={summary.visitors} />
        <StatTile label="Нажатия кнопок" value={summary.clicks} hint={summary.views ? `${(summary.clicks / summary.views).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} на просмотр` : undefined} />
        <StatTile label="Открытия панорам" value={summary.panoramas} />
        <StatTile label="Просмотры в 3D" value={summary.views ? formatPercent(stats.views3d / summary.views) : '—'} hint={`${stats.views3d.toLocaleString('ru-RU')} из ${summary.views.toLocaleString('ru-RU')}`} />
      </div>

      {project && (
        <Card title="Доля проекта" description="Сравнение с суммой по всем проектам за тот же период и с теми же фильтрами.">
          <div className="grid gap-5 md:grid-cols-3">
            <Meter label="Доля просмотров" value={stats.allSummary.views ? summary.views / stats.allSummary.views : 0}
              detail={`${viewsUnit(summary.views)} из ${stats.allSummary.views.toLocaleString('ru-RU')}`} />
            <Meter label="Доля нажатий" value={stats.allSummary.clicks ? summary.clicks / stats.allSummary.clicks : 0}
              detail={`${clicksUnit(summary.clicks)} из ${stats.allSummary.clicks.toLocaleString('ru-RU')}`} />
            <div>
              <p className="text-sm text-body">Место по просмотрам</p>
              <p className="mt-1 text-3xl font-semibold text-ink">{stats.rank ? `${stats.rank} из ${stats.projectViews.length}` : '—'}</p>
              <p className="mt-1 text-xs text-muted">Среди проектов, которые открывали за период</p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Посещаемость по дням" description="Просмотры страниц; в подсказке — уникальные посетители за день.">
        <DailyChart data={stats.daily} title="Просмотры по дням" />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Источники переходов" description="Откуда пришли посетители: список объектов, ссылки, внешние сайты и метки кампаний (utm_source).">
          <BarList items={stats.sources.map(([key, value]) => ({ key, label: sourceLabel(key), value }))} total={summary.views} unit={viewsUnit} />
        </Card>
        <Card title="Нажатия кнопок" description="Десять самых нажимаемых кнопок.">
          <BarList items={stats.buttons.map(([key, value]) => ({ key, label: key, value }))} total={summary.clicks} unit={clicksUnit} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {!project ? (
          <Card title="Проекты" description="Рейтинг по просмотрам и доля каждого проекта. Название ведёт к статистике проекта.">
            <BarList items={stats.projectViews.map(([id, value]) => ({ key: id, label: projectName(id), value, href: projects.some((item) => item.id === id) ? `/stats/${id}` : undefined }))}
              total={stats.allSummary.views} unit={viewsUnit} />
          </Card>
        ) : (
          <Card title="Страницы" description="Где смотрели проект.">
            <BarList items={stats.pages.map(([key, value]) => ({ key, label: PAGE_LABELS[key] ?? key, value }))} total={summary.views} unit={viewsUnit} />
          </Card>
        )}
        <Card title="Самые активные" description="Посетители с наибольшим числом просмотров.">
          {stats.users.length === 0 ? <p className="py-6 text-center text-sm text-muted">Нет данных за выбранный период.</p> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted"><tr><th className="pb-2 font-medium">Кто</th><th className="pb-2 font-medium">Роль</th><th className="pb-2 text-right font-medium">Просмотры</th><th className="pb-2 text-right font-medium">Нажатия</th></tr></thead>
              <tbody className="tabular-nums">
                {stats.users.map((item) => (
                  <tr key={item.id} className="border-t border-line-soft">
                    <td className="max-w-40 truncate py-2 text-body">{userName(item.id)}</td>
                    <td className="py-2 text-muted">{item.role === 'admin' ? 'Админ' : 'Пользователь'}</td>
                    <td className="py-2 text-right">{item.views.toLocaleString('ru-RU')}</td>
                    <td className="py-2 text-right">{item.clicks.toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {!project && stats.pages.length > 0 && (
        <Card title="Страницы" description="Какие разделы сайта открывают чаще.">
          <BarList items={stats.pages.map(([key, value]) => ({ key, label: PAGE_LABELS[key] ?? key, value }))} total={summary.views} unit={viewsUnit} />
        </Card>
      )}

      <section aria-label="Управление данными" className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-muted p-4 text-sm">
        <span className="mr-auto text-muted">Записей в журнале: {events.length.toLocaleString('ru-RU')}{hasDemo ? ' (есть демо-данные)' : ''}</span>
        <button type="button" disabled={projects.length === 0} onClick={() => addDemoEvents(generateDemoEvents(projects.map((item) => item.id), []))}
          className="rounded-lg border border-line bg-surface px-3 py-2 hover:bg-brand-soft disabled:opacity-50">
          {hasDemo ? 'Пересоздать демо-данные' : 'Сгенерировать демо-данные'}
        </button>
        {hasDemo && <button type="button" onClick={() => clearEvents(true)} className="rounded-lg border border-line bg-surface px-3 py-2 hover:bg-brand-soft">Удалить демо-данные</button>}
        <button type="button" disabled={events.length === 0} onClick={handleClear}
          className="rounded-lg border border-brand-border bg-surface px-3 py-2 text-brand-hover hover:bg-brand-soft disabled:opacity-50">Очистить всё</button>
      </section>
    </div>
  )
}
