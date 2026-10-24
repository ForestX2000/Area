from app.repositories.project_repository import project_repository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def get_all_projects(self):
        return project_repository.get_all()

    def get_project(self, project_id: str):
        return project_repository.get_by_id(project_id)

    def create_project(self, project: ProjectCreate):
        return project_repository.create(project)

    def update_project(
        self,
        project_id: str,
        project: ProjectUpdate,
    ):
        return project_repository.update(project_id, project)

    def delete_project(self, project_id: str):
        return project_repository.delete(project_id)


project_service = ProjectService()
