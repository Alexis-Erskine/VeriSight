import * as ort from "onnxruntime-node";
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface XceptionResult {
  prediction: number;
  confidence: number;
  facesAnalyzed: number;
  framesAnalyzed: number;
}

const INPUT_SIZE = 224;
const YUNET_SIZE = 640;
const FACE_MARGIN = 1.3;
const YUNET_SCORE_THRESHOLD = 0.6;
const YUNET_NMS_THRESHOLD = 0.3;
const YUNET_STRIDES = [8, 16, 32];
const TOTAL_BUDGET_MS = 25000;

let xceptionSession: ort.InferenceSession | null = null;
let yunetSession: ort.InferenceSession | null = null;
let modelInitPromise: Promise<boolean> | null = null;

function siteBase(): string {
  const url = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (url) return `https://${url}`;
  return "https://verisight-eta.vercel.app";
}

async function fetchToCache(url: string, dest: string): Promise<void> {
  if (existsSync(dest)) return;
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`Failed to fetch model: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(join("/tmp", "verisight-models"), { recursive: true });
  writeFileSync(dest, buf);
}

function findLocalModel(name: string): string | null {
  const candidates = [
    join(process.cwd(), "public", name),
    join(process.cwd(), ".", name),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function initModels(): Promise<boolean> {
  if (modelInitPromise) return modelInitPromise;
  modelInitPromise = (async () => {
    try {
      const cacheDir = "/tmp/verisight-models";
      const names = ["xception-int8.onnx", "yunet-face.onnx"];

      for (const name of names) {
        const dest = join(cacheDir, name);
        if (!existsSync(dest)) {
          const local = findLocalModel(name);
          if (local) {
            mkdirSync(cacheDir, { recursive: true });
            writeFileSync(dest, readFileSync(local));
          } else {
            await fetchToCache(`${siteBase()}/${name}`, dest);
          }
        }
      }

      const [x, y] = await Promise.all([
        ort.InferenceSession.create(join(cacheDir, "xception-int8.onnx"), {
          executionProviders: ["cpu"],
        }),
        ort.InferenceSession.create(join(cacheDir, "yunet-face.onnx"), {
          executionProviders: ["cpu"],
        }),
      ]);
      xceptionSession = x;
      yunetSession = y;
      return true;
    } catch (e) {
      console.warn("Xception model init failed:", e instanceof Error ? e.message : e);
      xceptionSession = null;
      yunetSession = null;
      return false;
    }
  })();
  return modelInitPromise;
}

interface DecodedFrame {
  data: Buffer;
  width: number;
  height: number;
}

async function decodeFrame(dataUrl: string): Promise<DecodedFrame | null> {
  const b64 = dataUrl.split(",")[1] ?? dataUrl;
  const { data, info } = await sharp(Buffer.from(b64, "base64"))
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

interface FaceBox {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

function nms(boxes: FaceBox[]): FaceBox[] {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const kept: FaceBox[] = [];
  for (const box of sorted) {
    let overlap = false;
    for (const k of kept) {
      const ix = Math.max(0, Math.min(box.x + box.w, k.x + k.w) - Math.max(box.x, k.x));
      const iy = Math.max(0, Math.min(box.y + box.h, k.y + k.h) - Math.max(box.y, k.y));
      const inter = ix * iy;
      const union = box.w * box.h + k.w * k.h - inter;
      if (inter / union > YUNET_NMS_THRESHOLD) {
        overlap = true;
        break;
      }
    }
    if (!overlap) kept.push(box);
  }
  return kept;
}

async function detectFace(frame: DecodedFrame): Promise<{ x: number; y: number; w: number; h: number } | null> {
  if (!yunetSession) return null;
  const scaleX = frame.width / YUNET_SIZE;
  const scaleY = frame.height / YUNET_SIZE;

  const resized = await sharp(frame.data, { raw: { width: frame.width, height: frame.height, channels: 3 } })
    .resize(YUNET_SIZE, YUNET_SIZE, { fit: "fill" })
    .raw()
    .toBuffer();

  const input = new Float32Array(1 * 3 * YUNET_SIZE * YUNET_SIZE);
  for (let i = 0; i < YUNET_SIZE * YUNET_SIZE; i++) {
    const r = resized[i * 3];
    const g = resized[i * 3 + 1];
    const b = resized[i * 3 + 2];
    input[i] = b;
    input[YUNET_SIZE * YUNET_SIZE + i] = g;
    input[2 * YUNET_SIZE * YUNET_SIZE + i] = r;
  }

  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor("float32", input, [1, 3, YUNET_SIZE, YUNET_SIZE]),
  };
  const outputs = await yunetSession.run(feeds);

  const faces: FaceBox[] = [];
  for (const stride of YUNET_STRIDES) {
    const cls = outputs[`cls_${stride}`].data as Float32Array;
    const obj = outputs[`obj_${stride}`].data as Float32Array;
    const bbox = outputs[`bbox_${stride}`].data as Float32Array;
    const cols = YUNET_SIZE / stride;
    const rows = YUNET_SIZE / stride;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const clsScore = Math.min(Math.max(cls[idx], 0), 1);
        const objScore = Math.min(Math.max(obj[idx], 0), 1);
        const score = Math.sqrt(clsScore * objScore);
        if (score < YUNET_SCORE_THRESHOLD) continue;
        const cx = (c + bbox[idx * 4]) * stride;
        const cy = (r + bbox[idx * 4 + 1]) * stride;
        const w = Math.exp(bbox[idx * 4 + 2]) * stride;
        const h = Math.exp(bbox[idx * 4 + 3]) * stride;
        faces.push({ x: (cx - w / 2) * scaleX, y: (cy - h / 2) * scaleY, w: w * scaleX, h: h * scaleY, score });
      }
    }
  }

  const kept = nms(faces);
  const best = kept.sort((a, b) => b.score - a.score)[0];
  if (!best) return null;

  const cx = best.x + best.w / 2;
  const cy = best.y + best.h / 2;
  const halfW = (best.w * FACE_MARGIN) / 2;
  const halfH = (best.h * FACE_MARGIN) / 2;
  const x = Math.max(0, Math.round(cx - halfW));
  const y = Math.max(0, Math.round(cy - halfH));
  const w = Math.min(frame.width - x, Math.round(halfW * 2));
  const h = Math.min(frame.height - y, Math.round(halfH * 2));
  if (w < 8 || h < 8) return null;
  return { x, y, w, h };
}

async function xceptionScoreOnCrop(
  raw: Buffer,
  width: number,
  height: number
): Promise<number | null> {
  if (!xceptionSession) return null;
  const resized = await sharp(raw, { raw: { width, height, channels: 3 } })
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill" })
    .raw()
    .toBuffer();

  const input = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    input[i] = resized[i * 3] / 127.5 - 1;
    input[INPUT_SIZE * INPUT_SIZE + i] = resized[i * 3 + 1] / 127.5 - 1;
    input[2 * INPUT_SIZE * INPUT_SIZE + i] = resized[i * 3 + 2] / 127.5 - 1;
  }

  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]),
  };
  const outputs = await xceptionSession.run(feeds);
  const logits = outputs["logits"].data as Float32Array;
  const e0 = Math.exp(logits[0]);
  const e1 = Math.exp(logits[1]);
  return e1 / (e0 + e1);
}

async function scoreFrame(
  frame: DecodedFrame,
  face: { x: number; y: number; w: number; h: number } | null
): Promise<number> {
  if (face) {
    const crop = await sharp(frame.data, {
      raw: { width: frame.width, height: frame.height, channels: 3 },
    })
      .extract({ left: face.x, top: face.y, width: face.w, height: face.h })
      .raw()
      .toBuffer();
    const score = await xceptionScoreOnCrop(crop, face.w, face.h);
    if (score != null) return score;
  }
  const whole = await xceptionScoreOnCrop(frame.data, frame.width, frame.height);
  return whole ?? 0.5;
}

export async function runXception(images: string[]): Promise<XceptionResult | null> {
  if (!images.length) return null;

  const ready = await initModels();
  if (!ready) return null;

  try {
    const result = await Promise.race([
      (async () => {
        let faces = 0;
        const scores: number[] = [];
        for (const image of images) {
          const frame = await decodeFrame(image);
          if (!frame) continue;
          const face = await detectFace(frame);
          if (face) faces++;
          scores.push(await scoreFrame(frame, face));
        }
        if (scores.length === 0) return null;
        const prediction = scores.reduce((a, b) => a + b, 0) / scores.length;
        const confidence = Math.min(Math.abs(prediction - 0.5) * 2, 0.99);
        return {
          prediction,
          confidence,
          facesAnalyzed: faces,
          framesAnalyzed: scores.length,
        } satisfies XceptionResult;
      })(),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), TOTAL_BUDGET_MS)
      ),
    ]);
    return result;
  } catch (e) {
    console.warn("Xception inference failed:", e instanceof Error ? e.message : e);
    return null;
  }
}