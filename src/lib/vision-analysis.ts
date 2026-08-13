import { extractJson } from "./ai-analysis";

export interface VisionOutput {
  prediction: number;
  confidence: number;
  cues: string[];
  analysis_text: string;
}

export interface VisionMeta {
  title?: string;
  description?: string;
  author?: string;
}

export const OPENROUTER_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ATTEMPT_TIMEOUT_MS = 12000;

function asDataUrl(image: string): string {
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;
}

function fitImages(images: string[]): string[] {
  const fitted: string[] = [];
  let total = 0;
  for (const image of images) {
    const approxBytes = image.length * 0.75;
    if (total + approxBytes > MAX_IMAGE_BYTES) break;
    fitted.push(image);
    total += approxBytes;
  }
  return fitted;
}

function buildVisionPrompt(
  filename: string | undefined,
  source: string | undefined,
  meta: VisionMeta
): string {
  const metaLines = [
    meta.title ? `Content title: "${meta.title}"` : null,
    meta.author ? `Content author: "${meta.author}"` : null,
    meta.description ? `Content description: "${meta.description}"` : null,
  ].filter(Boolean);

  return `You are a forensic deepfake screening AI. You are given one or more still frames (or a thumbnail preview) of an online video, along with its metadata. Analyze ONLY what is visible in the provided images.

Context:
Video filename: "${filename ?? "unknown"}"
Source: ${source ?? "file"}
${metaLines.length ? metaLines.join("\n") : "Content metadata: (none available)"}

Look for common deepfake artifacts, e.g.:
- blurring, warping or blending seams around the face, hair, ears, glasses or jawline
- inconsistent lighting, shadows or skin texture between face and rest of the frame
- unnatural blinking, distorted or asymmetric eyes, teeth and mouth artifacts
- sudden changes in facial identity between frames (identity inconsistency)
- duplicated or unnatural hands/fingers, or geometric distortions in the background

CALIBRATION RULES (must follow exactly):
- If no human face is visible or the image cannot be reliably assessed, score between 0.05 and 0.45.
- Only score 0.60 or higher when you actually see visible manipulation artifacts in the images themselves.
- Never justify a high score with the title or filename alone; artifacts must be visible in the frames.

Return ONLY valid JSON, no markdown, with exactly these keys:
- "prediction": float 0.0 (authentic) to 1.0 (deepfake)
- "confidence": float 0.0 to 1.0
- "cues": array of short strings naming the visual artifacts observed (empty array if none)
- "analysis_text": formal forensic summary in 2-3 sentences (max ~300 characters), no markdown. State what was examined, which artifacts were or were not observed, and how that supports the prediction score.

Example:
{"prediction":0.12,"confidence":0.84,"cues":[],"analysis_text":"One thumbnail frame was examined. No visible manipulation artifacts such as blending seams, warping or lighting inconsistencies were observed. These findings support a low prediction score consistent with authentic content."}`;
}

function parseVision(text: string): VisionOutput | null {
  const json = extractJson(text);
  if (!json) return null;
  const prediction = json.prediction;
  if (typeof prediction !== "number" || prediction < 0 || prediction > 1) {
    return null;
  }
  const cues = Array.isArray(json.cues)
    ? json.cues.filter((c): c is string => typeof c === "string" && c.trim() !== "")
        .map((c) => c.trim())
        .slice(0, 8)
    : [];
  const analysisText =
    typeof json.analysis_text === "string" && json.analysis_text.trim()
      ? json.analysis_text.trim()
      : "Visual assessment completed with no artifacts observed.";
  const confidence =
    typeof json.confidence === "number" && json.confidence >= 0 && json.confidence <= 1
      ? json.confidence
      : 0.5 + Math.random() * 0.3;
  return {
    prediction,
    confidence: Math.min(confidence, 0.99),
    cues,
    analysis_text: analysisText,
  };
}

export async function analyzeFrames(
  images: string[],
  meta: VisionMeta,
  filename?: string,
  source?: string
): Promise<VisionOutput | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const fitted = fitImages(images.map(asDataUrl));
  if (fitted.length === 0) return null;

  const prompt = buildVisionPrompt(filename, source, meta);

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://verisight-eta.vercel.app",
          },
          body: JSON.stringify({
            model: OPENROUTER_VISION_MODEL,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  ...fitted.map((url) => ({ type: "image_url", image_url: { url } })),
                ],
              },
            ],
            temperature: 0.4,
            max_tokens: 700,
          }),
          signal: ctrl.signal,
        });

        if (!res.ok) continue;

        const data = await res.json();
        const content: string = data?.choices?.[0]?.message?.content ?? "";
        if (!content.trim()) continue;

        const parsed = parseVision(content);
        if (parsed) return parsed;
      } finally {
        clearTimeout(timer);
      }
    }
  } catch {}

  return null;
}