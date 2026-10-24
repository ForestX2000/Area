
from fastapi import APIRouter, HTTPException, Response, status

from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.project_service import project_service


router = APIRouter(
    prefix="/api/projects",
    tags=["Projects"],
)


@router.get("", response_model=list[ProjectResponse])
def get_projects():
    return project_service.get_all_projects()


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(project: ProjectCreate):
    return project_service.create_project(project)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    project = project_service.get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, project: ProjectUpdate):
    updated_project = project_service.update_project(
        project_id,
        project,
    )

    if updated_project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return updated_project


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(project_id: str):
    deleted = project_service.delete_project(project_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
