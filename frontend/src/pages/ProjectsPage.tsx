<<<<<<< Updated upstream
import { useEffect, useState, type FormEvent } from "react";
import ProjectCard from "../components/ProjectCard";
=======
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { createWorkspace, getWorkspaces, saveWorkspaces } from '../utils/workspaceStorage';
import { getFloors } from '../utils/floorStorage';
import ProjectCard from "../components/ProjectCard";
import { useConfirmation } from '../contexts/useConfirmation';
import { countBy, filterEvents, useAnalyticsEvents } from '../utils/analytics';
>>>>>>> Stashed changes
import type { Project } from "../types/project";
import {
  createProject,
  getProjects,
  saveProjects,
} from "../utils/projectStorage";

function ProjectsPage() {
<<<<<<< Updated upstream
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
=======
  const confirm = useConfirmation();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [workspaces, setWorkspaces] = useState(() => getWorkspaces(projects, false));
  const [kind, setKind] = useState<'map' | 'workspace'>(() => searchParams.get('create') === 'workspace' ? 'workspace' : 'map');
  const [filter, setFilter] = useState<'all' | 'map' | 'workspace'>('all');
  const [isFormOpen, setIsFormOpen] = useState(() => searchParams.get('create') === 'workspace');
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const events = useAnalyticsEvents();
  const viewStats = useMemo(() => {
    const views = filterEvents(events, { days: 30 }).filter((event) => event.type === "view" && event.projectId);
    return { total: views.length, byProject: new Map(countBy(views, (event) => event.projectId)) };
  }, [events]);
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
=======
    if (kind === 'workspace') {
      const workspace = createWorkspace(name, [], description);
      const next = { ...workspaces, activeId: workspace.id, workspaces: [...workspaces.workspaces, workspace] };
      try {
        saveWorkspaces(next); setWorkspaces(next); setName(''); setDescription(''); setError(''); setIsFormOpen(false); setFilter('all');
      } catch { setError('Не удалось сохранить Workspace. Проверь доступное место в браузере.'); }
      return;
    }
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  function handleDelete(projectId: string) {
    const confirmed = window.confirm(
      "Ты уверена, что хочешь удалить этот проект? Это действие нельзя отменить.",
    );
=======
  async function handleDelete(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const confirmed = await confirm({ title: 'Удалить проект?', message: `Проект «${project.name}» будет удалён. Это действие нельзя отменить.` });
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    <div className="min-h-screen bg-[#F5F5F5] text-[#4A4A4A]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="mb-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#E23E1A]">
=======
    <div className="min-h-screen bg-page text-body">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="mb-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand">
>>>>>>> Stashed changes
            Твоё пространство
          </p>

          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
<<<<<<< Updated upstream
              <h2 className="text-3xl font-bold tracking-tight text-[#4A4A4A] sm:text-4xl">
                Мои проекты
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777777] sm:text-base">
=======
              <h2 className="text-3xl font-bold tracking-tight text-body sm:text-4xl">
                Мои проекты
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
>>>>>>> Stashed changes
                Организуй здания, планы помещений и панорамы в одном месте.
                Выбирай проект и продолжай работу с интерактивной картой.
              </p>
            </div>

<<<<<<< Updated upstream
            <div className="flex items-center gap-4 rounded-xl border border-[#E5E5E5] bg-white px-5 py-4">
              <div>
                <p className="text-2xl font-bold leading-6 text-[#4A4A4A]">
                  {projects.length}
                </p>
                <p className="mt-1 text-xs text-[#777777]">{projectWord}</p>
=======
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4 rounded-xl border border-line bg-surface px-5 py-4">
                <div>
                  <p className="text-2xl font-bold leading-6 text-body">
                    {projects.length + workspaces.workspaces.length}
                  </p>
                  <p className="mt-1 text-xs text-muted">{workspaces.workspaces.length ? 'проектов' : projectWord}</p>
                </div>
>>>>>>> Stashed changes
              </div>
            </div>
          </div>
        </section>


<<<<<<< Updated upstream
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-[#F2B8AA] bg-[#FCEBE7] p-4 text-sm text-[#A52C13]"
=======
        <nav aria-label="Фильтр проектов" className="mb-6 flex flex-wrap gap-2">
          {([{ value: 'all', label: 'Все' }, { value: 'map', label: 'Карты' }, { value: 'workspace', label: 'Workspace' }] as const).map((item) =>
            <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}
              className={`rounded-lg border px-4 py-2 text-sm ${filter === item.value ? 'border-brand-border bg-brand-soft text-brand' : 'border-line bg-surface hover:bg-surface-muted'}`}>{item.label}</button>)}
        </nav>
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-brand-border bg-brand-soft p-4 text-sm text-brand-strong"
>>>>>>> Stashed changes
          >
            <span className="font-bold">!</span>
            <p>{error}</p>
          </div>
        )}

        {isFormOpen && (
<<<<<<< Updated upstream
          <section className="mb-9 overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
            <div className="border-b border-[#E5E5E5] px-5 py-5 sm:px-7">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#E23E1A]">
                Новый объект
              </p>
              <h3 className="text-lg font-bold text-[#4A4A4A]">
                Создание проекта
              </h3>
              <p className="mt-1 text-sm text-[#777777]">
=======
          <section className="mb-9 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-5 sm:px-7">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand">
                Новый объект
              </p>
              <h3 className="text-lg font-bold text-body">
                Создание проекта
              </h3>
              <p className="mt-1 text-sm text-muted">
>>>>>>> Stashed changes
                Укажи название и при необходимости добавь описание пространства.
              </p>
            </div>

            <form className="grid gap-5 p-5 sm:p-7" onSubmit={handleSubmit}>
<<<<<<< Updated upstream
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
=======
              <label className="grid gap-2 text-sm font-semibold">Тип проекта
                <select aria-label="Тип проекта" value={kind} onChange={(event) => setKind(event.target.value as 'map' | 'workspace')} className="max-w-sm rounded-lg border border-line-strong bg-surface px-4 py-3">
                  <option value="map">Карта</option><option value="workspace">Workspace</option>
                </select>
              </label>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-body">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                    className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#4A4A4A] outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:ring-4 focus:ring-[#FCEBE7]"
=======
                    className="w-full rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft"
>>>>>>> Stashed changes
                  />
                </label>

                <label className="block">
<<<<<<< Updated upstream
                  <span className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
                    Описание
                    <span className="ml-2 font-normal text-[#999999]">
=======
                  <span className="mb-2 block text-sm font-semibold text-body">
                    Описание
                    <span className="ml-2 font-normal text-muted">
>>>>>>> Stashed changes
                      Необязательно
                    </span>
                  </span>
                  <input
                    id="project-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Кратко опиши пространство"
                    maxLength={1000}
<<<<<<< Updated upstream
                    className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#4A4A4A] outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:ring-4 focus:ring-[#FCEBE7]"
=======
                    className="w-full rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft"
>>>>>>> Stashed changes
                  />
                </label>
              </div>

<<<<<<< Updated upstream
              <div className="flex flex-col-reverse gap-3 border-t border-[#E5E5E5] pt-5 sm:flex-row sm:justify-end">
=======
              <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
>>>>>>> Stashed changes
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setName("");
                    setDescription("");
                    setError("");
                  }}
