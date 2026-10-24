import { Link } from "react-router-dom";
import ProjectPreview from "./ProjectPreview";
import type { DrawingObject } from "../types/drawing";
import type { Workspace } from "../types/workspace";
import type { Project } from "../types/project";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string;
  buildingsCount: number;
  floorsCount: number;
  drawings?: DrawingObject[];
  onDelete?: () => void;
  workspace?: Workspace;
  projects?: Project[];
};

function ProjectCard({
  id,
  name,
  description,
  buildingsCount,
  floorsCount,
  drawings,
  onDelete,
  workspace, projects = [],
}: ProjectCardProps) {
  return (
    <article data-project-kind={workspace ? 'workspace' : 'map'} className="project-card overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-border hover:shadow-lg">
      {workspace ? <div className="relative grid h-44 grid-cols-2 overflow-hidden bg-page">
        {workspace.nodes.slice(0, 4).map((node) => {
          const project = projects.find((project) => project.id === node.projectId)
          return project ? <div key={node.projectId} className="min-h-0 overflow-hidden border border-line [&_.project-preview]:h-full [&_.project-preview>span]:hidden">
            <ProjectPreview projectId={project.id} name={project.name} drawings={project.drawings} mode="map" />
          </div> : null
        })}
        {workspace.nodes.length === 0 && <p className="col-span-2 self-center text-center text-sm text-muted">Добавьте карты в Workspace</p>}
        <span className="absolute left-3 top-3 rounded-full border border-line bg-white/95 px-3 py-1 text-xs text-body">Workspace</span>
      </div> : <ProjectPreview key={id} projectId={id} name={name} drawings={drawings} />}

      <div className="project-info p-5">
        <h3 className="break-words text-lg font-bold text-body">
          {name}
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
          {description || "Описание проекта пока не добавлено."}
        </p>

        <div className="project-meta mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg bg-page px-3 py-2 text-xs font-medium text-body">
            {workspace ? `Карт: ${workspace.nodes.length}` : `Зданий: ${buildingsCount}`}
          </span>

          <span className="rounded-lg bg-page px-3 py-2 text-xs font-medium text-body">
            {workspace ? `Контейнеров: ${workspace.groups.length}` : `Этажей: ${floorsCount}`}
          </span>
        </div>

        <Link
          to={workspace ? `/workspace/${id}` : `/projects/${id}`}
          className="project-open mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[13px] font-normal leading-normal text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-border"
        >
          {workspace ? 'Открыть Workspace' : 'Открыть проект'} <span aria-hidden="true">→</span>
        </Link>
        {onDelete && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <button type="button" onClick={onDelete}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-muted transition hover:bg-brand-soft hover:text-brand">
              Удалить
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default ProjectCard;
