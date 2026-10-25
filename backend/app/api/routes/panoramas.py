from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.services.panorama_stitcher import (
    MAX_IMAGES,
    MIN_IMAGES,
    StitchError,
    stitch_panorama,
)


router = APIRouter(prefix="/api/panoramas", tags=["Panoramas"])

MAX_IMAGE_BYTES = 25 * 1024 * 1024

# Метаданные склейки передаются заголовками, тело ответа — сам JPEG.
STITCH_HEADERS = [
    "X-Panorama-Horizontal-Coverage",
    "X-Panorama-Vertical-Coverage",
    "X-Panorama-Used-Images",
    "X-Panorama-Total-Images",
]


@router.post(
    "/stitch",
    response_class=Response,
    responses={200: {"content": {"image/jpeg": {}}}},
)
async def stitch(images: list[UploadFile] = File(...)):
    if not MIN_IMAGES <= len(images) <= MAX_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Загрузите от {MIN_IMAGES} до {MAX_IMAGES} снимков.",
        )

    payloads = []
    for index, image in enumerate(images):
        data = await image.read()
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"Снимок {index + 1} больше 25 МБ.",
            )
        payloads.append(data)

    try:
        # Склейка занимает секунды и не должна блокировать цикл событий.
        result = await run_in_threadpool(stitch_panorama, payloads)
    except StitchError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=error.message,
        )

    return Response(
        content=result.jpeg,
        media_type="image/jpeg",
        headers={
            "X-Panorama-Horizontal-Coverage": str(result.horizontal_coverage),
            "X-Panorama-Vertical-Coverage": str(result.vertical_coverage),
            "X-Panorama-Used-Images": ",".join(str(index) for index in result.used_images),
            "X-Panorama-Total-Images": str(len(payloads)),
        },
    )
