"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const FRAME_FRACTIONS = [0.1, 0.35, 0.6, 0.85];
const MAX_DIM = 480;
const MAX_FILE_BYTES = 500 * 1024 * 1024;

async function sampleFrames(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read the video file"));
    });
    if (!video.duration || !isFinite(video.duration)) {
      throw new Error("Video has no readable duration");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const frames: string[] = [];
    for (const fraction of FRAME_FRACTIONS) {
      const t = Math.min(fraction * video.duration, video.duration - 0.05);
      video.currentTime = Math.max(t, 0);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        setTimeout(resolve, 3000);
      });
      const scale = Math.min(1, MAX_DIM / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.5));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function UploadZone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Analyzing...");
  const [error, setError] = useState<string | null>(null);

  const submitUrl = async () => {
    if (!url.trim()) { setError("Enter a video URL"); return; }
    setError(null);
    setBusy(true);
    setBusyLabel("Analyzing link...");
    try {
      const res = await fetch("/api/analyze-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(`/results/${data.id}`);
    } catch {
      setError("Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("video/")) {
      setError("Please select a video file (mp4, webm, mov, ...)");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File is larger than 500 MB");
      return;
    }
    setFileName(file.name);
    setBusy(true);
    setBusyLabel("Sampling frames and analyzing...");
    try {
      const frames = await sampleFrames(file);
      const res = await fetch("/api/analyze-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, frames }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(`/results/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="glass glow-border rounded-2xl p-6 sm:p-8">
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Paste URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && submitUrl()}
          placeholder="https://youtube.com/watch?v=... or any video URL"
          className="w-full rounded-xl border border-verisight-500/20 bg-surface/50 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-verisight-500/50 focus:ring-2 focus:ring-verisight-500/20"
        />
        <button
          onClick={submitUrl}
          disabled={busy}
          className="glass glow-border mt-4 block w-full rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-verisight-600/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analyze Link
        </button>
      </div>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-verisight-500/20" />
        <span className="text-xs font-medium text-gray-500">OR</span>
        <div className="h-px flex-1 bg-verisight-500/20" />
      </div>

      <div className="glass glow-border rounded-2xl p-6 sm:p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          onClick={() => !busy && fileInputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-verisight-500/30 bg-surface/30 px-6 py-10 text-center transition-all hover:border-verisight-500/60 hover:bg-surface/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-8 w-8 text-verisight-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm font-medium text-white">
            {fileName ? fileName : "Upload a video file"}
          </span>
          <span className="text-xs text-gray-500">
            Frames are sampled in your browser and analyzed for deepfake artifacts
          </span>
        </button>
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-400">{error}</p>
      )}

      {busy && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <svg className="h-8 w-8 animate-spin text-verisight-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400">{busyLabel}</p>
        </div>
      )}
    </div>
  );
}