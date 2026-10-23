
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    data: dict[str, Any] = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    data: dict[str, Any] = Field(default_factory=dict)


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime
