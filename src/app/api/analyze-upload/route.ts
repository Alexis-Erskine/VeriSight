import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeVideo } from "@/lib/replicate";

export const maxDuration = 60;

const MAX_FRAMES = 6;
const MAX_FRAME_BYTES = 600 * 1024;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filename = typeof body.filename === "string" ? body.filename.trim() : "";
    const frames: unknown = body.frames;

    if (!filename || filename.length > 255) {
      return NextResponse.json({ error: "Valid filename is required" }, { status: 400 });
    }
    if (
      !Array.isArray(frames) ||
      frames.length === 0 ||
      frames.length > MAX_FRAMES ||
      !frames.every(
        (f) =>
          typeof f === "string" &&
          f.startsWith("data:image/") &&
          f.length < MAX_FRAME_BYTES * 1.4
      )
    ) {
      return NextResponse.json(
        { error: `Provide 1-${MAX_FRAMES} valid base64 image frames` },
        { status: 400 }
      );
    }

    const video = await prisma.uploadedVideo.create({
      data: {
        filename,
        originalFilename: filename,
        fileSize: 0,
        filePath: "(client upload)",
        storageKey: "(frames)",
        mimeType: "video/mp4",
        source: "upload",
      },
    });

    const result = await prisma.analysisResult.create({
      data: {
        videoId: video.id,
        filename,
        status: "pending",
      },
    });

    try {
      const output = await analyzeVideo("", filename, "upload", frames as string[]);

      const prediction = output.prediction;
      const isDeepfake = prediction >= 0.5;
      const riskLevel = isDeepfake
        ? prediction >= 0.9 ? "critical" : prediction >= 0.75 ? "high" : "medium"
        : "low";

      await prisma.analysisResult.update({
        where: { id: result.id },
        data: {
          prediction,
          confidence: output.confidence,
          riskLevel,
          framesAnalyzed: output.frames_analyzed,
          totalFrames: output.total_frames,
          processingTimeMs: output.processing_time_ms,
          analysisText: output.analysis_text,
          method: output.method ?? "metadata",
          mediaExamined: output.mediaExamined ?? false,
          status: "completed",
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        id: result.id,
        status: "completed",
        prediction,
        confidence: output.confidence,
        riskLevel,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      await prisma.analysisResult.update({
        where: { id: result.id },
        data: { status: "failed", errorMessage: msg },
      });
      return NextResponse.json({
        id: result.id,
        status: "failed",
        error: msg,
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}