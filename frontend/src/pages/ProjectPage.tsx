
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProjects, saveProjects } from '../utils/projectStorage'
import type { Project } from '../types/project'

export default function ProjectPage() {
  const { projectId } = useParams()

  const [projects, setProjects] = useState<Project[]>(() => getProjects())
  const project = projects.find((item) => item.id === projectId)

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  function startEditing() {
    if (!project) return

    setName(project.name)
    setDescription(project.description)
    setError('')
    setIsEditing(true)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project || !name.trim()) {
      setError('Введи название проекта.')
      return
    }

    const updatedProject: Project = {
      ...project,
      name: name.trim(),
      description: description.trim(),
    }

    const updatedProjects = projects.map((item) =>
      item.id === project.id ? updatedProject : item,
    )

    try {
      saveProjects(updatedProjects)
      setProjects(updatedProjects)
      setIsEditing(false)
      setError('')
    } catch {
      setError('Не удалось сохранить изменения. Попробуй ещё раз.')
    }
  }

  if (!project) {
    return (
      <section className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Проект не найден
        </h1>

        <p className="mt-2 text-slate-500">
          Возможно, проект был удалён или ссылка устарела.
        </p>

        <Link
          to="/"
          className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Назад к проектам
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl">
      <Link
        to="/"
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← Назад к проектам
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-sm font-medium text-indigo-600">
          ПРОЕКТ
        </p>

        {!isEditing ? (
          <>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {project.name}
            </h1>

            <p className="mt-3 text-slate-500">
              {project.description || 'Описание пока не добавлено.'}
            </p>

            <p className="mt-4 text-sm text-slate-400">
              ID проекта: {project.id}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Создан: {new Date(project.createdAt).toLocaleDateString('ru-RU')}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startEditing}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Редактировать
              </button>

              <Link
                to={`/projects/${project.id}/map`}
                className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Открыть карту
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
            <div className="grid gap-1">
              <label htmlFor="edit-project-name" className="text-sm font-medium">
                Название проекта
              </label>
              <input
                id="edit-project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div className="grid gap-1">
              <label htmlFor="edit-project-description" className="text-sm font-medium">
                Описание
              </label>
              <textarea
                id="edit-project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                rows={4}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Сохранить изменения
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setError('')
                }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
