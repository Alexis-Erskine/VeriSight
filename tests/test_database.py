"""Database-level tests: CRUD, relationships, cascade deletes, constraints."""

import uuid
import pytest
from app.extensions import db
from app.models.user import User
from app.models.uploaded_video import UploadedVideo
from app.models.analysis_result import AnalysisResult


# ─── User CRUD ────────────────────────────────────────────────────────────────

class TestUserCRUD:
    def test_create_and_retrieve(self, db):
        user = User(email="crud@example.com", username="cruduser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        fetched = db.session.get(User, user.id)
        assert fetched is not None
        assert fetched.email == "crud@example.com"

    def test_update_user(self, db):
        user = User(email="update@example.com", username="updateuser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        user.username = "newname"
        db.session.commit()

        fetched = db.session.get(User, user.id)
        assert fetched.username == "newname"

    def test_delete_user(self, db):
        user = User(email="delete@example.com", username="deleteuser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        uid = user.id
        db.session.delete(user)
        db.session.commit()

        assert db.session.get(User, uid) is None

    def test_unique_username_constraint(self, db):
        u1 = User(email="u1@example.com", username="one")
        u1.set_password("password123")
        db.session.add(u1)
        db.session.commit()

        u2 = User(email="u2@example.com", username="one")
        u2.set_password("password123")
        db.session.add(u2)
        with pytest.raises(Exception):
            db.session.commit()
        db.session.rollback()

    def test_timestamps_set_on_create(self, db):
        user = User(email="ts@example.com", username="tsuser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        assert user.created_at is not None
        assert user.updated_at is not None


# ─── UploadedVideo CRUD ──────────────────────────────────────────────────────

class TestUploadedVideoCRUD:
    def test_create_and_retrieve(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
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

    def test_update_video_record(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
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

    def test_delete_video(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
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

    def test_cascade_analysis_on_video_delete(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
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


# ─── AnalysisResult CRUD ─────────────────────────────────────────────────────

class TestAnalysisResultCRUD:
    def test_create_full_result(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
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

    def test_update_result(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
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

    def test_delete_result_only(self, db, sample_user):
        """Deleting a result should NOT delete the video."""
        video = UploadedVideo(
            user_id=sample_user.id,
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


# ─── Relationship Traversal ──────────────────────────────────────────────────

class TestRelationships:
    def test_user_videos_relationship(self, db):
        user = User(email="rel@example.com", username="reluser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        v1 = UploadedVideo(
            user_id=user.id, filename="a.mp4", original_filename="a.mp4",
            file_size=100, file_path="/tmp/a.mp4",
        )
        v2 = UploadedVideo(
            user_id=user.id, filename="b.mp4", original_filename="b.mp4",
            file_size=200, file_path="/tmp/b.mp4",
        )
        db.session.add_all([v1, v2])
        db.session.commit()

        assert user.videos.count() == 2
        assert v1.user.username == "reluser"

    def test_video_analysis_relationship(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="rel_vid.mp4",
            original_filename="relationship.mp4",
            file_size=100,
            file_path="/tmp/rel_vid.mp4",
        )
        db.session.add(video)
        db.session.flush()

        result = AnalysisResult(video_id=video.id, filename="relationship.mp4")
        db.session.add(result)
        db.session.commit()

        assert video.analysis.id == result.id
        assert result.video.id == video.id


# ─── Bulk Operations ─────────────────────────────────────────────────────────

class TestBulkOperations:
    def test_bulk_insert_videos(self, db, sample_user):
        videos = [
            UploadedVideo(
                user_id=sample_user.id,
                filename=f"bulk_{i}.mp4",
                original_filename=f"bulk_{i}.mp4",
                file_size=100 * i,
                file_path=f"/tmp/bulk_{i}.mp4",
            )
            for i in range(5)
        ]
        db.session.add_all(videos)
        db.session.commit()

        assert UploadedVideo.query.filter_by(user_id=sample_user.id).count() == 5

    def test_multiple_results_query(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="multi.mp4",
            original_filename="multi.mp4",
            file_size=100,
            file_path="/tmp/multi.mp4",
        )
        db.session.add(video)
        db.session.flush()

        results = [
            AnalysisResult(
                video_id=video.id,
                filename=f"result_{i}.mp4",
                prediction=i / 10,
                risk_level=AnalysisResult._compute_risk_level(i / 10),
            )
            for i in range(3)
        ]
        db.session.add_all(results)
        with pytest.raises(Exception):
            db.session.commit()
        db.session.rollback()
