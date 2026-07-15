import pytest
from app.extensions import db
from app.models.user import User
from app.models.uploaded_video import UploadedVideo
from app.models.analysis_result import AnalysisResult

# ─── User Model ───────────────────────────────────────────────────────────────

class TestUserModel:
    def test_create_user(self, db):
        user = User(email="test@example.com", username="testuser")
        user.set_password("securepass123")
        db.session.add(user)
        db.session.commit()

        saved = db.session.get(User, user.id)
        assert saved.email == "test@example.com"
        assert saved.username == "testuser"
        assert saved.is_active is True

    def test_password_hashing(self, db):
        user = User(email="pw@example.com", username="pwuser")
        user.set_password("mypassword")
        db.session.add(user)
        db.session.commit()

        assert user.check_password("mypassword") is True
        assert user.check_password("wrongpassword") is False
        assert user.password_hash != "mypassword"

    def test_to_dict(self, db):
        user = User(email="dict@example.com", username="dictuser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        d = user.to_dict()
        assert d["id"] == user.id
        assert d["email"] == "dict@example.com"
        assert d["username"] == "dictuser"
        assert "password_hash" not in d
        assert "password" not in d
        assert "created_at" in d

    def test_repr(self, db):
        user = User(email="repr@example.com", username="repruser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()
        assert repr(user) == "<User repruser>"

    def test_default_is_active(self, db):
        user = User(email="active@example.com", username="activeuser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()
        assert user.is_active is True

    def test_unique_email_constraint(self, db):
        user1 = User(email="unique@example.com", username="user1")
        user1.set_password("password123")
        db.session.add(user1)
        db.session.commit()

        user2 = User(email="unique@example.com", username="user2")
        user2.set_password("password123")
        db.session.add(user2)
        with pytest.raises(Exception):
            db.session.commit()

    def test_cascade_videos_on_delete(self, db):
        user = User(email="cascade@example.com", username="cascadeuser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        video = UploadedVideo(
            user_id=user.id,
            filename="test.mp4",
            original_filename="test.mp4",
            file_size=1024,
            file_path="/tmp/test.mp4",
        )
        db.session.add(video)
        db.session.commit()

        db.session.delete(user)
        db.session.commit()

        assert db.session.get(UploadedVideo, video.id) is None


# ─── UploadedVideo Model ──────────────────────────────────────────────────────

class TestUploadedVideoModel:
    def test_create_video(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="abc123.mp4",
            original_filename="my_video.mp4",
            file_size=2048,
            file_path="/uploads/abc123.mp4",
            mime_type="video/mp4",
        )
        db.session.add(video)
        db.session.commit()

        saved = db.session.get(UploadedVideo, video.id)
        assert saved.original_filename == "my_video.mp4"
        assert saved.file_size == 2048
        assert saved.mime_type == "video/mp4"

    def test_video_to_dict(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="abc123.mp4",
            original_filename="test.mp4",
            file_size=512,
            file_path="/uploads/abc123.mp4",
        )
        db.session.add(video)
        db.session.commit()

        d = video.to_dict()
        assert d["id"] == video.id
        assert d["filename"] == "abc123.mp4"
        assert d["original_filename"] == "test.mp4"
        assert d["file_size"] == 512
        assert "uploaded_at" in d

    def test_video_repr(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="vid.mp4",
            original_filename="original.mp4",
            file_size=100,
            file_path="/tmp/vid.mp4",
        )
        assert video.original_filename in repr(video)

    def test_video_belongs_to_user(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="rel.mp4",
            original_filename="relation.mp4",
            file_size=100,
            file_path="/tmp/rel.mp4",
        )
        db.session.add(video)
        db.session.commit()

        assert video.user_id == sample_user.id
        assert video.user.username == sample_user.username


# ─── AnalysisResult Model ─────────────────────────────────────────────────────

class TestAnalysisResultModel:
    def test_create_result(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="anal.mp4",
            original_filename="analysis.mp4",
            file_size=100,
            file_path="/tmp/anal.mp4",
        )
        db.session.add(video)
        db.session.commit()

        result = AnalysisResult(
            video_id=video.id,
            filename="analysis.mp4",
            status="pending",
        )
        db.session.add(result)
        db.session.commit()

        saved = db.session.get(AnalysisResult, result.id)
        assert saved.status == "pending"
        assert saved.filename == "analysis.mp4"
        assert saved.prediction is None

    def test_result_defaults(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="def.mp4",
            original_filename="defaults.mp4",
            file_size=100,
            file_path="/tmp/def.mp4",
        )
        db.session.add(video)
        db.session.commit()

        result = AnalysisResult(video_id=video.id, filename="defaults.mp4")
        db.session.add(result)
        db.session.commit()

        assert result.status == "pending"
        assert result.frames_analyzed == 0
        assert result.total_frames == 0
        assert result.risk_level is None

    def test_prediction_label(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="lab.mp4",
            original_filename="label.mp4",
            file_size=100,
            file_path="/tmp/lab.mp4",
        )
        db.session.add(video)
        db.session.commit()

        result = AnalysisResult(video_id=video.id, filename="label.mp4")
        result.prediction = 0.85
        assert result.prediction_label == "deepfake"

        result.prediction = 0.15
        assert result.prediction_label == "authentic"

        result.prediction = None
        assert result.prediction_label is None

        result.prediction = 0.5
        assert result.prediction_label == "authentic"

    def test_compute_risk_level(self):
        assert AnalysisResult._compute_risk_level(None) == "unknown"
        assert AnalysisResult._compute_risk_level(0.0) == "low"
        assert AnalysisResult._compute_risk_level(0.2) == "low"
        assert AnalysisResult._compute_risk_level(0.3) == "medium"
        assert AnalysisResult._compute_risk_level(0.5) == "medium"
        assert AnalysisResult._compute_risk_level(0.6) == "high"
        assert AnalysisResult._compute_risk_level(0.79) == "high"
        assert AnalysisResult._compute_risk_level(0.8) == "critical"
        assert AnalysisResult._compute_risk_level(0.99) == "critical"
        assert AnalysisResult._compute_risk_level(0.599) == "medium"

    def test_result_to_dict(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="td.mp4",
            original_filename="todict.mp4",
            file_size=100,
            file_path="/tmp/td.mp4",
        )
        db.session.add(video)
        db.session.commit()

        result = AnalysisResult(
            video_id=video.id,
            filename="todict.mp4",
            prediction=0.75,
            confidence=0.5,
            risk_level="high",
            frames_analyzed=10,
            total_frames=20,
            processing_time_ms=1500.0,
            status="completed",
        )
        db.session.add(result)
        db.session.commit()

        d = result.to_dict()
        assert d["id"] == result.id
        assert d["prediction"] == 0.75
        assert d["prediction_label"] == "deepfake"
        assert d["confidence"] == 0.5
        assert d["risk_level"] == "high"
        assert d["frames_analyzed"] == 10
        assert d["total_frames"] == 20
        assert d["processing_time_ms"] == 1500.0
        assert d["status"] == "completed"
        assert "date_uploaded" in d
        assert "completed_at" in d
        assert "error_message" in d

    def test_result_on_video_delete_cascade(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="cas.mp4",
            original_filename="cascade.mp4",
            file_size=100,
            file_path="/tmp/cas.mp4",
        )
        db.session.add(video)
        db.session.commit()

        result = AnalysisResult(video_id=video.id, filename="cascade.mp4")
        db.session.add(result)
        db.session.commit()

        db.session.delete(video)
        db.session.commit()

        assert db.session.get(AnalysisResult, result.id) is None

    def test_result_repr(self, db, sample_user):
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="repr_vid.mp4",
            original_filename="repr_vid.mp4",
            file_size=100,
            file_path="/tmp/repr.mp4",
        )
        db.session.add(video)
        db.session.commit()

        result = AnalysisResult(video_id=video.id, filename="repr_vid.mp4")
        result.prediction = 0.85
        result.risk_level = "critical"
        db.session.add(result)
        db.session.commit()

        text = repr(result)
        assert "critical" in text
        assert "0.8500" in text
