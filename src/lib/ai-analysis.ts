import { OPENROUTER_MODEL } from "./openrouter";

export interface AiAnalysisInput {
  prediction: number;
  confidence: number | null;
  riskLevel: string | null;
  verdict: "deepfake" | "authentic";
  framesAnalyzed: number | null;
  totalFrames: number | null;
  processingTimeMs: number | null;
}

export interface AiAnalysisOutput {
  interpretation: string;
  keyFindings: string[];
  riskExplanation: string;
  recommendations: string[];
  executiveSummary: string;
}

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

export function defaultRecommendations(
  isDf: boolean,
  _riskLevel: string | null
): string[] {
  if (!isDf) {
    return [
      "Content appears authentic with no significant deepfake indicators.",
      "Cross-verify the video source for contextual consistency.",
      "Stay vigilant as deepfake technology evolves rapidly.",
    ];
  }
  return [
    "Treat the content as unverified and do not share or act on it without confirmation from a trusted source.",
    "Do not share unverified content. Deepfakes can spread misinformation.",
    "Examine visual artifacts, unnatural blinking, and audio-visual desynchronization.",
    "Report suspicious content to platform moderators or authorities.",
  ];
}

function buildPrompt(input: AiAnalysisInput): string {
  const score01 = input.prediction.toFixed(3);
  const scorePct = (input.prediction * 100).toFixed(1);
  const confidence =
    input.confidence != null ? (input.confidence * 100).toFixed(0) : "not reported";
  const framesA = input.framesAnalyzed ?? "not reported";
  const framesT = input.totalFrames ?? "not reported";
  const ms = input.processingTimeMs ?? "not reported";

  return `You are a forensic report analyst for VeriSight, an AI-powered deepfake detection platform. A separate DETECTION MODEL has already analyzed the media and produced the verdict below. Your ONLY job is to interpret those results and explain them clearly for a non-technical reader.

You must NOT:
- decide or second-guess whether the media is a deepfake
- introduce detection findings that are not supported by the numbers given below
- change, soften, or contradict the verdict or risk level

Detection results (provided by the detection model; treat as ground truth):
- deepfake_score: ${score01} on a 0.0-1.0 scale (0.0 = authentic, 1.0 = deepfake; equals ${scorePct}%)
- confidence: ${confidence} (0.0-1.0)
- risk_level: ${input.riskLevel ?? "not reported"}
- verdict: ${input.verdict}
- frames_analyzed: ${framesA}
- total_frames: ${framesT}
- processing_time_ms: ${ms}

Return ONLY valid JSON, no markdown, with exactly these keys, all values derived strictly from the numbers above:
- "interpretation": string (max 2 sentences, ~200 chars) - a clear plain-language interpretation of the results (what the score, confidence and frame coverage mean together)
- "keyFindings": array of 3 strings (each max 15 words) - the most important observations, derived ONLY from the given numbers
- "riskExplanation": string (max 2 sentences, ~200 chars) - plain-language explanation of what this risk level means for the user
- "recommendations": array of 3 strings (each max 15 words) - practical next steps consistent with the verdict and risk level (never contradict them)
- "executiveSummary": string (max 30 words) - 1-2 concise sentences for the top of the report covering verdict, deepfake score, confidence and risk level

Keep a professional, objective tone. Where a number is not reported, say so instead of estimating. Respond strictly about deepfake detection analysis; every field must reference the given detection numbers. Example:
{"interpretation":"The detection model returned a deepfake score of 87% with 92% confidence...","keyFindings":["The deepfake score of 87% indicates a strong likelihood of manipulation.","Model confidence of 92% supports the reliability of the assessment.","Analysis covered 45 of 120 frames, providing substantial coverage for the verdict."],"riskExplanation":"A high risk level means the content should be treated as unverified...","recommendations":["Treat the content as unverified until confirmed by a trusted source.","Do not share the content without verification.","Report it to platform moderators if it is spreading misinformation."],"executiveSummary":"VeriSight classified the content as a deepfake with an 87% deepfake score, 92% confidence and a high risk level."}`;
}

function extractJson(text: string): Record<string, unknown> | null {
  const unfenced = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");

  const attempts: string[] = [unfenced];

  if (!unfenced.startsWith("{")) {
    attempts.push("{" + unfenced.replace(/,\s*$/, "") + "}");
  }

  for (const attempt of attempts) {
    try {
      const json = JSON.parse(attempt);
      if (json && typeof json === "object") return json;
    } catch {}
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const json = JSON.parse(text.slice(start, end + 1));
      if (json && typeof json === "object") return json;
    } catch {}
  }

  return null;
}

