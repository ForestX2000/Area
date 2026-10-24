import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import ProjectCard from "../components/ProjectCard";
import type { Project } from "../types/project";
import {
  createProject,
  getProjects,
  saveProjects,
} from "../utils/projectStorage";

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
      saveProjects(updatedProjects);
      setProjects(updatedProjects);
      setName("");
      setDescription("");
      setError("");
      setIsFormOpen(false);
    } catch {
      setError(
        "Не удалось сохранить проект. Проверь доступное место в браузере.",
      );
    }
  }

  function handleDelete(projectId: string) {
    const confirmed = window.confirm(
      "Ты уверена, что хочешь удалить этот проект? Это действие нельзя отменить.",
    );

    if (!confirmed) return;

    const updatedProjects = projects.filter(
      (project) => project.id !== projectId,
    );

    try {
      saveProjects(updatedProjects);
      setProjects(updatedProjects);
      setError("");
    } catch {
      setError("Не удалось удалить проект. Попробуй ещё раз.");
    }
  }

  const projectWord =
    projects.length === 1
      ? "проект"
      : projects.length >= 2 && projects.length <= 4
        ? "проекта"
        : "проектов";

  return (
    <div className="min-h-screen bg-page text-body">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="mb-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand">
            Твоё пространство
          </p>

          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-body sm:text-4xl">
                Мои проекты
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Организуй здания, планы помещений и панорамы в одном месте.
                Выбирай проект и продолжай работу с интерактивной картой.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/workspace" className="rounded-lg bg-brand px-4 py-2.5 text-white transition hover:bg-brand-hover">2D Workspace</Link>
              <div className="flex items-center gap-4 rounded-xl border border-line bg-white px-5 py-4">
                <div>
                  <p className="text-2xl font-bold leading-6 text-body">
                    {projects.length}
                  </p>
                  <p className="mt-1 text-xs text-muted">{projectWord}</p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-brand-border bg-brand-soft p-4 text-sm text-brand-strong"
          >
            <span className="font-bold">!</span>
            <p>{error}</p>
          </div>
        )}

        {isFormOpen && (
          <section className="mb-9 overflow-hidden rounded-xl border border-line bg-white">
            <div className="border-b border-line px-5 py-5 sm:px-7">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand">
                Новый объект
              </p>
              <h3 className="text-lg font-bold text-body">
                Создание проекта
              </h3>
              <p className="mt-1 text-sm text-muted">
                Укажи название и при необходимости добавь описание пространства.
              </p>
            </div>

            <form className="grid gap-5 p-5 sm:p-7" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-body">
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
                    className="w-full rounded-lg border border-line-strong bg-white px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-body">
                    Описание
                    <span className="ml-2 font-normal text-muted">
                      Необязательно
                    </span>
                  </span>
                  <input
                    id="project-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Кратко опиши пространство"
                    maxLength={1000}
                    className="w-full rounded-lg border border-line-strong bg-white px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setName("");
                    setDescription("");
                    setError("");
                  }}
                  className="rounded-lg border border-line-strong px-5 py-3 text-sm font-semibold text-body transition hover:bg-page"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-soft"
                >
                  Создать проект
                </button>
              </div>
            </form>
          </section>
        )}

        {projects.length === 0 ? (
          <section className="rounded-xl border border-dashed border-line-strong bg-white px-6 py-16 text-center sm:py-20">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-brand-soft text-brand">
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

            <h3 className="text-xl font-bold text-body">
              Начни с первого проекта
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
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
                className="mt-6 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-soft"
              >
                + Создать первый проект
              </button>
            )}
          </section>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-body">Все проекты</h3>
              <span className="text-xs text-muted">
                {projects.length} в списке
              </span>
            </div>

            <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  buildingsCount={0}
                  floorsCount={0}
                  drawings={project.drawings}
                  onDelete={() => handleDelete(project.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;
