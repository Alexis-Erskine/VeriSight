import io


def test_upload_no_file(client, db):
    response = client.post("/api/videos/upload")
    assert response.status_code == 400


def test_upload_invalid_extension(client, db):
    data = {"video": (io.BytesIO(b"fake content"), "test.txt")}
    response = client.post(
        "/api/videos/upload",
        data=data,
        content_type="multipart/form-data",
    )
    assert response.status_code == 400


def test_status_not_found(client, db):
    response = client.get("/api/videos/nonexistent-id/status")
    assert response.status_code == 404
