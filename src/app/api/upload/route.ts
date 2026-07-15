import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { analyzeVideo } from "@/lib/replicate";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("video") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let storageKey: string;
    let filePath: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`videos/${Date.now()}_${file.name}`, file, {
        access: "public",
      });
      storageKey = blob.url;
      filePath = blob.url;
    } else {
      const uploadDir = join(process.cwd(), "uploads");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const localPath = join(uploadDir, `${Date.now()}_${file.name}`);
      await writeFile(localPath, buffer);
      storageKey = localPath;
      filePath = localPath;
    }

    const video = await prisma.uploadedVideo.create({
      data: {
        filename: file.name,
        originalFilename: file.name,
        fileSize: buffer.length,
        filePath,
        storageKey,
        mimeType: file.type,
        source: "file",
      },
    });

    const result = await prisma.analysisResult.create({
      data: {
        videoId: video.id,
        filename: file.name,
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
          prediction: prediction,
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
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
