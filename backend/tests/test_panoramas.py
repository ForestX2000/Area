
import math

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

SCENE_WIDTH = 4096
VIEW_WIDTH, VIEW_HEIGHT, VIEW_HFOV = 800, 560, 70
VIEW_VFOV = math.degrees(2 * math.atan(math.tan(math.radians(VIEW_HFOV / 2)) * VIEW_HEIGHT / VIEW_WIDTH))


def make_scene() -> np.ndarray:
    """Равнопромежуточная «комната» с множеством деталей для поиска совпадений."""
    rng = np.random.default_rng(7)
    height = SCENE_WIDTH // 2
    scene = np.full((height, SCENE_WIDTH, 3), 200, np.uint8)
    for _ in range(900):
        color = tuple(int(c) for c in rng.integers(0, 255, 3))
        x, y = int(rng.integers(0, SCENE_WIDTH)), int(rng.integers(0, height))
        size = int(rng.integers(10, 70))
        if rng.random() < 0.5:
            cv2.rectangle(scene, (x, y), (x + size, y + size // 2), color, -1)
        else:
            cv2.circle(scene, (x, y), size // 2, color, -1)
    noise = rng.integers(-12, 12, scene.shape)
    return np.clip(scene.astype(np.int16) + noise, 0, 255).astype(np.uint8)


def render_view(scene: np.ndarray, yaw_degrees: float) -> bytes:
    """Перспективный снимок из центра сферы, как фото с телефона при повороте на месте."""
    height, width = scene.shape[:2]
    focal = VIEW_WIDTH / 2 / math.tan(math.radians(VIEW_HFOV / 2))
    x, y = np.meshgrid(
        np.arange(VIEW_WIDTH, dtype=np.float32) - VIEW_WIDTH / 2 + 0.5,
        np.arange(VIEW_HEIGHT, dtype=np.float32) - VIEW_HEIGHT / 2 + 0.5,
    )
    yaw = math.radians(yaw_degrees)
    x_world = x * math.cos(yaw) + focal * math.sin(yaw)
    z_world = -x * math.sin(yaw) + focal * math.cos(yaw)
    radius = np.sqrt(x * x + y * y + focal * focal)
    longitude = np.arctan2(x_world, z_world)
    # Ось y кадра направлена вниз, а полярный угол отсчитывается от зенита.
    polar = np.arccos(-y / radius)
    map_x = ((longitude + math.pi) / (2 * math.pi) * width - 0.5) % width
    map_y = polar / math.pi * height - 0.5
    view = cv2.remap(scene, map_x.astype(np.float32), map_y.astype(np.float32), cv2.INTER_LINEAR)
    return cv2.imencode(".jpg", view, [cv2.IMWRITE_JPEG_QUALITY, 92])[1].tobytes()


def best_horizon_correlation(result: np.ndarray, scene: np.ndarray) -> float:
    """Нормированная корреляция полосы у горизонта при лучшем повороте по долготе."""
    size = (1024, 512)
    rows = slice(512 * 75 // 180, 512 * 105 // 180)
    a = cv2.cvtColor(cv2.resize(result, size, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)[rows].astype(np.float64)
    b = cv2.cvtColor(cv2.resize(scene, size, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)[rows].astype(np.float64)
    a = (a - a.mean()) / a.std()
    b = (b - b.mean()) / b.std()
    correlation = np.fft.ifft(np.fft.fft(a, axis=1) * np.conj(np.fft.fft(b, axis=1)), axis=1).real.sum(axis=0)
    return float(correlation.max() / a.size)


def post_images(payloads: list[bytes]):
    files = [("images", (f"photo-{index + 1}.jpg", data, "image/jpeg")) for index, data in enumerate(payloads)]
    return client.post("/api/panoramas/stitch", files=files)


def test_stitches_full_circle_into_equirectangular_panorama():
    scene = make_scene()
    yaws = range(0, 360, 36)
    response = post_images([render_view(scene, yaw) for yaw in yaws])

    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["x-panorama-used-images"] == ",".join(str(i) for i in range(len(yaws)))
    assert response.headers["x-panorama-total-images"] == str(len(yaws))
    assert float(response.headers["x-panorama-horizontal-coverage"]) >= 340
    # Масштаб проекции верен, если вертикальный охват совпадает с углом обзора кадров.
    assert abs(float(response.headers["x-panorama-vertical-coverage"]) - VIEW_VFOV) < 8

    result = cv2.imdecode(np.frombuffer(response.content, np.uint8), cv2.IMREAD_COLOR)
    assert result.shape[1] == 2 * result.shape[0]
    # Горизонт на месте, без зеркального отражения и искажения масштаба.
    assert best_horizon_correlation(result, scene) > 0.6


def test_partial_turn_reports_its_coverage():
    scene = make_scene()
    response = post_images([render_view(scene, yaw) for yaw in (0, 35, 70)])

    assert response.status_code == 200, response.text
    coverage = float(response.headers["x-panorama-horizontal-coverage"])
    assert 120 < coverage < 170


def test_rejects_a_single_image():
    response = post_images([render_view(make_scene(), 0)])

    assert response.status_code == 422
    assert "от 2" in response.json()["detail"]


def test_rejects_files_that_are_not_images():
    response = post_images([b"not an image", b"also not an image"])

    assert response.status_code == 422
    assert "Снимок 1" in response.json()["detail"]


def test_reports_unrelated_photos():
    rng = np.random.default_rng(1)
    photos = [
        cv2.imencode(".jpg", rng.integers(0, 255, (400, 600, 3), dtype=np.uint8))[1].tobytes()
        for _ in range(2)
    ]
    response = post_images(photos)

    assert response.status_code == 422
    assert response.json()["detail"]
