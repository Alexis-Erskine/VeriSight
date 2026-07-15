"""Database-level tests: CRUD, relationships, cascade deletes."""

import pytest
from app.extensions import db
from app.models.uploaded_video import UploadedVideo
from app.models.analysis_result import AnalysisResult


class TestUploadedVideoCRUD:
    def test_create_and_retrieve(self, db):
        video = UploadedVideo(
            filename="store.mp4",
            original_filename="stored.mp4",
            file_size=4096,
            file_path="/uploads/store.mp4",
        )
        db.session.add(video)
        db.session.commit()

        fetched = db.session.get(UploadedVideo, video.id)
        assert fetched is not None
        assert fetched.file_size == 4096
        assert fetched.user_id is None

    def test_update_video_record(self, db):
        video = UploadedVideo(
            filename="orig.mp4",
            original_filename="original.mp4",
            file_size=100,
            file_path="/tmp/orig.mp4",
        )
        db.session.add(video)
        db.session.commit()

        video.file_size = 9999
        db.session.commit()

        assert db.session.get(UploadedVideo, video.id).file_size == 9999

    def test_delete_video(self, db):
        video = UploadedVideo(
            filename="del.mp4",
            original_filename="delete_me.mp4",
            file_size=100,
            file_path="/tmp/del.mp4",
        )
        db.session.add(video)
        db.session.commit()

        vid = video.id
        db.session.delete(video)
        db.session.commit()

        assert db.session.get(UploadedVideo, vid) is None

    def test_cascade_analysis_on_video_delete(self, db):
        video = UploadedVideo(
            filename="cas.mp4",
            original_filename="cascade_test.mp4",
            file_size=100,
            file_path="/tmp/cas.mp4",
        )
        db.session.add(video)
        db.session.flush()

        result = AnalysisResult(video_id=video.id, filename="cascade_test.mp4")
        db.session.add(result)
        db.session.commit()

        rid = result.id
        db.session.delete(video)
        db.session.commit()

        assert db.session.get(AnalysisResult, rid) is None


class TestAnalysisResultCRUD:
    def test_create_full_result(self, db):
        video = UploadedVideo(
            filename="full.mp4",
            original_filename="full_test.mp4",
            file_size=100,
            file_path="/tmp/full.mp4",
        )
        db.session.add(video)
        db.session.flush()

        result = AnalysisResult(
            video_id=video.id,
            filename="full_test.mp4",
            prediction=0.85,
            confidence=0.7,
            risk_level="critical",
            frames_analyzed=15,
            total_frames=30,
            processing_time_ms=2500.0,
            status="completed",
        )
        db.session.add(result)
        db.session.commit()

        fetched = db.session.get(AnalysisResult, result.id)
        assert fetched.prediction == 0.85
        assert fetched.status == "completed"

    def test_update_result(self, db):
        video = UploadedVideo(
            filename="upd.mp4",
            original_filename="update_result.mp4",
            file_size=100,
            file_path="/tmp/upd.mp4",
        )
        db.session.add(video)
        db.session.flush()

        result = AnalysisResult(video_id=video.id, filename="update_result.mp4")
        db.session.add(result)
        db.session.commit()

        result.prediction = 0.95
        result.status = "completed"
        db.session.commit()

        fetched = db.session.get(AnalysisResult, result.id)
        assert fetched.prediction == 0.95
        assert fetched.status == "completed"

    def test_delete_result_only(self, db):
        """Deleting a result should NOT delete the video."""
        video = UploadedVideo(
            filename="del_res.mp4",
            original_filename="delete_result_only.mp4",
            file_size=100,
            file_path="/tmp/del_res.mp4",
        )
        db.session.add(video)
        db.session.flush()

        result = AnalysisResult(video_id=video.id, filename="delete_result_only.mp4")
        db.session.add(result)
        db.session.commit()

        vid = video.id
        rid = result.id
        db.session.delete(result)
        db.session.commit()

        assert db.session.get(AnalysisResult, rid) is None
        assert db.session.get(UploadedVideo, vid) is not None

    def test_nullable_user_id(self, db):
        """UploadedVideo should allow null user_id."""
        video = UploadedVideo(
            filename="anon.mp4",
            original_filename="anonymous.mp4",
            file_size=100,
            file_path="/tmp/anon.mp4",
        )
        db.session.add(video)
        db.session.commit()

        assert video.user_id is None
        assert db.session.get(UploadedVideo, video.id) is not None
