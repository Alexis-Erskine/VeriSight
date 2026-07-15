import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { analyzeVideo } from "@/lib/replicate";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function downloadYouTube(url: string): Promise<{ buffer: Buffer; filename: string }> {
  const ytdl = await import("@distube/ytdl-core");
  const info = await ytdl.default.getInfo(url);
  const format = ytdl.default.chooseFormat(info.formats, {
    quality: "lowest",
    filter: "videoandaudio",
  });
  if (!format) throw new Error("No suitable format found");

  const stream = ytdl.default(url, { format });
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
  return { buffer, filename: `${title}.mp4` };
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "YouTube URL required" }, { status: 400 });
    }

    const { buffer, filename } = await downloadYouTube(url);

    let storageKey: string;
    let filePath: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`youtube/${Date.now()}_${filename}`, buffer, {
        access: "public",
      });
      storageKey = blob.url;
      filePath = blob.url;
    } else {
      const uploadDir = join(process.cwd(), "uploads");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const localPath = join(uploadDir, `${Date.now()}_${filename}`);
      await writeFile(localPath, buffer);
      storageKey = localPath;
      filePath = localPath;
    }

    const video = await prisma.uploadedVideo.create({
      data: {
        filename,
        originalFilename: filename,
        fileSize: buffer.length,
        filePath,
        storageKey,
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
      const output = await analyzeVideo(storageKey);

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