function parseAnalysis(text: string): Partial<AiAnalysisOutput> {
  const json = extractJson(text);
  if (!json) return {};

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const strArr = (v: unknown): string[] | null =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "")
          .map((x) => x.trim())
          .slice(0, 6)
      : null;

  return {
    interpretation: str(json.interpretation) ?? undefined,
    keyFindings: strArr(json.keyFindings) ?? undefined,
    riskExplanation: str(json.riskExplanation) ?? undefined,
    recommendations: strArr(json.recommendations) ?? undefined,
    executiveSummary: str(json.executiveSummary) ?? undefined,
  };
}

export async function generateAiAnalysis(
  input: AiAnalysisInput
): Promise<AiAnalysisOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn("AI analysis unavailable, using fallback: OPENROUTER_API_KEY not set");
    return fallbackAiAnalysis(input, "OPENROUTER_API_KEY not set");
  }

  try {
    let lastError = "Unknown error";

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://verisight-eta.vercel.app",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{ role: "user", content: buildPrompt(input) }],
          temperature: 0.4,
          max_tokens: 1200,
        }),
      });

      if (!res.ok) {
        lastError = `API error ${res.status}`;
        continue;
      }

      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) {
        lastError = "Empty model response";
        continue;
      }

      const parsed = parseAnalysis(content);

      if (parsed.interpretation) {
        const base = fallbackAiAnalysis(input, "model response incomplete");
        return {
          interpretation: parsed.interpretation,
          keyFindings: parsed.keyFindings ?? base.keyFindings,
          riskExplanation: parsed.riskExplanation ?? base.riskExplanation,
          recommendations:
            parsed.recommendations ?? base.recommendations,
          executiveSummary: parsed.executiveSummary ?? base.executiveSummary,
        };
      }

      lastError = "Unparseable model response";
    }

    console.warn("AI analysis unavailable, using fallback:", lastError);
    return fallbackAiAnalysis(input, lastError);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Request failed";
    console.warn("AI analysis unavailable, using fallback:", msg);
    return fallbackAiAnalysis(input, msg);
  }
}

export function fallbackAiAnalysis(
  input: AiAnalysisInput,
  _reason: string
): AiAnalysisOutput {
  const score = (input.prediction * 100).toFixed(1);
  const confidence =
    input.confidence != null ? (input.confidence * 100).toFixed(0) : "not reported";
  const frameText =
    input.framesAnalyzed != null && input.totalFrames != null
      ? `${input.framesAnalyzed} of ${input.totalFrames} frames`
      : "a limited frame sample";
  const risk = (input.riskLevel ?? "unknown").toUpperCase();
  const verdict = input.verdict.toUpperCase();

  let scoreWording: string;
  if (input.prediction >= 0.75) {
    scoreWording = "indicates a strong likelihood of synthetic manipulation";
  } else if (input.prediction >= 0.5) {
    scoreWording = "indicates a moderate likelihood of synthetic manipulation";
  } else if (input.prediction >= 0.35) {
    scoreWording = "suggests the content is more likely authentic than manipulated, though not conclusive";
  } else {
    scoreWording = "suggests the content is most likely authentic";
  }

  let confidenceWording: string;
  if (input.confidence == null) {
    confidenceWording = "The model did not report a confidence level";
  } else if (input.confidence >= 0.85) {
    confidenceWording = "high model confidence supports the reliability of this assessment";
  } else if (input.confidence >= 0.7) {
    confidenceWording = "moderate model confidence suggests the assessment is reliable, with some uncertainty";
  } else {
    confidenceWording = "limited model confidence means the assessment should be treated with caution";
  }

  const riskExplanations: Record<string, string> = {
    critical:
      "A critical risk level reflects a very high deepfake score. The content should be treated as unverified and not shared or acted upon without confirmation from the original source.",
    high: "A high risk level reflects a strongly elevated deepfake score. The content should be considered unverified: confirm authenticity with a trusted source before sharing or relying on it.",
    medium:
      "A medium risk level reflects a moderately elevated deepfake score. The classification carries real uncertainty, so cross-check the source and the consistency of the content before drawing conclusions.",
    low: "A low risk level reflects an assessment consistent with authentic content. Remain vigilant, as sophisticated deepfakes can evade current detection methods.",
  };

  const isDf = input.verdict === "deepfake";

  return {
    interpretation: `The detection model returned a deepfake score of ${score}% with ${confidence}% confidence, classifying the content as ${verdict}. The assessment is based on ${frameText}, with a ${risk} risk level assigned to the result.`,
    keyFindings: [
      `Deepfake score of ${score}% ${scoreWording}.`,
      `Model confidence of ${confidence}%: ${confidenceWording}.`,
      `Analysis covered ${frameText}, and the assigned risk level is ${risk}.`,
    ],
    riskExplanation:
      riskExplanations[input.riskLevel ?? ""] ??
      riskExplanations.medium,
    recommendations: defaultRecommendations(isDf, input.riskLevel),
    executiveSummary: `VeriSight classified the content as ${verdict} with a ${score}% deepfake score, ${confidence}% confidence and a ${risk} risk level. The assessment is based solely on the detection model's results.`,
  };
}
