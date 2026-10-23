import { useState, type FormEvent } from "react";
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Введи название проекта.");
      return;
    }

    const newProject = createProject(name, description);
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

  return (
    <section className="projects-page">
      <div className="page-heading">
        <div>
          <h2>Мои проекты</h2>
          <p>Создавай проекты, добавляй здания, этажи и панорамы.</p>
        </div>

        <button
          className="create-button"
          type="button"
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            setError("");
          }}
        >
          {isFormOpen ? "Отмена" : "+ Создать проект"}
        </button>
      </div>

      {isFormOpen && (
        <form className="project-form" onSubmit={handleSubmit}>
          <label htmlFor="project-name">Название проекта</label>
          <input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Выставочный центр"
            maxLength={120}
            required
          />

          <label htmlFor="project-description">Описание</label>
          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Кратко опиши пространство"
            maxLength={1000}
            rows={3}
          />

          {error && <p role="alert">{error}</p>}

          <button className="create-button" type="submit">
            Сохранить проект
          </button>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="projects-empty">
          <h3>Пока нет проектов</h3>
          <p>Создай первый проект — он появится здесь.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card-wrapper">
              <ProjectCard
                id={project.id}
                name={project.name}
                description={project.description}
                buildingsCount={0}
                floorsCount={0}
              />

              <button
                type="button"
                className="delete-project-button"
                onClick={() => handleDelete(project.id)}
              >
                Удалить проект
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProjectsPage;
