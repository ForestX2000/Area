
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectRepository:
    def __init__(self):
        self.projects = {}

    def get_all(self):
        return list(self.projects.values())

    def get_by_id(self, project_id: str):
        return self.projects.get(project_id)

    def create(self, project: ProjectCreate):
        now = datetime.now(timezone.utc)

        new_project = {
            "id": str(uuid4()),
            "name": project.name,
            "description": project.description,
            "data": project.data,
            "created_at": now,
            "updated_at": now,
        }

        self.projects[new_project["id"]] = new_project

        return new_project

    def update(self, project_id: str, project: ProjectUpdate):
        existing_project = self.projects.get(project_id)

        if existing_project is None:
            return None

        existing_project["name"] = project.name
        existing_project["description"] = project.description
        existing_project["data"] = project.data
        existing_project["updated_at"] = datetime.now(timezone.utc)

        return existing_project

    def delete(self, project_id: str):
        if project_id not in self.projects:
            return False

        del self.projects[project_id]
        return True


project_repository = ProjectRepository()
