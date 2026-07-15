import time
import logging
from datetime import datetime, timezone

from app.ml.config import FRAME_CONFIG

logger = logging.getLogger(__name__)


class DetectionService:

    @staticmethod
    def run_analysis(file_path, analysis_id, app):
        logger.info("Starting analysis %s on file %s", analysis_id, file_path)

        start_time = time.time()

        detector = app.config.get("DETECTOR")
        if not detector:
            raise RuntimeError("ML model not loaded")

        from app.ml.preprocessing import extract_frames, detect_faces_in_frames

        sample_rate = app.config.get("FRAME_SAMPLE_RATE", FRAME_CONFIG["sample_rate"])
        frames = extract_frames(file_path, sample_rate=sample_rate)

        if len(frames) == 0:
            raise ValueError("No frames could be extracted from the video")

        face_frames = detect_faces_in_frames(frames)

        total_frames = len(frames)
        frames_analyzed = len(face_frames)

        if frames_analyzed == 0:
            elapsed_ms = (time.time() - start_time) * 1000
            logger.warning(
                "No faces detected in any of %d frames for analysis %s",
                total_frames, analysis_id,
            )
            return {
                "prediction": 0.0,
                "confidence": 0.0,
                "frames_analyzed": 0,
                "total_frames": total_frames,
                "processing_time_ms": round(elapsed_ms, 2),
                "completed_at": datetime.now(timezone.utc),
            }

        import torch
        face_tensor = torch.stack(face_frames)
        predictions = detector.predict(face_tensor)

        prediction = float(predictions.mean().item())
        confidence = detector.compute_confidence(prediction)
        elapsed_ms = (time.time() - start_time) * 1000

        logger.info(
            "Analysis %s complete: prediction=%.4f | confidence=%.4f | "
            "label=%s | risk=%s | faces=%d/%d | time=%.0fms",
            analysis_id,
            prediction,
            confidence,
            detector.compute_prediction_label(prediction),
            detector.compute_risk_level(prediction),
            frames_analyzed,
            total_frames,
            elapsed_ms,
        )

        return {
            "prediction": round(prediction, 4),
            "confidence": round(confidence, 4),
            "frames_analyzed": frames_analyzed,
            "total_frames": total_frames,
            "processing_time_ms": round(elapsed_ms, 2),
            "completed_at": datetime.now(timezone.utc),
        }
