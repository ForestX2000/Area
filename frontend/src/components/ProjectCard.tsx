import { Link } from "react-router-dom";
<<<<<<< Updated upstream
=======
import ProjectPreview from "./ProjectPreview";
import type { DrawingObject } from "../types/drawing";
import type { Workspace } from "../types/workspace";
import type { Project } from "../types/project";
>>>>>>> Stashed changes

type ProjectCardProps = {
  id: string;
  name: string;
  description: string;
  buildingsCount: number;
  floorsCount: number;
<<<<<<< Updated upstream
=======
  drawings?: DrawingObject[];
  onDelete?: () => void;
  workspace?: Workspace;
  projects?: Project[];
  /** Просмотры карты за последние 30 дней и доля от всех просмотров карт. */
  stats?: { views: number; share: number };
>>>>>>> Stashed changes
};

function ProjectCard({
  id,
  name,
  description,
  buildingsCount,
  floorsCount,
<<<<<<< Updated upstream
}: ProjectCardProps) {
  return (
    <article className="project-card overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#F2B8AA] hover:shadow-lg">
      <div className="project-preview relative flex min-h-36 items-center justify-center bg-[#FCEBE7]">
        <span className="preview-icon text-5xl text-[#E23E1A]" aria-hidden="true">
          ⌖
        </span>

        <span className="project-badge absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#E23E1A]">
          Проект
        </span>
      </div>

      <div className="project-info p-5">
        <h3 className="break-words text-lg font-bold text-[#4A4A4A]">
          {name}
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#777777]">
=======
  drawings,
  onDelete,
  workspace, projects = [], stats,
}: ProjectCardProps) {
  return (
    <article data-project-kind={workspace ? 'workspace' : 'map'} className="project-card overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-border hover:shadow-lg">
      {workspace ? <div className="relative grid h-44 grid-cols-2 overflow-hidden bg-page">
        {workspace.nodes.slice(0, 4).map((node) => {
          const project = projects.find((project) => project.id === node.projectId)
          return project ? <div key={node.projectId} className="min-h-0 overflow-hidden border border-line [&_.project-preview]:h-full [&_.project-preview>span]:hidden">
            <ProjectPreview projectId={project.id} name={project.name} drawings={project.drawings} mode="map" />
          </div> : null
        })}
        {workspace.nodes.length === 0 && <p className="col-span-2 self-center text-center text-sm text-muted">Добавьте карты в Workspace</p>}
        <span className="absolute left-3 top-3 rounded-full border border-line bg-surface/95 px-3 py-1 text-xs text-body">Workspace</span>
      </div> : <ProjectPreview key={id} projectId={id} name={name} drawings={drawings} />}

      <div className="project-info p-5">
        <h3 className="break-words text-lg font-bold text-body">
          {name}
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
>>>>>>> Stashed changes
          {description || "Описание проекта пока не добавлено."}
        </p>

        <div className="project-meta mt-4 flex flex-wrap gap-2">
<<<<<<< Updated upstream
          <span className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs font-medium text-[#4A4A4A]">
            Зданий: {buildingsCount}
          </span>

          <span className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs font-medium text-[#4A4A4A]">
            Этажей: {floorsCount}
=======
          <span className="rounded-lg bg-page px-3 py-2 text-xs font-medium text-body">
            {workspace ? `Карт: ${workspace.nodes.length}` : `Зданий: ${buildingsCount}`}
          </span>

          <span className="rounded-lg bg-page px-3 py-2 text-xs font-medium text-body">
            {workspace ? `Контейнеров: ${workspace.groups.length}` : `Этажей: ${floorsCount}`}
>>>>>>> Stashed changes
          </span>
        </div>

        <Link
<<<<<<< Updated upstream
          to={`/projects/${id}`}
          className="project-open mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E23E1A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F2B8AA]"
        >
          Открыть проект <span aria-hidden="true">→</span>
        </Link>
=======
          to={workspace ? `/workspace/${id}` : `/projects/${id}`}
          className="project-open mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[13px] font-normal leading-normal text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-border"
        >
          {workspace ? 'Открыть Workspace' : 'Открыть проект'} <span aria-hidden="true">→</span>
        </Link>
        {!workspace && (
          <Link to={`/stats/${id}`} aria-label={`Посмотреть статистику: ${name}`}
            className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[13px] text-body transition hover:border-brand-border hover:bg-brand-soft hover:text-brand">
            <span>Посмотреть статистику</span>
            {stats && <span className="text-xs text-muted">{stats.views.toLocaleString('ru-RU')} просм. · {Math.round(stats.share * 100)}%</span>}
          </Link>
        )}
        {onDelete && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <button type="button" onClick={onDelete}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-muted transition hover:bg-brand-soft hover:text-brand">
              Удалить
            </button>
          </div>
        )}
>>>>>>> Stashed changes
      </div>
    </article>
  );
}

<<<<<<< Updated upstream
export default ProjectCard;
=======
export default ProjectCard;
>>>>>>> Stashed changes
