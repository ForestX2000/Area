
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FileInfo(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    project_id: str
    kind: str  # "plan" | "panorama"
    created_at: datetime
    url: str


class FileUploadResponse(BaseModel):
    id: str
    filename: str
    kind: str
    url: str
