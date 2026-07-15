"use client";

import { useState, useCallback, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export default function UploadZone() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"file" | "youtube">("file");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) {
      setFile(f);
      setError(null);
    } else {
      setError("Please drop a video file");
    }
  }, []);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    setError(null);

    if (mode === "file") {
      if (!file) { setError("Select a video file"); return; }
      setUploading(true);
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
        });

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: blob.url,
            filename: file.name,
            size: file.size,
            contentType: file.type,
          }),
        });

        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        router.push(`/results/${data.id}`);
      } catch {
        setError("Upload failed");
      } finally {
        setUploading(false);
      }
    } else {
      if (!youtubeUrl.trim()) { setError("Enter a YouTube URL"); return; }
      setUploading(true);
      try {
        const res = await fetch("/api/analyze-youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        router.push(`/results/${data.id}`);
      } catch {
        setError("Analysis failed");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex rounded-xl bg-surface/50 p-1">
        <button
          onClick={() => { setMode("file"); setError(null); }}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            mode === "file"
              ? "bg-verisight-600 text-white shadow-lg shadow-verisight-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Upload Video
        </button>
        <button
          onClick={() => { setMode("youtube"); setError(null); }}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            mode === "youtube"
              ? "bg-verisight-600 text-white shadow-lg shadow-verisight-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          YouTube URL
        </button>
      </div>

      {mode === "file" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`glass glow-border flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            dragOver
              ? "border-verisight-400 bg-verisight-500/10"
              : "border-verisight-500/20 hover:border-verisight-500/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-verisight-500/20">
            <svg className="h-8 w-8 text-verisight-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          {file ? (
            <div>
              <p className="text-lg font-medium text-white">{file.name}</p>
              <p className="mt-1 text-sm text-gray-400">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-white">
                Drop video here or click to browse
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Supports MP4, WebM, MOV, AVI
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass glow-border rounded-2xl p-6">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            YouTube Video URL
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full rounded-xl border border-verisight-500/20 bg-surface/50 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-verisight-500/50 focus:ring-2 focus:ring-verisight-500/20"
          />
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="glass glow-border mx-auto mt-6 block w-full max-w-xs rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-verisight-600/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {mode === "file" ? "Analyze Video" : "Analyze YouTube"}
          </span>
        )}
      </button>
    </div>
  );
}
