import cv2
import numpy as np
from PIL import Image

from app.ml.config import FRAME_CONFIG, MODEL_CONFIG
from app.ml.utils import face_to_tensor

_logger = None


def _get_logger():
    global _logger
    if _logger is None:
        import logging
        _logger = logging.getLogger(__name__)
    return _logger


def extract_frames(video_path, sample_rate=None):
    """Extract frames from a video file at the given sample rate.

    Args:
        video_path: Path to the video file.
        sample_rate: Frames per second to sample (default from config).

    Returns:
        List of RGB numpy arrays (H, W, 3).
    """
    if sample_rate is None:
        sample_rate = FRAME_CONFIG["sample_rate"]

    log = _get_logger()
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 30.0

    frame_interval = max(1, int(round(fps / sample_rate)))
    frames = []
    frame_idx = 0

    log.info(
        "Video: %s | total_frames=%d | fps=%.2f | interval=%d",
        video_path, total_frames, fps, frame_interval,
    )

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(rgb_frame)

        frame_idx += 1

    cap.release()

    log.info("Extracted %d frames (every %dth of %.1f fps)", len(frames), frame_interval, fps)
    return frames


def detect_faces_in_frames(frames, input_size=None):
    """Detect faces in frames and return cropped face tensors.

    Uses MTCNN from facenet-pytorch when available, with Haar cascade
    fallback for environments without GPU or facenet.

    Args:
        frames: List of RGB numpy arrays.
        input_size: Target size for cropped face (default from config).

    Returns:
        List of normalized PyTorch tensors (C, H, W).
    """
    if input_size is None:
        input_size = MODEL_CONFIG["input_size"]

    log = _get_logger()

    try:
        return _mtcnn_face_detection(frames, input_size)
    except ImportError:
        log.warning("facenet-pytorch not available, using Haar cascade fallback")
        return _haar_face_detection(frames, input_size)


def _mtcnn_face_detection(frames, input_size):
    """Face detection using MTCNN."""
    from facenet_pytorch import MTCNN

    log = _get_logger()
    mtcnn = MTCNN(
        image_size=input_size,
        margin=FRAME_CONFIG["face_margin"],
        min_face_size=FRAME_CONFIG["min_face_size"],
        device="cpu",
        select_largest=True,
        keep_all=False,
        post_process=True,
    )

    face_tensors = []
    for frame in frames:
        pil_image = Image.fromarray(frame)
        face_tensor = mtcnn(pil_image)
        if face_tensor is not None:
            face_tensors.append(face_tensor)

    log.info("MTCNN detected faces in %d / %d frames", len(face_tensors), len(frames))
    return face_tensors


def _haar_face_detection(frames, input_size):
    """Fallback face detection using Haar cascades."""
    log = _get_logger()
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    face_tensors = []
    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(FRAME_CONFIG["min_face_size"], FRAME_CONFIG["min_face_size"]),
        )

        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            face_roi = frame[y : y + h, x : x + w]
            tensor = face_to_tensor(face_roi, input_size)
            face_tensors.append(tensor)

    log.info("Haar detected faces in %d / %d frames", len(face_tensors), len(frames))
    return face_tensors
