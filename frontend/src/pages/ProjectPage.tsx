import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProjects, saveProjects } from '../utils/projectStorage'
import type { Project } from '../types/project'

type EditableField = 'name' | 'description'

function EditButton({ field, onClick }: { field: EditableField; onClick: () => void }) {
  const label = field === 'name' ? 'Редактировать название' : 'Редактировать описание'
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m16 3 5 5M4 16l-1 5 5-1L21 7a2.1 2.1 0 0 0-4-4L4 16Z" />
      </svg>
    </button>
  )
}

export default function ProjectPage() {
  const { projectId } = useParams()

  const [projects, setProjects] = useState<Project[]>(() => getProjects())
  const project = projects.find((item) => item.id === projectId)

  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (editingField) {
      if (!dialog.open) dialog.showModal()
      const field = editingField === 'name' ? nameRef.current : descriptionRef.current
      field?.focus()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [editingField])

  function startEditing(field: EditableField) {
    if (!project) return

    setName(project.name)
    setDescription(project.description)
    setError('')
    setEditingField(field)
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
      setEditingField(null)
      setError('')
    } catch {
      setError('Не удалось сохранить изменения. Попробуй ещё раз.')
    }
  }

  if (!project) {
    return (
      <section className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-ink">
          Проект не найден
        </h1>

        <p className="mt-2 text-muted">
          Возможно, проект был удалён или ссылка устарела.
        </p>

        <Link
          to="/"
          className="mt-4 inline-flex text-sm font-medium text-brand hover:text-brand-hover"
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
        className="text-sm font-medium text-brand hover:text-brand-hover"
      >
        ← Назад к проектам
      </Link>

      <div className="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-8">
        <p className="text-sm font-medium text-brand">
          ПРОЕКТ
        </p>

        <div className="mt-2 flex items-start gap-2">
          <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {project.name}
          </h1>
          <EditButton field="name" onClick={() => startEditing('name')} />
        </div>

        <div className="mt-3 flex items-start gap-2">
          <p className="min-w-0 whitespace-pre-line break-words text-muted">
            {project.description || 'Описание пока не добавлено.'}
          </p>
          <EditButton field="description" onClick={() => startEditing('description')} />
        </div>

        <p className="mt-4 text-sm text-muted">
          ID проекта: {project.id}
        </p>

        <p className="mt-2 text-sm text-muted">
          Создан: {new Date(project.createdAt).toLocaleDateString('ru-RU')}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/projects/${project.id}/map`}
            className="inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            Открыть карту
          </Link>

          <Link
            to={`/projects/${project.id}/editor`}
            className="inline-flex rounded-lg border border-line-strong px-4 py-2.5 text-sm font-semibold text-body hover:bg-surface-muted transition"
          >
            Редактор чертежа
          </Link>
        </div>
      </div>

      <dialog ref={dialogRef} aria-labelledby="edit-project-title"
        onCancel={(event) => { event.preventDefault(); setEditingField(null) }}
        className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-white p-6 text-body shadow-xl backdrop:bg-black/35 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="edit-project-title" className="text-xl font-bold text-ink">Редактирование проекта</h2>
          <button type="button" aria-label="Закрыть окно редактирования" onClick={() => setEditingField(null)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
          <div className="grid gap-1">
            <label htmlFor="edit-project-name" className="text-sm font-medium">
              Название проекта
            </label>
            <input
              id="edit-project-name"
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
              className="rounded-lg border border-line-strong px-3 py-2"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="edit-project-description" className="text-sm font-medium">
              Описание
            </label>
            <textarea
              id="edit-project-description"
              ref={descriptionRef}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={4}
              className="rounded-lg border border-line-strong px-3 py-2"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-brand-hover">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Сохранить изменения
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingField(null)
                setError('')
              }}
              className="rounded-lg border border-line-strong px-4 py-2.5 text-sm font-semibold text-body hover:bg-surface-muted"
            >
              Отмена
            </button>
          </div>
        </form>
      </dialog>
    </section>
  )
}
