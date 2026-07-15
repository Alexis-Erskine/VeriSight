import os
import logging

logger = logging.getLogger(__name__)


class XceptionDeepFakeDetector:
    """Xception-based deepfake detector.

    Uses a timm Xception backbone pretrained on ImageNet with a custom
    binary classification head. Designed for the FaceForensics++ protocol
    (299x299 input, sigmoid output).
    """

    def __init__(self, weights_path=None, device=None):
        import torch
        import torch.nn as nn

        if device is None:
            self.device = torch.device(
                "cuda" if torch.cuda.is_available() else "cpu"
            )
        else:
            self.device = device

        self.input_size = 299
        logger.info(
            "Initializing XceptionDeepFakeDetector on device: %s",
            self.device,
        )

        self.model = self._build_model(nn)
        self._load_weights(weights_path, torch)
        self.model.to(self.device)
        self.model.eval()

        logger.info("XceptionDeepFakeDetector ready")

    def _build_model(self, nn):
        import timm

        model = timm.create_model("xception", pretrained=True, num_classes=0)
        num_features = model.num_features

        model.fc = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_features, 512),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(512),
            nn.Dropout(p=0.3),
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(256),
            nn.Dropout(p=0.2),
            nn.Linear(256, 1),
            nn.Sigmoid(),
        )
        return model

    def _load_weights(self, weights_path, torch):
        if weights_path and os.path.exists(weights_path):
            logger.info("Loading fine-tuned weights from %s", weights_path)
            state = torch.load(weights_path, map_location=self.device)
            if "model_state_dict" in state:
                state = state["model_state_dict"]
            self.model.load_state_dict(state, strict=False)
            logger.info("Fine-tuned weights applied")
        else:
            logger.info(
                "Using ImageNet-pretrained Xception backbone. "
                "For production, fine-tune on FaceForensics++ or Celeb-DF."
            )

    def predict(self, face_tensor):
        import torch

        with torch.no_grad():
            if face_tensor.ndim == 3:
                face_tensor = face_tensor.unsqueeze(0)
            face_tensor = face_tensor.to(self.device)
            outputs = self.model(face_tensor)
            return outputs.squeeze()

    @staticmethod
    def compute_confidence(prediction):
        return abs(prediction - 0.5) * 2

    @staticmethod
    def compute_risk_level(prediction):
        if prediction is None:
            return "unknown"
        if prediction >= 0.8:
            return "critical"
        if prediction >= 0.6:
            return "high"
        if prediction >= 0.3:
            return "medium"
        return "low"

    @staticmethod
    def compute_prediction_label(prediction):
        if prediction is None:
            return None
        return "deepfake" if prediction > 0.5 else "authentic"
