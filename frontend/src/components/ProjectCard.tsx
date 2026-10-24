import { Link } from "react-router-dom";
import ProjectPreview from "./ProjectPreview";
import type { DrawingObject } from "../types/drawing";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string;
  buildingsCount: number;
  floorsCount: number;
  drawings?: DrawingObject[];
  onDelete?: () => void;
};

function ProjectCard({
  id,
  name,
  description,
  buildingsCount,
  floorsCount,
  drawings,
  onDelete,
}: ProjectCardProps) {
  return (
    <article className="project-card overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-border hover:shadow-lg">
      <ProjectPreview key={id} projectId={id} name={name} drawings={drawings} />

      <div className="project-info p-5">
        <h3 className="break-words text-lg font-bold text-body">
          {name}
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
          {description || "Описание проекта пока не добавлено."}
        </p>

        <div className="project-meta mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg bg-page px-3 py-2 text-xs font-medium text-body">
            Зданий: {buildingsCount}
          </span>

          <span className="rounded-lg bg-page px-3 py-2 text-xs font-medium text-body">
            Этажей: {floorsCount}
          </span>
        </div>

        <Link
          to={`/projects/${id}`}
          className="project-open mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[13px] font-normal leading-normal text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-border"
        >
          Открыть проект <span aria-hidden="true">→</span>
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
