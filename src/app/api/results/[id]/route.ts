import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await prisma.analysisResult.findUnique({
      where: { id },
      include: { video: { select: { originalFilename: true, youtubeUrl: true, source: true } } },
    });

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: result.id,
      videoId: result.videoId,
      filename: result.video.originalFilename || result.video.youtubeUrl || result.filename,
      prediction: result.prediction,
      predictionLabel: result.prediction != null ? (result.prediction >= 0.5 ? "deepfake" : "authentic") : null,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      framesAnalyzed: result.framesAnalyzed,
      totalFrames: result.totalFrames,
      processingTimeMs: result.processingTimeMs,
      status: result.status,
      errorMessage: result.errorMessage,
      dateUploaded: result.createdAt.toISOString(),
      completedAt: result.completedAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch result" }, { status: 500 });
  }
}
