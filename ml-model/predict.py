import os
import tempfile
import logging
from typing import List
import numpy as np

from cog import BasePredictor, Input, Path
import cv2
import torch
from PIL import Image

from model import XceptionDeepFakeDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRAME_CONFIG = {
    "sample_rate": 1,
    "face_margin": 40,
    "min_face_size": 50,
}


def extract_frames(video_path: str, sample_rate: int = 1) -> List[np.ndarray]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0

    frame_interval = max(1, int(round(fps / sample_rate)))
    frames = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(rgb)
        frame_idx += 1

    cap.release()
    logger.info(f"Extracted {len(frames)} frames from {total_frames} total")
    return frames


def detect_faces(frames: List[np.ndarray], input_size: int = 299) -> List[torch.Tensor]:
    try:
        return _mtcnn_detect(frames, input_size)
    except ImportError:
        logger.warning("facenet-pytorch not available, using Haar fallback")
        return _haar_detect(frames, input_size)


def _mtcnn_detect(frames: List[np.ndarray], input_size: int) -> List[torch.Tensor]:
    from facenet_pytorch import MTCNN

    mtcnn = MTCNN(
        image_size=input_size,
        margin=FRAME_CONFIG["face_margin"],
        min_face_size=FRAME_CONFIG["min_face_size"],
        device="cpu",
        select_largest=True,
        keep_all=False,
        post_process=True,
    )

    tensors = []
    for frame in frames:
        pil = Image.fromarray(frame)
        t = mtcnn(pil)
        if t is not None:
            tensors.append(t)

    logger.info(f"MTCNN detected faces in {len(tensors)} / {len(frames)} frames")
    return tensors


def _haar_detect(frames: List[np.ndarray], input_size: int) -> List[torch.Tensor]:
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    tensors = []
    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            roi = frame[y : y + h, x : x + w]
            img = cv2.resize(roi, (input_size, input_size))
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            tensor = torch.from_numpy(img_rgb).permute(2, 0, 1).float() / 255.0
            tensors.append(tensor)

    logger.info(f"Haar detected faces in {len(tensors)} / {len(frames)} frames")
    return tensors


class Predictor(BasePredictor):
    def setup(self, weights: Path = None):
        logger.info("Loading model...")
        weight_path = str(weights) if weights and os.path.exists(str(weights)) else None
        self.detector = XceptionDeepFakeDetector(weights_path=weight_path)
        logger.info("Model loaded")

    def predict(
        self,
        video: Path = Input(description="Video file to analyze"),
    ) -> dict:
        frames = extract_frames(str(video))
        if not frames:
            return {
                "prediction": 0.5,
                "confidence": 0.0,
                "frames_analyzed": 0,
                "total_frames": 0,
                "processing_time_ms": 0,
            }

        face_tensors = detect_faces(frames)
        if not face_tensors:
            logger.warning("No faces detected — returning 0.5 (uncertain)")
            return {
                "prediction": 0.5,
                "confidence": 0.0,
                "frames_analyzed": len(frames),
                "total_frames": len(frames),
                "processing_time_ms": 0,
            }

        import time
        start = time.time()

        predictions = []
        for tensor in face_tensors:
            pred = self.detector.predict(tensor)
            predictions.append(pred.item() if hasattr(pred, "item") else pred)

        elapsed_ms = (time.time() - start) * 1000
        avg_pred = float(np.mean(predictions))
        confidence = abs(avg_pred - 0.5) * 2

        return {
            "prediction": avg_pred,
            "confidence": confidence,
            "frames_analyzed": len(face_tensors),
            "total_frames": len(frames),
            "processing_time_ms": elapsed_ms,
        }
