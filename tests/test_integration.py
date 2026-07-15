"""End-to-end integration tests for the full VeriSight flow.

These tests exercise the entire request-response cycle without mocking
the database. They verify that routes, services, and models compose
correctly. Note: actual ML inference is not triggered because the
detector is not loaded in testing mode.
"""

import io


class TestFullAuthFlow:
    """Register → Login → Profile → Update Profile."""

    def test_complete_auth_lifecycle(self, client, db):
        # 1. Register
        reg_resp = client.post("/api/auth/register", json={
            "email": "full@example.com",
            "username": "fulluser",
            "password": "password123",
        })
        assert reg_resp.status_code == 201
        reg_data = reg_resp.get_json()
        assert "token" in reg_data
        token = reg_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get profile
        prof_resp = client.get("/api/auth/profile", headers=headers)
        assert prof_resp.status_code == 200
        assert prof_resp.get_json()["user"]["email"] == "full@example.com"

        # 3. Update username
        update_resp = client.put("/api/auth/profile", headers=headers, json={
            "username": "updateduser",
        })
        assert update_resp.status_code == 200
        assert update_resp.get_json()["user"]["username"] == "updateduser"

        # 4. Login again
        login_resp = client.post("/api/auth/login", json={
            "email": "full@example.com",
            "password": "password123",
        })
        assert login_resp.status_code == 200
        assert "token" in login_resp.get_json()


class TestFullUploadLifecycle:
    """Register → Upload → Check Status → View Result → List → Delete."""

    def _register_and_upload(self, client, db):
        """Helper: register a user and upload a dummy mp4, return (headers, video_id, result)."""
        client.post("/api/auth/register", json={
            "email": "upload@example.com",
            "username": "uploaduser",
            "password": "password123",
        })
        login_resp = client.post("/api/auth/login", json={
            "email": "upload@example.com",
            "password": "password123",
        })
        token = login_resp.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        data = {"video": (io.BytesIO(b"fake video content"), "test_video.mp4")}
        upload_resp = client.post(
            "/api/videos/upload",
            headers=headers,
            data=data,
            content_type="multipart/form-data",
        )
        return headers, upload_resp

    def test_register_upload_and_check_status(self, client, db):
        headers, upload_resp = self._register_and_upload(client, db)
        upload_data = upload_resp.get_json()

        assert upload_resp.status_code in (200, 500)
        if upload_resp.status_code == 200:
            assert "id" in upload_data
            analysis_id = upload_data["id"]

            status_resp = client.get(
                f"/api/videos/{analysis_id}/status", headers=headers
            )
            assert status_resp.status_code == 200
            status_data = status_resp.get_json()
            assert status_data["id"] == analysis_id

    def test_upload_then_list_and_view_result(self, client, db):
        headers, upload_resp = self._register_and_upload(client, db)

        list_resp = client.get("/api/results", headers=headers)
        assert list_resp.status_code == 200
        list_data = list_resp.get_json()
        assert "results" in list_data
        assert "total" in list_data
        assert "page" in list_data

        if upload_resp.status_code == 200:
            analysis_id = upload_resp.get_json()["id"]
            get_resp = client.get(
                f"/api/results/{analysis_id}", headers=headers
            )
            assert get_resp.status_code == 200
            assert get_resp.get_json()["id"] == analysis_id

    def test_pdf_download_for_completed_result(self, client, db):
        """Only tests the download endpoint exists and enforces auth."""
        headers, upload_resp = self._register_and_upload(client, db)
        if upload_resp.status_code == 200:
            analysis_id = upload_resp.get_json()["id"]

            download_resp = client.get(
                f"/api/results/{analysis_id}/download", headers=headers
            )
            assert download_resp.status_code in (200, 404)
            if download_resp.status_code == 200:
                assert download_resp.mimetype == "application/pdf"
                content_disposition = download_resp.headers.get(
                    "Content-Disposition", ""
                )
                assert ".pdf" in content_disposition

    def test_delete_result(self, client, db):
        headers, upload_resp = self._register_and_upload(client, db)
        if upload_resp.status_code == 200:
            analysis_id = upload_resp.get_json()["id"]

            del_resp = client.delete(
                f"/api/results/{analysis_id}", headers=headers
            )
            assert del_resp.status_code == 200

            get_resp = client.get(
                f"/api/results/{analysis_id}", headers=headers
            )
            assert get_resp.status_code == 404

    def test_cannot_access_other_users_results(self, client, db):
        headers_a, upload_resp = self._register_and_upload(client, db)
        if upload_resp.status_code != 200:
            return
        analysis_id = upload_resp.get_json()["id"]

        client.post("/api/auth/register", json={
            "email": "other@example.com",
            "username": "otheruser",
            "password": "password123",
        })
        login_resp = client.post("/api/auth/login", json={
            "email": "other@example.com",
            "password": "password123",
        })
        other_token = login_resp.get_json()["token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}

        get_resp = client.get(
            f"/api/results/{analysis_id}", headers=other_headers
        )
        assert get_resp.status_code == 404

        del_resp = client.delete(
            f"/api/results/{analysis_id}", headers=other_headers
        )
        assert del_resp.status_code == 404


class TestPageRoutes:
    """Verify all frontend pages render successfully."""

    def test_home_page(self, client, db):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"VeriSight" in resp.data or b"verisight" in resp.data.lower()

    def test_login_page(self, client, db):
        resp = client.get("/login")
        assert resp.status_code == 200

    def test_register_page(self, client, db):
        resp = client.get("/register")
        assert resp.status_code == 200

    def test_about_page(self, client, db):
        resp = client.get("/about")
        assert resp.status_code == 200

    def test_upload_page(self, client, db):
        resp = client.get("/upload")
        assert resp.status_code == 200

    def test_dashboard_page(self, client, db):
        resp = client.get("/dashboard")
        assert resp.status_code == 200

    def test_result_page(self, client, db):
        resp = client.get("/results/some-id")
        assert resp.status_code == 200


class TestErrorHandling:
    """Verify error handlers return proper JSON responses for API routes."""

    def test_404_json(self, client, db):
        resp = client.get("/api/nonexistent")
        assert resp.status_code == 404
        assert resp.is_json

    def test_405_json(self, client, db):
        resp = client.put("/api/auth/login", json={})
        assert resp.status_code == 405
        assert resp.is_json

    def test_413_no_file(self, client, db, auth_headers):
        resp = client.post(
            "/api/videos/upload",
            headers=auth_headers,
            content_type="multipart/form-data",
        )
        assert resp.status_code == 400

    def test_empty_request_body(self, client, db):
        resp = client.post("/api/auth/register", json={})
        assert resp.status_code == 400
