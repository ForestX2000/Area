
"""Склейка панорамы 360° из нескольких фотографий одной точки съёмки.

OpenCV находит общие детали соседних кадров, оценивает поворот и фокусное
расстояние каждой камеры и проецирует снимки на сферу. Результат сферической
проекции переводится в равнопромежуточную (2:1), которую ожидает Pannellum:
долгота и полярный угол каждого пикселя известны из фокусного расстояния.
"""

import math
from dataclasses import dataclass

import cv2
import numpy as np


MIN_IMAGES = 2
MAX_IMAGES = 40
# Входные кадры уменьшаются: точность склейки не растёт, а время растёт квадратично.
MAX_INPUT_SIDE = 1600
# Многие устройства не принимают в WebGL текстуры шире 4096 px.
MAX_OUTPUT_WIDTH = 4096
MIN_OUTPUT_WIDTH = 1024
JPEG_QUALITY = 90

STATUS_MESSAGES = {
    cv2.Stitcher_ERR_NEED_MORE_IMGS: (
        "Не удалось найти общие детали между снимками. Соседние кадры должны "
        "перекрываться на 30–50%, а точка съёмки — оставаться на месте."
    ),
    cv2.Stitcher_ERR_HOMOGRAPHY_EST_FAIL: (
        "Не удалось определить взаимное расположение снимков. Добавьте кадры "
        "с заметными деталями: мебелью, дверями, картинами — однотонные стены "
        "крупным планом склеить нельзя."
    ),
    cv2.Stitcher_ERR_CAMERA_PARAMS_ADJUST_FAIL: (
        "Не удалось согласовать снимки между собой. Держите телефон на одной "
        "высоте и поворачивайтесь вокруг камеры, а не вокруг себя."
    ),
}


class StitchError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass
class StitchResult:
    jpeg: bytes
    width: int
    height: int
    # Охват в градусах: 360 × 180 — полная сфера.
    horizontal_coverage: float
    vertical_coverage: float
    # Номера исходных снимков (с нуля), вошедших в панораму.
    used_images: list[int]


def _decode(data: bytes, index: int) -> np.ndarray:
    # IMREAD_COLOR учитывает EXIF-ориентацию снимков с телефона.
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise StitchError(f"Снимок {index + 1} не удалось прочитать как изображение.")

    height, width = image.shape[:2]
    scale = MAX_INPUT_SIDE / max(height, width)
    if scale < 1:
        size = (round(width * scale), round(height * scale))
        image = cv2.resize(image, size, interpolation=cv2.INTER_AREA)
    return image


def _to_equirectangular(
    pano: np.ndarray,
    images: list[np.ndarray],
    used: list[int],
    cameras: list,
) -> tuple[np.ndarray, np.ndarray]:
    """Возвращает равнопромежуточное изображение и маску заполненных пикселей."""
    # Stitcher проецирует на сферу с масштабом, равным медиане фокусных расстояний.
    focal = float(np.median([camera.focal for camera in cameras]))
    warper = cv2.PyRotationWarper("spherical", focal)

    # Левый верхний угол панорамы — минимум углов спроецированных кадров.
    left, top = math.inf, math.inf
    for index, camera in zip(used, cameras):
        height, width = images[index].shape[:2]
        x, y, _, _ = warper.warpRoi(
            (width, height),
            camera.K().astype(np.float32),
            camera.R.astype(np.float32),
        )
        left, top = min(left, x), min(top, y)

    # Сферическая проекция OpenCV: u = f·долгота, v = f·полярный угол от зенита.
    width = min(MAX_OUTPUT_WIDTH, max(MIN_OUTPUT_WIDTH, round(math.pi * focal) * 2))
    height = width // 2
    longitude = (np.arange(width, dtype=np.float32) + 0.5) / width * 2 * math.pi - math.pi
    polar = (np.arange(height, dtype=np.float32) + 0.5) / height * math.pi
    map_x = np.broadcast_to(longitude * focal - left, (height, width)).copy()
    map_y = np.broadcast_to((polar * focal - top)[:, None], (height, width)).copy()

    # Полный круг может пересекать шов ±180°: берём точку с другой стороны.
    full_turn = 2 * math.pi * focal
    map_x[map_x < 0] += full_turn
    map_x[map_x >= pano.shape[1]] -= full_turn

    equirect = cv2.remap(pano, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    filled = (pano.max(axis=2) > 0).astype(np.uint8) * 255
    mask = cv2.remap(filled, map_x, map_y, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT)
    return equirect, mask > 0


def _fill_gaps(equirect: np.ndarray, filled: np.ndarray) -> np.ndarray:
    """Заполняет неснятые области (обычно пол и потолок) размытым продолжением снимков."""
    holes = ~filled
    if not holes.any():
        return equirect

    height, width = equirect.shape[:2]
    small_size = (512, 256)
    small = cv2.resize(equirect, small_size, interpolation=cv2.INTER_AREA)
    small_holes = cv2.resize(holes.astype(np.uint8) * 255, small_size, interpolation=cv2.INTER_NEAREST)
    background = cv2.inpaint(small, small_holes, 9, cv2.INPAINT_TELEA)
    background = cv2.GaussianBlur(background, (0, 0), 6)
    background = cv2.resize(background, (width, height), interpolation=cv2.INTER_LINEAR)
    return np.where(holes[:, :, None], background, equirect)


def stitch_panorama(payloads: list[bytes]) -> StitchResult:
    if len(payloads) < MIN_IMAGES:
        raise StitchError(f"Нужно минимум {MIN_IMAGES} снимка.")
    if len(payloads) > MAX_IMAGES:
        raise StitchError(f"Можно загрузить не больше {MAX_IMAGES} снимков.")

    images = [_decode(data, index) for index, data in enumerate(payloads)]

    stitcher = cv2.Stitcher.create(cv2.Stitcher_PANORAMA)
    status, pano = stitcher.stitch(images)
    if status != cv2.Stitcher_OK:
        raise StitchError(STATUS_MESSAGES.get(status, "Не удалось склеить панораму из этих снимков."))

    used = [int(index) for index in np.ravel(stitcher.component())]
    equirect, filled = _to_equirectangular(pano, images, used, list(stitcher.cameras()))

    columns = filled.any(axis=0).mean()
    rows = filled.any(axis=1).mean()
    equirect = _fill_gaps(equirect, filled)

    ok, encoded = cv2.imencode(".jpg", equirect, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    if not ok:
        raise StitchError("Не удалось сохранить готовую панораму.")

    return StitchResult(
        jpeg=encoded.tobytes(),
        width=equirect.shape[1],
        height=equirect.shape[0],
        horizontal_coverage=round(float(columns) * 360, 1),
        vertical_coverage=round(float(rows) * 180, 1),
        used_images=used,
    )
