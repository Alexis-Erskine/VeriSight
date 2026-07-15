import { NextRequest, NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const blob = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
      maximumSizeInBytes: 50 * 1024 * 1024,
    }),
    onUploadCompleted: async () => {},
  });
  return NextResponse.json(blob);
}
