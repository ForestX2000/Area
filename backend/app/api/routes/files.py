
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse

from app.schemas.file import FileInfo, FileUploadResponse
from app.services.file_service import file_service


router = APIRouter(prefix="/api/projects", tags=["Files"])


@router.post(
    "/{project_id}/files",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    kind: str = Form(...),
):
    if kind not in ("plan", "panorama"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="kind должен быть 'plan' или 'panorama'",
        )

    data = await file.read()
    uploaded = file_service.upload_file(
        project_id=project_id,
        kind=kind,
        filename=file.filename or "unknown",
        content_type=file.content_type or "application/octet-stream",
        data=data,
    )

    return FileUploadResponse(
        id=uploaded.id,
        filename=uploaded.filename,
        kind=uploaded.kind,
        url=uploaded.url,
    )


@router.get(
    "/{project_id}/files",
    response_model=list[FileInfo],
)
def list_project_files(project_id: str):
    return file_service.list_project_files(project_id)


@router.get(
    "/files/{file_id}",
    response_class=FileResponse,
)
def download_file(file_id: str):
    file_info = file_service.get_file(file_id)
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    file_path = file_service.get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk",
        )

    return FileResponse(
        path=str(file_path),
        filename=file_info.filename,
        media_type=file_info.content_type,
    )
