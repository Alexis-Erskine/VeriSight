import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeVideo } from "@/lib/replicate";

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:v=|\/)([\w-]{11})/);
  return m ? m[1] : url.slice(-11);
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "YouTube URL required" }, { status: 400 });
    }

    const videoId = extractYouTubeId(url);
    const filename = `youtube_${videoId}.mp4`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const video = await prisma.uploadedVideo.create({
      data: {
        filename,
        originalFilename: filename,
        fileSize: 0,
        filePath: url,
        storageKey: thumbnailUrl,
        mimeType: "video/mp4",
        source: "youtube",
        youtubeUrl: url,
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
      const output = await analyzeVideo(thumbnailUrl);

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
    const msg = e instanceof Error ? e.message : "YouTube analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
