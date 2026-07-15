import io


def test_upload_no_file(client, db, auth_headers):
    response = client.post("/api/videos/upload", headers=auth_headers)
    assert response.status_code == 400


def test_upload_no_auth(client, db):
    response = client.post("/api/videos/upload")
    assert response.status_code == 401


def test_upload_invalid_extension(client, db, auth_headers):
    data = {"video": (io.BytesIO(b"fake content"), "test.txt")}
    response = client.post(
        "/api/videos/upload",
        headers=auth_headers,
        data=data,
        content_type="multipart/form-data",
    )
    assert response.status_code == 400


def test_status_no_auth(client, db):
    response = client.get("/api/videos/some-id/status")
    assert response.status_code == 401


def test_status_not_found(client, db, auth_headers):
    response = client.get(
        "/api/videos/nonexistent-id/status", headers=auth_headers
    )
    assert response.status_code == 404
