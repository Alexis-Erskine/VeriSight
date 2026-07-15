import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeVideo } from "@/lib/replicate";

export async function POST(request: NextRequest) {
  try {
    const { url, filename, size, contentType } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "Missing video URL" }, { status: 400 });
    }

    const video = await prisma.uploadedVideo.create({
      data: {
        filename: filename ?? "video.mp4",
        originalFilename: filename ?? "video.mp4",
        fileSize: size ?? 0,
        filePath: url,
        storageKey: url,
        mimeType: contentType ?? "video/mp4",
        source: "file",
      },
    });

    const result = await prisma.analysisResult.create({
      data: {
        videoId: video.id,
        filename: video.filename,
        status: "pending",
      },
    });

    const output = await analyzeVideo(url);

    const prediction = output.prediction;
    const isDeepfake = prediction >= 0.5;

    await prisma.analysisResult.update({
      where: { id: result.id },
      data: {
        prediction,
        confidence: output.confidence,
        riskLevel: isDeepfake
          ? prediction >= 0.9 ? "critical" : prediction >= 0.75 ? "high" : "medium"
          : "low",
        framesAnalyzed: output.frames_analyzed,
        totalFrames: output.total_frames,
        processingTimeMs: output.processing_time_ms,
        status: "completed",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: result.id,
      status: "completed",
      prediction,
      confidence: output.confidence,
      riskLevel: isDeepfake
        ? prediction >= 0.9 ? "critical" : prediction >= 0.75 ? "high" : "medium"
        : "low",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
