"""Tests for ML-adjacent utilities (risk levels, confidence, labels).

These tests do NOT require torch/timm — they only test the pure-Python
prediction helper functions used in the analysis pipeline.
"""

import pytest
from app.models.analysis_result import AnalysisResult


class TestRiskLevel:
    """Boundary tests for AnalysisResult._compute_risk_level."""

    @pytest.mark.parametrize("score,expected", [
        (None, "unknown"),
        (-0.1, "low"),
        (0.0, "low"),
        (0.1, "low"),
        (0.29, "low"),
        (0.299, "low"),
        (0.3, "medium"),
        (0.31, "medium"),
        (0.5, "medium"),
        (0.599, "medium"),
        (0.6, "high"),
        (0.61, "high"),
        (0.7, "high"),
        (0.79, "high"),
        (0.8, "critical"),
        (0.81, "critical"),
        (0.9, "critical"),
        (0.99, "critical"),
        (1.0, "critical"),
        (1.5, "critical"),
    ])
    def test_risk_level_boundaries(self, score, expected):
        assert AnalysisResult._compute_risk_level(score) == expected


class TestPredictionLabel:
    """Boundary tests for the prediction_label property."""

    def setup_result(self, db, sample_user, prediction):
        from app.models.uploaded_video import UploadedVideo
        video = UploadedVideo(
            user_id=sample_user.id,
            filename="pred.mp4",
            original_filename="pred.mp4",
            file_size=100,
            file_path="/tmp/pred.mp4",
        )
        db.session.add(video)
        db.session.flush()

        result = AnalysisResult(video_id=video.id, filename="pred.mp4")
        result.prediction = prediction
        return result

    @pytest.mark.parametrize("score,expected", [
        (0.0, "authentic"),
        (0.1, "authentic"),
        (0.49, "authentic"),
        (0.5, "authentic"),
        (0.51, "deepfake"),
        (0.6, "deepfake"),
        (0.99, "deepfake"),
        (1.0, "deepfake"),
    ])
    def test_prediction_label_boundaries(self, db, sample_user, score, expected):
        result = self.setup_result(db, sample_user, score)
        assert result.prediction_label == expected

    def test_prediction_label_none(self, db, sample_user):
        result = self.setup_result(db, sample_user, None)
        assert result.prediction_label is None


class TestConfidence:
    """Tests for confidence = |prediction - 0.5| * 2 as used in detection_service."""

    @staticmethod
    def compute_confidence(prediction):
        return abs(prediction - 0.5) * 2

    @pytest.mark.parametrize("prediction,expected", [
        (0.5, 0.0),
        (0.0, 1.0),
        (1.0, 1.0),
        (0.75, 0.5),
        (0.25, 0.5),
        (0.9, 0.8),
        (0.1, 0.8),
    ])
    def test_confidence_values(self, prediction, expected):
        assert abs(self.compute_confidence(prediction) - expected) < 1e-6


class TestModelStaticMethods:
    """Tests for the static utility methods on XceptionDeepFakeDetector.

    These are pure-Python methods that do NOT require torch/timm,
    making them safe to run in any environment.
    """

    def test_compute_confidence(self):
        from app.ml.model import XceptionDeepFakeDetector
        assert XceptionDeepFakeDetector.compute_confidence(0.5) == 0.0
        assert XceptionDeepFakeDetector.compute_confidence(0.0) == 1.0
        assert XceptionDeepFakeDetector.compute_confidence(1.0) == 1.0
        assert abs(XceptionDeepFakeDetector.compute_confidence(0.75) - 0.5) < 1e-6

    def test_risk_level(self):
        from app.ml.model import XceptionDeepFakeDetector
        assert XceptionDeepFakeDetector.compute_risk_level(None) == "unknown"
        assert XceptionDeepFakeDetector.compute_risk_level(0.0) == "low"
        assert XceptionDeepFakeDetector.compute_risk_level(0.3) == "medium"
        assert XceptionDeepFakeDetector.compute_risk_level(0.6) == "high"
        assert XceptionDeepFakeDetector.compute_risk_level(0.8) == "critical"

    def test_prediction_label(self):
        from app.ml.model import XceptionDeepFakeDetector
        assert XceptionDeepFakeDetector.compute_prediction_label(None) is None
        assert XceptionDeepFakeDetector.compute_prediction_label(0.0) == "authentic"
        assert XceptionDeepFakeDetector.compute_prediction_label(0.5) == "authentic"
        assert XceptionDeepFakeDetector.compute_prediction_label(0.51) == "deepfake"
        assert XceptionDeepFakeDetector.compute_prediction_label(1.0) == "deepfake"
