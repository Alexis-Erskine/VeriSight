"""Model configuration constants for the Xception deepfake detector."""

MODEL_CONFIG = {
    "backbone": "xception",
    "input_size": 299,
    "mean": [0.5, 0.5, 0.5],
    "std": [0.5, 0.5, 0.5],
}

PREDICTION_CONFIG = {
    "confidence_threshold": 0.5,
    "risk_thresholds": {
        "critical": 0.8,
        "high": 0.6,
        "medium": 0.3,
        "low": 0.0,
    },
}

FRAME_CONFIG = {
    "sample_rate": 1,
    "min_face_size": 40,
    "face_margin": 0,
}
