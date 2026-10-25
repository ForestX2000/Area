
from app.repositories.file_repository import file_repository
from app.schemas.file import FileInfo


class FileService:
    def upload_file(
        self,
        project_id: str,
        kind: str,
        filename: str,
        content_type: str,
        data: bytes,
    ) -> FileInfo:
        return file_repository.save_file(
            project_id=project_id,
            kind=kind,
            filename=filename,
            content_type=content_type,
            data=data,
        )

    def get_file(self, file_id: str) -> FileInfo | None:
        return file_repository.get_file(file_id)

    def get_file_path(self, file_id: str):
        return file_repository.get_file_path(file_id)

    def list_project_files(self, project_id: str) -> list[FileInfo]:
        return file_repository.list_files_by_project(project_id)

    def delete_file(self, file_id: str) -> bool:
        return file_repository.delete_file(file_id)


file_service = FileService()
