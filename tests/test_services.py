import io
import pytest
from app.extensions import db
from app.services.auth_service import AuthService
from app.services.video_service import VideoService


# ─── AuthService ──────────────────────────────────────────────────────────────

class TestAuthServiceRegister:
    def test_register_success(self, db):
        result = AuthService.register_user(
            email="new@example.com",
            username="newuser",
            password="password123",
        )
        assert "user" in result
        assert "token" in result
        assert result["user"]["email"] == "new@example.com"

    def test_register_duplicate_email(self, db):
        AuthService.register_user(
            email="dup@example.com",
            username="user1",
            password="password123",
        )
        with pytest.raises(ValueError, match="Email already registered"):
            AuthService.register_user(
                email="dup@example.com",
                username="user2",
                password="password123",
            )

    def test_register_duplicate_username(self, db):
        AuthService.register_user(
            email="a@example.com",
            username="sameuser",
            password="password123",
        )
        with pytest.raises(ValueError, match="Username already taken"):
            AuthService.register_user(
                email="b@example.com",
                username="sameuser",
                password="password123",
            )

    def test_register_short_password(self, db):
        with pytest.raises(ValueError, match="at least 8 characters"):
            AuthService.register_user(
                email="short@example.com",
                username="shortpw",
                password="1234567",
            )

    def test_register_invalid_email(self, db):
        with pytest.raises(ValueError, match="Invalid email format"):
            AuthService.register_user(
                email="not-an-email",
                username="bademail",
                password="password123",
            )

    def test_register_short_username(self, db):
        with pytest.raises(ValueError, match="at least 2 characters"):
            AuthService.register_user(
                email="x@example.com",
                username="x",
                password="password123",
            )


class TestAuthServiceLogin:
    def test_login_success(self, db):
        AuthService.register_user(
            email="login@example.com",
            username="loginuser",
            password="password123",
        )
        result = AuthService.login_user(
            email="login@example.com",
            password="password123",
        )
        assert "token" in result
        assert result["user"]["email"] == "login@example.com"

    def test_login_wrong_password(self, db):
        AuthService.register_user(
            email="wrong@example.com",
            username="wrongpw",
            password="correctpass123",
        )
        with pytest.raises(ValueError, match="Invalid email or password"):
            AuthService.login_user(
                email="wrong@example.com",
                password="wrongpassword",
            )

    def test_login_nonexistent_email(self, db):
        with pytest.raises(ValueError, match="Invalid email or password"):
            AuthService.login_user(
                email="nobody@example.com",
                password="password123",
            )


# ─── VideoService ─────────────────────────────────────────────────────────────

class TestVideoService:
    def setup_method(self):
        self.service = VideoService()

    def test_validate_valid_mp4(self):
        file = io.BytesIO(b"fake video content")
        file.filename = "video.mp4"
        assert self.service.validate_video(file) is True

    def test_validate_valid_mov(self):
        file = io.BytesIO(b"fake content")
        file.filename = "clip.mov"
        assert self.service.validate_video(file) is True

    def test_validate_valid_avi(self):
        file = io.BytesIO(b"fake content")
        file.filename = "clip.avi"
        assert self.service.validate_video(file) is True

    def test_validate_valid_mkv(self):
        file = io.BytesIO(b"fake content")
        file.filename = "clip.mkv"
        assert self.service.validate_video(file) is True

    def test_validate_valid_webm(self):
        file = io.BytesIO(b"fake content")
        file.filename = "clip.webm"
        assert self.service.validate_video(file) is True

    def test_validate_invalid_extension(self):
        file = io.BytesIO(b"fake content")
        file.filename = "document.pdf"
        with pytest.raises(ValueError, match="Invalid file extension"):
            self.service.validate_video(file)

    def test_validate_no_extension(self):
        file = io.BytesIO(b"fake content")
        file.filename = "README"
        with pytest.raises(ValueError, match="Invalid file extension"):
            self.service.validate_video(file)

    def test_validate_empty_filename(self):
        file = io.BytesIO(b"fake content")
        file.filename = ""
        with pytest.raises(ValueError, match="No file provided"):
            self.service.validate_video(file)

    def test_validate_uppercase_extension(self):
        file = io.BytesIO(b"fake content")
        file.filename = "VIDEO.MP4"
        assert self.service.validate_video(file) is True

    def test_validate_exceeds_max_size(self):
        big_content = b"x" * (100 * 1024 * 1024 + 1)
        file = io.BytesIO(big_content)
        file.filename = "big.mp4"
        with pytest.raises(ValueError, match="exceeds maximum size"):
            self.service.validate_video(file)
