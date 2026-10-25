
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from app.schemas.file import FileInfo

MEDIA_ROOT = Path(os.getenv("MEDIA_DIR", "data/media"))
PLANS_DIR = MEDIA_ROOT / "plans"
PANORAMAS_DIR = MEDIA_ROOT / "panoramas"


class FileRepository:
    def __init__(self):
        self.files: dict[str, FileInfo] = {}
        PLANS_DIR.mkdir(parents=True, exist_ok=True)
        PANORAMAS_DIR.mkdir(parents=True, exist_ok=True)

    def save_file(
        self,
        project_id: str,
        kind: str,
        filename: str,
        content_type: str,
        data: bytes,
    ) -> FileInfo:
        file_id = str(uuid.uuid4())

        if kind == "plan":
            target_dir = PLANS_DIR
        elif kind == "panorama":
            target_dir = PANORAMAS_DIR
        else:
            target_dir = MEDIA_ROOT / "other"

        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / f"{file_id}_{filename}"

        with open(file_path, "wb") as f:
            f.write(data)

        file_info = FileInfo(
            id=file_id,
            filename=filename,
            content_type=content_type,
            size=len(data),
            project_id=project_id,
            kind=kind,
            created_at=datetime.now(timezone.utc),
            url=f"/api/files/{file_id}",
        )

        self.files[file_id] = file_info
        return file_info

    def get_file(self, file_id: str) -> Optional[FileInfo]:
        return self.files.get(file_id)

    def get_file_path(self, file_id: str) -> Optional[Path]:
        file_info = self.get_file(file_id)
        if not file_info:
            return None

        for directory in (PLANS_DIR, PANORAMAS_DIR, MEDIA_ROOT / "other"):
            for path in directory.glob(f"{file_id}_*"):
                return path
        return None

    def list_files_by_project(self, project_id: str) -> List[FileInfo]:
        return [
            f for f in self.files.values() if f.project_id == project_id
        ]

    def delete_file(self, file_id: str) -> bool:
        if file_id not in self.files:
            return False
        path = self.get_file_path(file_id)
        if path and path.exists():
            path.unlink()
        del self.files[file_id]
        return True


file_repository = FileRepository()
