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

    const pdfBuffer = await generateReportPdf({
      id: result.id,
      prediction: result.prediction,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      framesAnalyzed: result.framesAnalyzed,
      totalFrames: result.totalFrames,
      processingTimeMs: result.processingTimeMs,
      createdAt: result.createdAt,
      analysisText: result.analysisText,
    });

    const body = new Uint8Array(pdfBuffer);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="verisight-report-${result.id}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to generate report";
    console.error("PDF generation error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}