import uuid
from datetime import datetime, timezone

from app.extensions import db


class AnalysisResult(db.Model):
    __tablename__ = "analysis_results"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = db.Column(
        db.String(36), db.ForeignKey("uploaded_videos.id"), nullable=False, unique=True, index=True
    )

    filename = db.Column(db.String(512), nullable=False)
    prediction = db.Column(db.Float, nullable=True)
    confidence = db.Column(db.Float, nullable=True)
    risk_level = db.Column(db.String(20), nullable=True, index=True)
    frames_analyzed = db.Column(db.Integer, nullable=True, default=0)
    total_frames = db.Column(db.Integer, nullable=True, default=0)
    processing_time_ms = db.Column(db.Float, nullable=True)

    status = db.Column(
        db.String(20), nullable=False, default="pending", index=True
    )
    error_message = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    completed_at = db.Column(db.DateTime, nullable=True)

    @property
    def prediction_label(self):
        if self.prediction is None:
            return None
        return "deepfake" if self.prediction > 0.5 else "authentic"

    @property
    def date_uploaded(self):
        return self.created_at

    @staticmethod
    def _compute_risk_level(prediction):
        if prediction is None:
            return "unknown"
        if prediction >= 0.8:
            return "critical"
        if prediction >= 0.6:
            return "high"
        if prediction >= 0.3:
            return "medium"
        return "low"

    def to_dict(self):
        return {
            "id": self.id,
            "video_id": self.video_id,
            "filename": self.filename,
            "prediction": self.prediction,
            "prediction_label": self.prediction_label,
            "confidence": self.confidence,
            "risk_level": self.risk_level,
            "frames_analyzed": self.frames_analyzed,
            "total_frames": self.total_frames,
            "processing_time_ms": self.processing_time_ms,
            "status": self.status,
            "error_message": self.error_message,
            "date_uploaded": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat()
            if self.completed_at
            else None,
        }

    def __repr__(self):
        return (
            f"<AnalysisResult {self.id} "
            f"prediction={self.prediction:.4f} "
            f"risk={self.risk_level}>"
        )
