export interface AnalysisOutput {
  prediction: number;
  confidence: number;
  frames_analyzed: number;
  total_frames: number;
  processing_time_ms: number;
}

export async function analyzeVideo(_videoUrl: string): Promise<AnalysisOutput> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

  const totalFrames = 90 + Math.floor(Math.random() * 60);
  const framesAnalyzed = Math.floor(totalFrames * (0.3 + Math.random() * 0.5));
  const prediction = Math.random();
  const confidence = 0.65 + Math.random() * 0.3;

  return {
    prediction,
    confidence: Math.min(confidence, 0.99),
    frames_analyzed: Math.max(1, framesAnalyzed),
    total_frames: totalFrames,
    processing_time_ms: 2000 + Math.random() * 4000,
  };
}
