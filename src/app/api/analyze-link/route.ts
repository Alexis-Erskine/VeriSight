import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeVideo } from "@/lib/replicate";

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let filename: string;
    let storageKey: string;
    let source: string;

    if (isYouTubeUrl(url)) {
      const videoId = extractYouTubeId(url) ?? url.slice(-11);
      filename = `youtube_${videoId}.mp4`;
      storageKey = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      source = "youtube";
    } else {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      filename = `${hostname}_${Date.now()}`;
      storageKey = url;
      source = "link";
    }

    const video = await prisma.uploadedVideo.create({
      data: {
        filename,
        originalFilename: filename,
        fileSize: 0,
        filePath: url,
        storageKey,
        mimeType: "video/mp4",
        source,
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
      const output = await analyzeVideo(url, filename, source);

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
          analysisText: output.analysis_text,
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
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
