import { useEffect, useState, type FormEvent } from "react";
import ProjectCard from "../components/ProjectCard";
import type { Project } from "../types/project";
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
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function handleToggleForm() {
      setIsFormOpen((open) => !open);
      setError("");
    }

    window.addEventListener("space-map:toggle-project-form", handleToggleForm);

    return () => {
      window.removeEventListener(
        "space-map:toggle-project-form",
        handleToggleForm,
      );
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Введи название проекта.");
      return;
    }

    const newProject = createProject(name.trim(), description.trim());
    const updatedProjects = [...projects, newProject];

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

  const projectWord =
    projects.length === 1
      ? "проект"
      : projects.length >= 2 && projects.length <= 4
        ? "проекта"
        : "проектов";

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#4A4A4A]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="mb-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#E23E1A]">
            Твоё пространство
          </p>

          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#4A4A4A] sm:text-4xl">
                Мои проекты
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777777] sm:text-base">
                Организуй здания, планы помещений и панорамы в одном месте.
                Выбирай проект и продолжай работу с интерактивной картой.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-[#E5E5E5] bg-white px-5 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FCEBE7] text-[#E23E1A]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect x="4" y="4" width="6" height="6" rx="1.5" />
                  <rect x="14" y="4" width="6" height="6" rx="1.5" />
                  <rect x="4" y="14" width="6" height="6" rx="1.5" />
                  <rect x="14" y="14" width="6" height="6" rx="1.5" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold leading-6 text-[#4A4A4A]">
                  {projects.length}
                </p>
                <p className="mt-1 text-xs text-[#777777]">{projectWord}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Сообщения об ошибках */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-[#F2B8AA] bg-[#FCEBE7] p-4 text-sm text-[#A52C13]"
          >
            <span className="font-bold">!</span>
            <p>{error}</p>
          </div>
        )}

        {/* Форма создания проекта */}
        {isFormOpen && (
          <section className="mb-9 overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
            <div className="border-b border-[#E5E5E5] px-5 py-5 sm:px-7">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#E23E1A]">
                Новый объект
              </p>
              <h3 className="text-lg font-bold text-[#4A4A4A]">
                Создание проекта
              </h3>
              <p className="mt-1 text-sm text-[#777777]">
                Укажи название и при необходимости добавь описание пространства.
              </p>
            </div>

            <form className="grid gap-5 p-5 sm:p-7" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
                    Название проекта
                  </span>
                  <input
                    id="project-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Например, Выставочный центр"
                    maxLength={120}
                    required
                    autoFocus
                    className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#4A4A4A] outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:ring-4 focus:ring-[#FCEBE7]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
                    Описание
                    <span className="ml-2 font-normal text-[#999999]">
                      Необязательно
                    </span>
                  </span>
                  <input
                    id="project-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Кратко опиши пространство"
                    maxLength={1000}
                    className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#4A4A4A] outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:ring-4 focus:ring-[#FCEBE7]"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#E5E5E5] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setName("");
                    setDescription("");
                    setError("");
                  }}
                  className="rounded-lg border border-[#D9D9D9] px-5 py-3 text-sm font-semibold text-[#4A4A4A] transition hover:bg-[#F5F5F5]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus:outline-none focus:ring-4 focus:ring-[#FCEBE7]"
                >
                  Создать проект
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Проекты */}
        {projects.length === 0 ? (
          <section className="rounded-xl border border-dashed border-[#D0D0D0] bg-white px-6 py-16 text-center sm:py-20">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[#FCEBE7] text-[#E23E1A]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path d="M3 6.5 9 3l6 3 6-3v14.5L15 21l-6-3-6 3V6.5Z" />
                <path d="M9 3v15M15 6v15" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-[#4A4A4A]">
              Начни с первого проекта
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#777777]">
              Создай пространство, загрузи план помещения и отметь места, к
              которым хочешь прикрепить панорамы.
            </p>

            {!isFormOpen && (
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(true);
                  setError("");
                }}
                className="mt-6 rounded-lg bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus:outline-none focus:ring-4 focus:ring-[#FCEBE7]"
              >
                + Создать первый проект
              </button>
            )}
          </section>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#4A4A4A]">Все проекты</h3>
              <span className="text-xs text-[#777777]">
                {projects.length} в списке
              </span>
            </div>

            <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="group min-w-0 overflow-hidden rounded-xl border border-[#E5E5E5] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#F2B8AA] hover:shadow-lg hover:shadow-[#4A4A4A]/5"
                >
                  {/* Фирменная шапка карточки */}
                  <div className="relative flex h-28 items-center justify-center overflow-hidden bg-[#4A4A4A]">
                    <div className="absolute -right-6 -top-10 h-32 w-32 rounded-full border-[20px] border-white/5" />
                    <div className="absolute -bottom-12 -left-4 h-28 w-28 rounded-full border-[16px] border-[#E23E1A]/40" />

                    <div className="absolute left-0 top-0 h-full w-1 bg-[#E23E1A]" />

                    <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur transition duration-200 group-hover:scale-105">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="h-7 w-7"
                        aria-hidden="true"
                      >
                        <path d="M3 6.5 9 3l6 3 6-3v14.5L15 21l-6-3-6 3V6.5Z" />
                        <path d="M9 3v15M15 6v15" />
                      </svg>
                    </div>

                    <span className="absolute right-3 top-3 rounded-md border border-white/15 bg-black/10 px-3 py-1 text-[11px] font-medium text-white/90">
                      ПРОЕКТ
                    </span>
                  </div>

                  <div className="min-w-0 p-5">
                    <ProjectCard
                      id={project.id}
                      name={project.name}
                      description={project.description}
                      buildingsCount={0}
                      floorsCount={0}
                    />

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E5E5E5] pt-4">
                      <span className="text-xs text-[#777777]">
                        Интерактивная карта
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-[#777777] transition hover:bg-[#FCEBE7] hover:text-[#E23E1A]"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;
