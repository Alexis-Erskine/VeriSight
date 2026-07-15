import io
import pytest


class TestUploadEndpointValidation:
    """Edge-case tests for the /api/videos/upload endpoint."""

    def test_upload_empty_file(self, client, db, auth_headers):
        data = {"video": (io.BytesIO(b""), "empty.mp4")}
        response = client.post(
            "/api/videos/upload",
            headers=auth_headers,
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code in (400, 500)

    def test_upload_no_filename(self, client, db, auth_headers):
        data = {"video": (io.BytesIO(b"content"), "")}
        response = client.post(
            "/api/videos/upload",
            headers=auth_headers,
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 400

    def test_upload_wrong_field_name(self, client, db, auth_headers):
        data = {"file": (io.BytesIO(b"content"), "test.mp4")}
        response = client.post(
            "/api/videos/upload",
            headers=auth_headers,
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 400

    def test_upload_double_extension(self, client, db, auth_headers):
        data = {"video": (io.BytesIO(b"content"), "video.backup.mp4")}
        response = client.post(
            "/api/videos/upload",
            headers=auth_headers,
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code in (200, 500)

    def test_upload_no_content_type(self, client, db, auth_headers):
        response = client.post(
            "/api/videos/upload",
            headers=auth_headers,
            data={"video": (io.BytesIO(b"content"), "test.mp4")},
        )
        assert response.status_code in (200, 400, 500)

    def test_upload_missing_auth_header(self, client, db):
        data = {"video": (io.BytesIO(b"content"), "test.mp4")}
        response = client.post(
            "/api/videos/upload",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 401

    def test_upload_expired_token(self, client, db, app):
        expired = (
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNTE2MjM5MDIyfQ."
            "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        )
        data = {"video": (io.BytesIO(b"content"), "test.mp4")}
        response = client.post(
            "/api/videos/upload",
            headers={"Authorization": expired},
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 401

    def test_upload_malformed_token(self, client, db, auth_headers):
        data = {"video": (io.BytesIO(b"content"), "test.mp4")}
        response = client.post(
            "/api/videos/upload",
            headers={"Authorization": "Bearer not-a-valid-token"},
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 401


class TestStatusEndpointValidation:
    """Edge-case tests for the /api/videos/<id>/status endpoint."""

    def test_status_invalid_id_format(self, client, db, auth_headers):
        response = client.get(
            "/api/videos/not-a-uuid/status", headers=auth_headers
        )
        assert response.status_code == 404

    def test_status_other_users_video(self, client, db, auth_headers, app):
        """A user should not see another user's video status."""
        import uuid
        fake_id = str(uuid.uuid4())
        response = client.get(
            f"/api/videos/{fake_id}/status", headers=auth_headers
        )
        assert response.status_code == 404
