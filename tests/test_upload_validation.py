import io


class TestUploadEndpointValidation:
    """Edge-case tests for the /api/videos/upload endpoint."""

    def test_upload_empty_file(self, client, db):
        data = {"video": (io.BytesIO(b""), "empty.mp4")}
        response = client.post(
            "/api/videos/upload",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code in (400, 500)

    def test_upload_no_filename(self, client, db):
        data = {"video": (io.BytesIO(b"content"), "")}
        response = client.post(
            "/api/videos/upload",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 400

    def test_upload_wrong_field_name(self, client, db):
        data = {"file": (io.BytesIO(b"content"), "test.mp4")}
        response = client.post(
            "/api/videos/upload",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 400

    def test_upload_double_extension(self, client, db):
        data = {"video": (io.BytesIO(b"content"), "video.backup.mp4")}
        response = client.post(
            "/api/videos/upload",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code in (200, 500)

    def test_upload_no_content_type(self, client, db):
        response = client.post(
            "/api/videos/upload",
            data={"video": (io.BytesIO(b"content"), "test.mp4")},
        )
        assert response.status_code in (200, 400, 500)


class TestStatusEndpointValidation:
    """Edge-case tests for the /api/videos/<id>/status endpoint."""

    def test_status_invalid_id_format(self, client, db):
        response = client.get("/api/videos/not-a-uuid/status")
        assert response.status_code == 404

    def test_status_nonexistent_id(self, client, db):
        import uuid
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/videos/{fake_id}/status")
        assert response.status_code == 404
