import uuid
from datetime import datetime, timezone

from app.extensions import db


class UploadedVideo(db.Model):
    __tablename__ = "uploaded_videos"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), nullable=False, index=True
    )

    filename = db.Column(db.String(512), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)
    file_path = db.Column(db.String(1024), nullable=False)
    mime_type = db.Column(db.String(80), nullable=True)

    uploaded_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    analysis = db.relationship(
        "AnalysisResult",
        backref="video",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "uploaded_at": self.uploaded_at.isoformat(),
        }

    def __repr__(self):
        return f"<UploadedVideo {self.id} {self.original_filename}>"
