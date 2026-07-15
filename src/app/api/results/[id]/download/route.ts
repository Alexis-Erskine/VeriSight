import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReportPdf } from "@/lib/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await prisma.analysisResult.findUnique({
      where: { id },
      include: { video: true },
    });

    if (!result || result.status !== "completed" || result.prediction == null) {
      return NextResponse.json({ error: "Result not available" }, { status: 404 });
    }

    const filename = result.video.originalFilename || result.video.youtubeUrl || result.filename;

    const data = {
      id: result.id,
      videoId: result.videoId,
      filename,
      prediction: result.prediction,
      predictionLabel: (result.prediction >= 0.5 ? "deepfake" : "authentic") as "deepfake" | "authentic",
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      framesAnalyzed: result.framesAnalyzed,
      totalFrames: result.totalFrames,
      processingTimeMs: result.processingTimeMs,
      status: result.status as "completed",
      errorMessage: result.errorMessage,
      dateUploaded: result.createdAt.toISOString(),
      completedAt: result.completedAt?.toISOString() ?? null,
    };

    const pdfBuffer = generateReportPdf(data);
    const pdfData = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="verisight-report-${result.id}.pdf"`,
        "Content-Length": pdfData.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
