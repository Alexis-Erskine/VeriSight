export interface AnalysisResultData {
  id: string;
  videoId: string;
  filename: string;
  prediction: number | null;
  predictionLabel: "deepfake" | "authentic" | null;
  confidence: number | null;
  riskLevel: string | null;
  framesAnalyzed: number | null;
  totalFrames: number | null;
  processingTimeMs: number | null;
  status: "pending" | "completed" | "failed";
  errorMessage: string | null;
  dateUploaded: string;
  completedAt: string | null;
}

export interface UploadResponse {
  id: string;
  status: string;
}

export interface ErrorResponse {
  error: string;
}
