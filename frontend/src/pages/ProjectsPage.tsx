import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cleanGroups, createWorkspace, getWorkspaces, saveWorkspaces } from '../utils/workspaceStorage';
import { getFloors } from '../utils/floorStorage';
import ProjectCard from "../components/ProjectCard";
import FolderCard, { PROJECT_DRAG_TYPE } from "../components/FolderCard";
import { useConfirmation } from '../contexts/useConfirmation';
import { countBy, filterEvents, useAnalyticsEvents } from '../utils/analytics';
import type { Project } from "../types/project";
import type { Workspace } from "../types/workspace";
import {
  createProject,
  getProjects,
  saveProjects,
} from "../utils/projectStorage";

const inputClass = "w-full rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft";

function ProjectsPage() {
  const confirm = useConfirmation();
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [workspaces, setWorkspaces] = useState(() => getWorkspaces(projects, false));
  const [filter, setFilter] = useState<'all' | 'map' | 'workspace'>('all');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [addProjectId, setAddProjectId] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  // Пункт меню «Создать проект» ведёт на /?create=project — форма открывается так же, как по кнопке в шапке.
  const formOpen = isFormOpen || searchParams.has("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const events = useAnalyticsEvents();
  const viewStats = useMemo(() => {
    const views = filterEvents(events, { days: 30 }).filter((event) => event.type === "view" && event.projectId);
    return { total: views.length, byProject: new Map(countBy(views, (event) => event.projectId)) };
  }, [events]);

  const folders = workspaces.workspaces;
  const openFolder = folders.find((folder) => folder.id === openFolderId) ?? null;
  // Во вкладке Workspace без открытой папки форма создаёт папку, а не карту.
  const creatingFolder = filter === 'workspace' && !openFolder;

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    if (searchParams.has("create")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    function handleToggleForm() {
      if (formOpen) closeForm();
      else setIsFormOpen(true);
      setError("");
    }

    window.addEventListener("space-map:toggle-project-form", handleToggleForm);

    return () => {
      window.removeEventListener(
        "space-map:toggle-project-form",
        handleToggleForm,
      );
    };
  }, [formOpen, closeForm]);

  function saveFolders(next: Workspace[]) {
    const collection = { ...workspaces, workspaces: next, activeId: next.some((folder) => folder.id === workspaces.activeId) ? workspaces.activeId : next[0]?.id ?? '' };
    try {
      saveWorkspaces(collection);
      setWorkspaces(collection);
      setError("");
    } catch {
      setError("Не удалось сохранить папки. Проверь доступное место в браузере.");
    }
  }

  function addToFolder(folderId: string, projectId: string) {
    saveFolders(folders.map((folder) => {
      if (folder.id !== folderId || folder.nodes.some((node) => node.projectId === projectId)) return folder;
      const index = folder.nodes.length;
      return { ...folder, nodes: [...folder.nodes, { projectId, x: 40 + index % 3 * 320, y: 80 + Math.floor(index / 3) * 320 }] };
    }));
  }

  function removeFromFolder(folderId: string, projectId: string) {
    saveFolders(folders.map((folder) => {
      if (folder.id !== folderId) return folder;
      const nodes = folder.nodes.filter((node) => node.projectId !== projectId);
      return { ...folder, nodes, groups: cleanGroups(folder.groups, nodes) };
    }));
  }

  function resetForm() {
    setName("");
    setDescription("");
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError(creatingFolder ? "Введи название папки." : "Введи название проекта.");
      return;
    }

    if (creatingFolder) {
      saveFolders([...folders, createWorkspace(name.trim(), [], description.trim())]);
      resetForm();
      closeForm();
      return;
    }

    const newProject = createProject(name.trim(), description.trim());
    const updatedProjects = [...projects, newProject];

    try {
      saveProjects(updatedProjects);
      setProjects(updatedProjects);
      if (openFolder) addToFolder(openFolder.id, newProject.id);
      resetForm();
      closeForm();
    } catch {
      setError(
        "Не удалось сохранить проект. Проверь доступное место в браузере.",
      );
    }
  }

  async function handleDelete(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const confirmed = await confirm({ title: 'Удалить проект?', message: `Проект «${project.name}» будет удалён. Это действие нельзя отменить.` });

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

  async function handleDeleteFolder(folder: Workspace) {
    if (!await confirm({ title: 'Удалить папку?', message: `Папка «${folder.name}» будет удалена. Карты останутся в проектах.` })) return;
    if (openFolderId === folder.id) setOpenFolderId(null);
    saveFolders(folders.filter((item) => item.id !== folder.id));
  }

  const projectWord =
    projects.length === 1
      ? "проект"
      : projects.length >= 2 && projects.length <= 4
        ? "проекта"
        : "проектов";

  function projectCard(project: Project, extra?: ReactNode) {
    return (
      <div key={project.id} draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(PROJECT_DRAG_TYPE, project.id);
          event.dataTransfer.effectAllowed = 'copy';
        }}>
        <ProjectCard
          id={project.id}
          name={project.name}
          description={project.description}
          buildingsCount={0}
          floorsCount={getFloors(project).length}
          drawings={project.drawings}
          stats={{ views: viewStats.byProject.get(project.id) ?? 0, share: viewStats.total ? (viewStats.byProject.get(project.id) ?? 0) / viewStats.total : 0 }}
          onDelete={() => handleDelete(project.id)}
        />
        {extra}
      </div>
    );
  }

  const folderProjects = openFolder ? openFolder.nodes.map((node) => projects.find((project) => project.id === node.projectId)).filter((project): project is Project => Boolean(project)) : [];
  const outsideFolder = openFolder ? projects.filter((project) => !openFolder.nodes.some((node) => node.projectId === project.id)) : [];
  const shownFolders = filter === 'map' ? [] : folders;
  const shownProjects = filter === 'workspace' ? [] : projects;

  return (
    <div className="min-h-screen bg-page text-body">
      <div className="mx-auto max-w-[1400px] py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
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
                Складывай карты в папки, чтобы связанные объекты лежали рядом.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4 rounded-xl border border-line bg-surface px-5 py-4">
                <div>
                  <p className="text-2xl font-bold leading-6 text-body">
                    {projects.length}
                  </p>
                  <p className="mt-1 text-xs text-muted">{projectWord} · папок: {folders.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>


        <nav aria-label="Фильтр проектов" className="mb-6 flex flex-wrap gap-2">
          {([{ value: 'all', label: 'Все' }, { value: 'map', label: 'Карты' }, { value: 'workspace', label: 'Workspace' }] as const).map((item) =>
            <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setOpenFolderId(null); }}
              className={`rounded-lg border px-4 py-2 text-sm ${filter === item.value ? 'border-brand-border bg-brand-soft text-brand' : 'border-line bg-surface hover:bg-surface-muted'}`}>{item.label}</button>)}
        </nav>
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-brand-border bg-brand-soft p-4 text-sm text-brand-strong"
          >
            <span className="font-bold">!</span>
            <p>{error}</p>
          </div>
        )}

        {formOpen && (
          <section className="mb-9 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-5 sm:px-7">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand">
                {creatingFolder ? 'Новая папка' : openFolder ? `Новая карта в папке «${openFolder.name}»` : 'Новый объект'}
              </p>
              <h3 className="text-lg font-bold text-body">
                {creatingFolder ? 'Создание папки' : 'Создание проекта'}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {creatingFolder ? 'Назови папку — потом перетащи в неё карты.' : 'Укажи название и при необходимости добавь описание пространства.'}
              </p>
            </div>

            <form className="grid gap-5 p-5 sm:p-7" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-body">
                    {creatingFolder ? 'Название папки' : 'Название проекта'}
                  </span>
                  <input
                    id="project-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={creatingFolder ? "Например, Офисы на Ленина" : "Например, Выставочный центр"}
                    maxLength={120}
                    required
                    autoFocus
                    className={inputClass}
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
                    placeholder={creatingFolder ? "Что лежит в папке" : "Кратко опиши пространство"}
                    maxLength={1000}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    closeForm();
                    resetForm();
                  }}
                  className="rounded-lg border border-line-strong px-5 py-3 text-sm font-semibold text-body transition hover:bg-page"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-soft"
                >
                  {creatingFolder ? 'Создать папку' : 'Создать проект'}
                </button>
              </div>
            </form>
          </section>
        )}

        {openFolder ? (
          <section aria-label={`Папка ${openFolder.name}`}
            onDragOver={(event) => { if (event.dataTransfer.types.includes(PROJECT_DRAG_TYPE)) event.preventDefault(); }}
            onDrop={(event) => {
              const projectId = event.dataTransfer.getData(PROJECT_DRAG_TYPE);
              if (projectId) { event.preventDefault(); addToFolder(openFolder.id, projectId); }
            }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setOpenFolderId(null)} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-brand-soft">← Все папки</button>
                <h3 className="truncate text-lg font-bold text-body">{openFolder.name}</h3>
                <span className="text-xs text-muted">карт: {folderProjects.length}</span>
                <Link to={`/workspace/${openFolder.id}`} className="text-sm text-brand hover:underline">Открыть как доску</Link>
              </div>
              {outsideFolder.length > 0 && (
                <div className="flex items-center gap-2">
                  <select aria-label="Карта для папки" value={addProjectId} onChange={(event) => setAddProjectId(event.target.value)}
                    className="max-w-60 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                    <option value="">Выберите карту</option>
                    {outsideFolder.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                  <button type="button" disabled={!addProjectId} onClick={() => { addToFolder(openFolder.id, addProjectId); setAddProjectId(""); }}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-40">Добавить в папку</button>
                </div>
              )}
            </div>
            {folderProjects.length === 0
              ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">В папке пока нет карт. Выбери карту в списке выше или перетащи её на папку.</p>
              : <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {folderProjects.map((project) => projectCard(project,
                  <button type="button" onClick={() => removeFromFolder(openFolder.id, project.id)}
                    className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm text-muted hover:bg-brand-soft hover:text-brand">Убрать из папки</button>))}
              </div>}
          </section>
        ) : projects.length === 0 && folders.length === 0 && filter !== 'workspace' ? (
          <section className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center sm:py-20">
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

            {!formOpen && (
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
              <h3 className="text-sm font-bold text-body">{filter === 'workspace' ? 'Папки проектов' : 'Все проекты'}</h3>
              <span className="text-xs text-muted">
                {shownFolders.length + shownProjects.length} в списке
              </span>
            </div>
            {filter !== 'map' && folders.length > 0 && projects.length > 0 && (
              <p className="mb-4 text-xs text-muted">Перетащи карту на папку, чтобы положить её туда.</p>
            )}

            <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {shownFolders.map((folder) => <FolderCard key={`folder-${folder.id}`} folder={folder} projects={projects}
                onOpen={() => { setOpenFolderId(folder.id); setAddProjectId(""); }}
                onDelete={() => handleDeleteFolder(folder)}
                onDropProject={(projectId) => addToFolder(folder.id, projectId)} />)}
              {shownProjects.map((project) => projectCard(project))}
            </div>
            {filter === 'workspace' && folders.length === 0 && <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Нету папок проектов</p>}
            {filter === 'map' && projects.length === 0 && <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">В этой категории пока нет проектов.</p>}
          </section>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;
