import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProjectPreview from '../components/ProjectPreview'
import ShareDialog from '../components/ShareDialog'
import { useAuth } from '../contexts/useAuth'
import { getFloors } from '../utils/floorStorage'
import { projectHasPanorama } from '../utils/objectPanoramas'
import { useProjects } from '../utils/useProjects'
import type { Project } from '../types/project'

const linkClass = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition'

/** Список объектов для обычного пользователя: только просмотр в 2D и 3D. */
export default function ObjectsPage() {
  const { user } = useAuth()
  const projects = useProjects()
  const [query, setQuery] = useState('')
  const [withPanorama, setWithPanorama] = useState<Record<string, boolean>>({})
  const [shared, setShared] = useState<Project | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all(projects.map(async (project) => [project.id, await projectHasPanorama(project).catch(() => false)] as const))
      .then((entries) => { if (!cancelled) setWithPanorama(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [projects])

  const normalized = query.trim().toLocaleLowerCase()
  const visible = projects.filter((project) => !normalized
    || project.name.toLocaleLowerCase().includes(normalized)
    || project.description.toLocaleLowerCase().includes(normalized))

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand">
            {user ? `Здравствуйте, ${user.name}` : 'Каталог'}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Объекты</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Откройте план помещения в 2D или осмотритесь внутри на панорамах 360°.
          </p>
        </div>
        <label className="w-full sm:w-80">
          <span className="sr-only">Поиск объектов</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию или описанию"
            className="w-full rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft" />
        </label>
      </section>

      {projects.length === 0 ? (
        <section className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-ink">Объекты пока не добавлены</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Когда администратор опубликует карты помещений, они появятся здесь.</p>
        </section>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">По запросу «{query}» ничего не найдено.</p>
      ) : (
        <ul aria-label="Список объектов" className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((project) => {
            const floors = getFloors(project).length
            const has3D = withPanorama[project.id]
            return (
              <li key={project.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:border-brand-border hover:shadow-lg">
                <ProjectPreview projectId={project.id} name={project.name} drawings={project.drawings} />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="break-words text-lg font-bold text-ink">{project.name}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{project.description || 'Описание пока не добавлено.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-body">
                    <span className="rounded-lg bg-page px-3 py-2">Этажей: {floors}</span>
                    <span className={`rounded-lg px-3 py-2 ${has3D ? 'bg-brand-soft text-brand' : 'bg-page text-muted'}`}>
                      {has3D === undefined ? 'Проверяем панорамы…' : has3D ? 'Есть панорамы 360°' : 'Без панорам'}
                    </span>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Link to={`/objects/${project.id}?mode=2d`} state={{ source: 'objects-list' }}
                      className={`${linkClass} border border-brand-border text-brand hover:bg-brand-soft`}>
                      Открыть в 2D
                    </Link>
                    {has3D ? (
                      <Link to={`/objects/${project.id}?mode=3d`} state={{ source: 'objects-list' }}
                        className={`${linkClass} bg-brand text-white hover:bg-brand-hover`}>
                        Открыть в 3D
                      </Link>
                    ) : (
                      <button type="button" disabled title="Панорамы для этого объекта ещё не добавлены"
                        className={`${linkClass} cursor-not-allowed bg-surface-subtle !text-sm !font-semibold text-muted`}>
                        Открыть в 3D
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={() => setShared(project)}
                    className="mt-2 w-full rounded-lg border border-brand-border px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft">
                    Поделиться
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {shared && <ShareDialog project={shared} onClose={() => setShared(null)} />}
    </div>
  )
}
