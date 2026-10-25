import json

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SHARES_DIR", str(tmp_path))
    return TestClient(app)


PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def create(client, snapshot=None, files=None):
    return client.post(
        "/api/shares",
        data={"snapshot": json.dumps(snapshot if snapshot is not None else {"version": 1, "project": {"name": "Офис"}})},
        files=files or [],
    )


def test_share_round_trip(client):
    response = create(client, files=[("files", ("f0", PNG, "image/png"))])
    assert response.status_code == 201
    share_id = response.json()["id"]

    shared = client.get(f"/api/shares/{share_id}")
    assert shared.status_code == 200
    assert shared.json()["snapshot"]["project"]["name"] == "Офис"
    assert shared.json()["files"] == ["f0"]

    file = client.get(f"/api/shares/{share_id}/files/f0")
    assert file.status_code == 200
    assert file.headers["content-type"] == "image/png"
    assert file.content == PNG


def test_unknown_share_and_file_are_404(client):
    assert client.get("/api/shares/unknown-share-id").status_code == 404
    assert client.get("/api/shares/../etc").status_code == 404
    share_id = create(client).json()["id"]
    assert client.get(f"/api/shares/{share_id}/files/missing").status_code == 404


@pytest.mark.parametrize("name, content_type", [("../evil", "image/png"), ("f0", "text/html")])
def test_rejects_unsafe_files(client, tmp_path, name, content_type):
    response = create(client, files=[("files", (name, PNG, content_type))])
    assert response.status_code == 400
    # Неудачная загрузка не оставляет за собой папку.
    assert list(tmp_path.iterdir()) == []


def test_rejects_invalid_snapshot(client):
    response = client.post("/api/shares", data={"snapshot": "[1, 2]"})
    assert response.status_code == 400
