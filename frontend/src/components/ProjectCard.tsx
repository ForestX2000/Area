import { Link } from "react-router-dom";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string;
  buildingsCount: number;
  floorsCount: number;
};

function ProjectCard({
  id,
  name,
  description,
  buildingsCount,
  floorsCount,
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
          {description || "Описание проекта пока не добавлено."}
        </p>

        <div className="project-meta mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs font-medium text-[#4A4A4A]">
            Зданий: {buildingsCount}
          </span>

          <span className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs font-medium text-[#4A4A4A]">
            Этажей: {floorsCount}
          </span>
        </div>

        <Link
          to={`/projects/${id}`}
          className="project-open mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E23E1A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F2B8AA]"
        >
          Открыть проект <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export default ProjectCard;