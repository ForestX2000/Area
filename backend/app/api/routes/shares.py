"""Публичные снимки проектов: просмотр по ссылке без входа в систему.

Снимок и его картинки лежат на диске (в Docker — в volume), поэтому ссылки
переживают перезапуск сервера. Снимок не меняется: после правок проекта
автор создаёт новую ссылку.
"""

import json
import os
import re
import secrets
import shutil
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse


router = APIRouter(prefix="/api/shares", tags=["Shares"])

MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024
MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_FILES = 200
SHARE_ID = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
FILE_NAME = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def shares_root() -> Path:
    return Path(os.getenv("SHARES_DIR", "data/shares"))


def share_dir(share_id: str) -> Path:
    if not SHARE_ID.fullmatch(share_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ссылка не найдена.")
    directory = shares_root() / share_id
    if not (directory / "share.json").is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ссылка не найдена.")
    return directory


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_share(snapshot: str = Form(...), files: list[UploadFile] = File(default=[])):
    if len(snapshot.encode("utf-8")) > MAX_SNAPSHOT_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Проект слишком большой.")
    try:
        data = json.loads(snapshot)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный снимок проекта.")
    if not isinstance(data, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный снимок проекта.")
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Слишком много файлов.")

    share_id = secrets.token_urlsafe(12)
    directory = shares_root() / share_id
    (directory / "files").mkdir(parents=True)
    content_types: dict[str, str] = {}
    try:
        for upload in files:
            name = upload.filename or ""
            content_type = upload.content_type or ""
            if not FILE_NAME.fullmatch(name) or name in content_types:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректное имя файла.")
            if not content_type.startswith("image/"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Можно прикладывать только изображения.")
            content = await upload.read(MAX_FILE_BYTES + 1)
            if len(content) > MAX_FILE_BYTES:
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Файл слишком большой.")
            (directory / "files" / name).write_bytes(content)
            content_types[name] = content_type
        (directory / "share.json").write_text(
            json.dumps({"snapshot": data, "files": content_types}, ensure_ascii=False), encoding="utf-8")
    except BaseException:
        shutil.rmtree(directory, ignore_errors=True)
        raise
    return {"id": share_id}


@router.get("/{share_id}")
def get_share(share_id: str):
    stored = json.loads((share_dir(share_id) / "share.json").read_text(encoding="utf-8"))
    return {"id": share_id, "snapshot": stored["snapshot"], "files": sorted(stored["files"])}


@router.get("/{share_id}/files/{name}")
def get_share_file(share_id: str, name: str):
    directory = share_dir(share_id)
    stored = json.loads((directory / "share.json").read_text(encoding="utf-8"))
    if not FILE_NAME.fullmatch(name) or name not in stored["files"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден.")
    return FileResponse(directory / "files" / name, media_type=stored["files"][name],
                        headers={"Cache-Control": "public, max-age=31536000, immutable"})
