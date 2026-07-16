import { analyzeVideo as openrouterAnalyze } from "./openrouter";

export type { AnalysisOutput } from "./openrouter";

export async function analyzeVideo(
  videoUrl: string,
  filename?: string,
  source?: string
) {
  return openrouterAnalyze(videoUrl, filename, source);
}
