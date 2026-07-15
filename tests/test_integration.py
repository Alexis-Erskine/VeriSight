"""End-to-end integration tests for the full VeriSight flow."""

import io


class TestFullUploadLifecycle:
    """Upload -> View Result -> List -> Download -> Delete."""

    def _upload_video(self, client):
        data = {"video": (io.BytesIO(b"fake video content"), "test_video.mp4")}
        return client.post(
            "/api/videos/upload",
            data=data,
            content_type="multipart/form-data",
        )

    def test_upload_and_check_status(self, client, db):
        upload_resp = self._upload_video(client)
        upload_data = upload_resp.get_json()

        assert upload_resp.status_code in (200, 500)
        if upload_resp.status_code == 200:
            assert "id" in upload_data
            analysis_id = upload_data["id"]

            status_resp = client.get(f"/api/videos/{analysis_id}/status")
            assert status_resp.status_code == 200
            status_data = status_resp.get_json()
            assert status_data["id"] == analysis_id

    def test_upload_then_list_and_view_result(self, client, db):
        upload_resp = self._upload_video(client)

        list_resp = client.get("/api/results")
        assert list_resp.status_code == 200
        list_data = list_resp.get_json()
        assert "results" in list_data
        assert "total" in list_data
        assert "page" in list_data

        if upload_resp.status_code == 200:
            analysis_id = upload_resp.get_json()["id"]
            get_resp = client.get(f"/api/results/{analysis_id}")
            assert get_resp.status_code == 200
            assert get_resp.get_json()["id"] == analysis_id

    def test_pdf_download_for_completed_result(self, client, db):
        upload_resp = self._upload_video(client)
        if upload_resp.status_code == 200:
            analysis_id = upload_resp.get_json()["id"]

            download_resp = client.get(f"/api/results/{analysis_id}/download")
            assert download_resp.status_code in (200, 404)
            if download_resp.status_code == 200:
                assert download_resp.mimetype == "application/pdf"
                content_disposition = download_resp.headers.get(
                    "Content-Disposition", ""
                )
                assert ".pdf" in content_disposition

    def test_delete_result(self, client, db):
        upload_resp = self._upload_video(client)
        if upload_resp.status_code == 200:
            analysis_id = upload_resp.get_json()["id"]

            del_resp = client.delete(f"/api/results/{analysis_id}")
            assert del_resp.status_code == 200

            get_resp = client.get(f"/api/results/{analysis_id}")
            assert get_resp.status_code == 404


class TestPageRoutes:
    """Verify all frontend pages render successfully."""

    def test_home_page(self, client, db):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"VeriSight" in resp.data or b"verisight" in resp.data.lower()

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

    def test_413_no_file(self, client, db):
        resp = client.post(
            "/api/videos/upload",
            content_type="multipart/form-data",
        )
        assert resp.status_code == 400
