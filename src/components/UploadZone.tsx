"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadZone() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!url.trim()) { setError("Enter a video URL"); return; }
    setError(null);
    setAnalyzing(true);

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
      setAnalyzing(false);
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
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="https://youtube.com/watch?v=... or any video URL"
          className="w-full rounded-xl border border-verisight-500/20 bg-surface/50 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-verisight-500/50 focus:ring-2 focus:ring-verisight-500/20"
        />
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={analyzing}
        className="glass glow-border mx-auto mt-6 block w-full max-w-xs rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-verisight-600/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {analyzing ? (
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
            Analyze
          </span>
        )}
      </button>
    </div>
  );
}
