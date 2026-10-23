
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.project_repository import project_repository


client = TestClient(app)


def setup_function():
    project_repository.projects.clear()


def test_create_project():
    response = client.post(
        "/api/projects",
        json={
            "name": "Тестовая карта",
            "description": "Проверка API",
            "data": {
                "floors": [],
                "points": [],
                "panoramas": [],
            },
        },
    )

    assert response.status_code == 201

    result = response.json()
    assert result["name"] == "Тестовая карта"
    assert result["description"] == "Проверка API"
    assert "id" in result
    assert "created_at" in result
    assert "updated_at" in result


def test_get_projects():
    client.post(
        "/api/projects",
        json={
            "name": "Карта 1",
            "description": "",
            "data": {},
        },
    )

    response = client.get("/api/projects")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "Карта 1"


def test_get_project():
    created = client.post(
        "/api/projects",
        json={
            "name": "Карта для поиска",
            "description": "",
            "data": {},
        },
    ).json()

    response = client.get(f"/api/projects/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_project():
    created = client.post(
        "/api/projects",
        json={
            "name": "Старое название",
            "description": "",
            "data": {},
        },
    ).json()

    response = client.put(
        f"/api/projects/{created['id']}",
        json={
            "name": "Новое название",
            "description": "Обновлено",
            "data": {"floors": []},
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Новое название"
    assert response.json()["description"] == "Обновлено"


def test_delete_project():
    created = client.post(
        "/api/projects",
        json={
            "name": "Карта для удаления",
            "description": "",
            "data": {},
        },
    ).json()

    response = client.delete(f"/api/projects/{created['id']}")

    assert response.status_code == 204

    response = client.get(f"/api/projects/{created['id']}")
    assert response.status_code == 404


def test_project_not_found():
    response = client.get("/api/projects/nonexistent-id")

    assert response.status_code == 404


def test_create_project_with_empty_name():
    response = client.post(
        "/api/projects",
        json={
            "name": "",
            "description": "",
            "data": {},
        },
    )

    assert response.status_code == 422
