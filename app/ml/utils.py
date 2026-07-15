import torch
import torchvision.transforms as transforms

from app.ml.config import MODEL_CONFIG


_input_size = MODEL_CONFIG["input_size"]
IMAGENET_MEAN = MODEL_CONFIG["mean"]
IMAGENET_STD = MODEL_CONFIG["std"]


_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


def face_to_tensor(face_array, input_size=None):
    """Convert a face numpy array (H,W,3) to a normalized PyTorch tensor."""
    from PIL import Image

    size = input_size or _input_size
    pil_image = Image.fromarray(face_array).resize((size, size))
    return _transform(pil_image)


def frame_to_tensor(frame_array, input_size=None):
    """Convert a full frame to a tensor (no face detection)."""
    from PIL import Image

    size = input_size or _input_size
    pil_image = Image.fromarray(frame_array).resize((size, size))
    return _transform(pil_image)
