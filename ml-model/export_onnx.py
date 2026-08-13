"""Export the FaceForge Xception deepfake detector to ONNX (INT8-quantized).

Usage:
    python ml-model/export_onnx.py <checkpoint.pth> <output.onnx>

Matches the FaceForge detector card: timm xception num_classes=2,
input 224x224, normalize (x/255 - 0.5) / 0.5, softmax -> [REAL, FAKE].
"""
import sys

import numpy as np
import torch
import torch.nn as nn
import timm
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType


class FaceForgeNet(nn.Module):
    """Wrapper matching the checkpoint layout: xception backbone + classifier head."""

    def __init__(self):
        super().__init__()
        self.xception = timm.create_model("xception", pretrained=False, num_classes=0)
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(self.xception.num_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(512, 2),
        )

    def forward(self, x):
        return self.classifier(self.xception(x))


def main(checkpoint_path: str, output_path: str):
    model = FaceForgeNet()
    state = torch.load(checkpoint_path, map_location="cpu")
    if "model_state_dict" in state:
        state = state["model_state_dict"]
    model.load_state_dict(state, strict=True)
    model.eval()

    dummy = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        torch_out = torch.softmax(model(dummy), dim=1).numpy()

    torch.onnx.export(
        model,
        dummy,
        output_path,
        input_names=["input"],
        output_names=["logits"],
        opset_version=17,
        dynamo=False,
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
    )

    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print(f"Exported ONNX: {output_path} ({onnx_model.ir_version})")

    quantized_path = output_path.replace(".onnx", "-int8.onnx")
    quantize_dynamic(
        output_path,
        quantized_path,
        weight_type=QuantType.QUInt8,
    )
    import os

    print(f"Quantized: {quantized_path} ({os.path.getsize(quantized_path) / 1e6:.1f} MB)")

    import onnxruntime as ort

    sess = ort.InferenceSession(quantized_path, providers=["CPUExecutionProvider"])
    onnx_out = sess.run(None, {"input": dummy.numpy()})[0]
    onnx_out = torch.softmax(torch.from_numpy(onnx_out), dim=1).numpy()

    diff = float(np.abs(torch_out[0, 1] - onnx_out[0, 1]))
    print(f"Torch FAKE prob: {torch_out[0, 1]:.6f}")
    print(f"ONNX  FAKE prob: {onnx_out[0, 1]:.6f}")
    print(f"Abs diff: {diff:.6f}")
    if diff > 0.02:
        print("WARNING: large mismatch between torch and ONNX outputs")
        sys.exit(1)
    print("OK: torch and ONNX outputs match")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])