<<<<<<< Updated upstream
                  className="rounded-lg border border-[#D9D9D9] px-5 py-3 text-sm font-semibold text-[#4A4A4A] transition hover:bg-[#F5F5F5]"
=======
                  className="rounded-lg border border-line-strong px-5 py-3 text-sm font-semibold text-body transition hover:bg-page"
>>>>>>> Stashed changes
                >
                  Отмена
                </button>
                <button
                  type="submit"
<<<<<<< Updated upstream
                  className="rounded-lg bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus:outline-none focus:ring-4 focus:ring-[#FCEBE7]"
                >
                  Создать проект
=======
                  className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-soft"
                >
                  {kind === 'workspace' ? 'Создать Workspace' : 'Создать проект'}
>>>>>>> Stashed changes
                </button>
              </div>
            </form>
          </section>
        )}

<<<<<<< Updated upstream
        {projects.length === 0 ? (
          <section className="rounded-xl border border-dashed border-[#D0D0D0] bg-white px-6 py-16 text-center sm:py-20">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[#FCEBE7] text-[#E23E1A]">
=======
        {projects.length === 0 && workspaces.workspaces.length === 0 ? (
          <section className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center sm:py-20">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-brand-soft text-brand">
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
            <h3 className="text-xl font-bold text-[#4A4A4A]">
              Начни с первого проекта
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#777777]">
=======
            <h3 className="text-xl font-bold text-body">
              Начни с первого проекта
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                className="mt-6 rounded-lg bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus:outline-none focus:ring-4 focus:ring-[#FCEBE7]"
=======
                className="mt-6 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-soft"
>>>>>>> Stashed changes
              >
                + Создать первый проект
              </button>
            )}
          </section>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
<<<<<<< Updated upstream
              <h3 className="text-sm font-bold text-[#4A4A4A]">Все проекты</h3>
              <span className="text-xs text-[#777777]">
                {projects.length} в списке
=======
              <h3 className="text-sm font-bold text-body">Все проекты</h3>
              <span className="text-xs text-muted">
                {(filter === 'map' ? projects.length : filter === 'workspace' ? workspaces.workspaces.length : projects.length + workspaces.workspaces.length)} в списке
>>>>>>> Stashed changes
              </span>
            </div>

            <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 2xl:grid-cols-3">
<<<<<<< Updated upstream
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="group min-w-0 overflow-hidden rounded-xl border border-[#E5E5E5] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#F2B8AA] hover:shadow-lg hover:shadow-[#4A4A4A]/5"
                >
                  <div className="relative flex h-28 items-center justify-center overflow-hidden bg-[#4A4A4A]">
                    <div className="absolute -right-6 -top-10 h-32 w-32 rounded-full border-[20px] border-white/5" />
                    <div className="absolute -bottom-12 -left-4 h-28 w-28 rounded-full border-[16px] border-[#E23E1A]/40" />

                    <div className="absolute left-0 top-0 h-full w-1 bg-[#E23E1A]" />
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
=======
              {(filter === 'all' || filter === 'map') && projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  buildingsCount={0}
                  floorsCount={getFloors(project).length}
                  drawings={project.drawings}
                  stats={{ views: viewStats.byProject.get(project.id) ?? 0, share: viewStats.total ? (viewStats.byProject.get(project.id) ?? 0) / viewStats.total : 0 }}
                  onDelete={() => handleDelete(project.id)}
                />
              ))}
              {(filter === 'all' || filter === 'workspace') && workspaces.workspaces.map((workspace) => <ProjectCard key={`workspace-${workspace.id}`}
                id={workspace.id} name={workspace.name} description={workspace.description || 'Общее пространство для карт и контейнеров.'} buildingsCount={0} floorsCount={0}
                workspace={workspace} projects={projects} onDelete={async () => {
                  if (!await confirm({ title: 'Удалить Workspace?', message: `Workspace «${workspace.name}» будет удалён. Карты останутся в проектах.` })) return;
                  const remaining = workspaces.workspaces.filter((item) => item.id !== workspace.id);
                  const next = { ...workspaces, workspaces: remaining, activeId: workspaces.activeId === workspace.id ? remaining[0]?.id ?? '' : workspaces.activeId };
                  try { saveWorkspaces(next); setWorkspaces(next); } catch { setError('Не удалось удалить Workspace.'); }
                }} />)}
            </div>
            {((filter === 'map' && projects.length === 0) || (filter === 'workspace' && workspaces.workspaces.length === 0)) && <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">В этой категории пока нет проектов.</p>}
>>>>>>> Stashed changes
          </section>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;
