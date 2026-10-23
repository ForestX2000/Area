
import { useState, type FormEvent } from 'react'
import ProjectCard from '../components/ProjectCard'
import type { Project } from '../types/project'
import {
  createProject,
  getProjects,
  saveProjects,
} from '../utils/projectStorage'

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 ${className ?? ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 ${className ?? ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(() => getProjects())
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [error, setError] = useState('')

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!createName.trim()) {
      setError('Введи название проекта.')
      return
    }

    const newProject = createProject(createName, createDescription)
    const updatedProjects = [...projects, newProject]

    try {
      saveProjects(updatedProjects)
      setProjects(updatedProjects)
      setCreateName('')
      setCreateDescription('')
      setError('')
      setIsCreateFormOpen(false)
    } catch {
      setError(
        'Не удалось сохранить проект. Проверь доступное место в браузере.',
      )
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id)
    setEditName(project.name)
    setEditDescription(project.description)
    setError('')
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editName.trim()) {
      setError('Введи название проекта.')
      return
    }

    const updatedProject: Project = {
      ...projects.find((p) => p.id === editingId)!,
      name: editName.trim(),
      description: editDescription.trim(),
    }

    const updatedProjects = projects.map((p) =>
      p.id === editingId ? updatedProject : p,
    )

    try {
      saveProjects(updatedProjects)
      setProjects(updatedProjects)
      setEditingId(null)
      setError('')
    } catch {
      setError('Не удалось сохранить изменения. Попробуй ещё раз.')
    }
  }

  function cancelEditing() {
    setEditingId(null)
    setError('')
  }

  function handleDelete(projectId: string) {
    const confirmed = window.confirm(
      'Ты уверена, что хочешь удалить этот проект? Это действие нельзя отменить.',
    )

    if (!confirmed) return

    const updatedProjects = projects.filter(
      (project) => project.id !== projectId,
    )

    try {
      saveProjects(updatedProjects)
      setProjects(updatedProjects)
      if (editingId === projectId) setEditingId(null)
      setError('')
    } catch {
      setError('Не удалось удалить проект. Попробуй ещё раз.')
    }
  }

  return (
    <section className="projects-page">
      <div className="page-heading">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Мои проекты</h2>
          <p className="text-slate-500">
            Создавай проекты, добавляй здания, этажи и панорамы.
          </p>
        </div>

        <button
          className="create-button"
          type="button"
          onClick={() => {
            setIsCreateFormOpen(!isCreateFormOpen)
            setError('')
          }}
        >
          {isCreateFormOpen ? 'Отмена' : '+ Создать проект'}
        </button>
      </div>

      {isCreateFormOpen && (
        <form className="project-form" onSubmit={handleCreateSubmit}>
          <label htmlFor="project-name" className="form-label">
            Название проекта
          </label>
          <input
            id="project-name"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Например, Выставочный центр"
            maxLength={120}
            required
            className="form-input"
          />

          <label htmlFor="project-description" className="form-label">
            Описание
          </label>
          <textarea
            id="project-description"
            value={createDescription}
            onChange={(event) => setCreateDescription(event.target.value)}
            placeholder="Кратко опиши пространство"
            maxLength={1000}
            rows={3}
            className="form-textarea"
          />

          {error && <p role="alert" className="form-error">{error}</p>}

          <div className="form-actions">
            <button className="create-button" type="submit">
              Сохранить проект
            </button>
            <button
              type="button"
              className="form-cancel"
              onClick={() => {
                setIsCreateFormOpen(false)
                setError('')
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="projects-empty">
          <div className="empty-icon">⌖</div>
          <h3 className="text-lg font-semibold text-slate-900">
            Пока нет проектов
          </h3>
          <p className="text-slate-500">
            Создай первый проект — он появится здесь.
          </p>
          {!isCreateFormOpen && (
            <button
              type="button"
              className="mt-4 create-button"
              onClick={() => setIsCreateFormOpen(true)}
            >
              + Создать проект
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => {
            const isEditing = editingId === project.id

            return (
              <div key={project.id} className="project-card-wrapper">
                {!isEditing ? (
                  <>
                    <ProjectCard
                      id={project.id}
                      name={project.name}
                      description={project.description}
                      buildingsCount={0}
                      floorsCount={0}
                    />

                    <div className="project-actions">
                      <button
                        type="button"
                        className="edit-project-button"
                        title="Редактировать проект"
                        onClick={() => startEditing(project)}
                        aria-label={`Редактировать ${project.name}`}
                      >
                        <PencilIcon className="text-indigo-600" />
                        <span className="sr-only">Редактировать</span>
                      </button>

                      <button
                        type="button"
                        className="delete-project-button"
                        title="Удалить проект"
                        onClick={() => handleDelete(project.id)}
                        aria-label={`Удалить ${project.name}`}
                      >
                        <TrashIcon className="text-red-500" />
                        <span className="sr-only">Удалить</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <form className="edit-form" onSubmit={handleEditSubmit}>
                    <div className="edit-field">
                      <label htmlFor="edit-name" className="form-label">
                        Название
                      </label>
                      <input
                        id="edit-name"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        maxLength={120}
                        required
                        className="form-input"
                        autoFocus
                      />
                    </div>

                    <div className="edit-field">
                      <label htmlFor="edit-description" className="form-label">
                        Описание
                      </label>
                      <textarea
                        id="edit-description"
                        value={editDescription}
                        onChange={(event) =>
                          setEditDescription(event.target.value)
                        }
                        maxLength={1000}
                        rows={3}
                        className="form-textarea"
                      />
                    </div>

                    {error && (
                      <p role="alert" className="form-error">{error}</p>
                    )}

                    <div className="form-actions">
                      <button className="create-button" type="submit">
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="form-cancel"
                        onClick={cancelEditing}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && !isCreateFormOpen && editingId === null && (
        <p role="alert" className="form-error">{error}</p>
      )}
    </section>
  );
}

export default ProjectsPage;
