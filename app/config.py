import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt-secret-change-in-production")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(100 * 1024 * 1024)))
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm"}
    ALLOWED_MIMETYPES = {"video/mp4", "video/x-msvideo", "video/quicktime",
                         "video/x-matroska", "video/webm"}

    MODEL_CONFIDENCE_THRESHOLD = float(os.getenv("MODEL_CONFIDENCE_THRESHOLD", "0.5"))
    FRAME_SAMPLE_RATE = int(os.getenv("FRAME_SAMPLE_RATE", "1"))
    FACE_INPUT_SIZE = 224


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///verisight_dev.db",
    )


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    UPLOAD_FOLDER = "test_uploads"


class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = None

    @classmethod
    def get_database_uri(cls):
        uri = os.getenv("DATABASE_URL")
        if not uri:
            raise ValueError(
                "DATABASE_URL environment variable is not set. "
                "Set it to your Neon PostgreSQL connection string."
            )
        if uri.startswith("postgres://"):
            uri = uri.replace("postgres://", "postgresql://", 1)
        if "sslmode" not in uri:
            separator = "&" if "?" in uri else "?"
            uri += f"{separator}sslmode=require"
        return uri

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 5,
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "pool_timeout": 30,
        "max_overflow": 10,
    }
