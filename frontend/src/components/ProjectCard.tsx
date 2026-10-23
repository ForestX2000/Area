
import { Link } from 'react-router-dom'

type ProjectCardProps = {
  id: string
  name: string
  description: string
  buildingsCount: number
  floorsCount: number
}

function ProjectCard({
  id,
  name,
  description,
  buildingsCount,
  floorsCount,
}: ProjectCardProps) {
  return (
    <article className="project-card">
      <div className="project-preview">
        <span className="preview-icon">⌖</span>
        <span className="project-badge">Проект</span>
      </div>

      <div className="project-info">
        <h3>{name}</h3>
        <p>{description}</p>

        <div className="project-meta">
          <span>Зданий: {buildingsCount}</span>
          <span>Этажей: {floorsCount}</span>
        </div>

        <Link
          to={`/projects/${id}`}
          className="project-open"
        >
          Открыть проект →
        </Link>
      </div>
    </article>
  )
}

export default ProjectCard
