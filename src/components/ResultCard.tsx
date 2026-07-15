"use client";

import Link from "next/link";
import type { AnalysisResultData } from "@/types";

export default function ResultCard({ result }: { result: AnalysisResultData }) {
  const isDf = result.predictionLabel === "deepfake";
  const score = result.prediction != null ? (result.prediction * 100).toFixed(0) : "?";
  const borderColor = isDf ? "border-red-500/30" : "border-emerald-500/30";
  const badgeColor = isDf
    ? "bg-red-500/10 text-red-400"
    : "bg-emerald-500/10 text-emerald-400";

  return (
    <Link href={`/results/${result.id}`}>
      <div className={`glass glow-border rounded-xl border ${borderColor} p-5 transition-all hover:scale-[1.02] hover:bg-surface-light/80`}>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">
              {result.filename}
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              {result.dateUploaded
                ? new Date(result.dateUploaded).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Unknown date"}
            </p>
          </div>
          <div className="ml-4 flex flex-col items-end gap-1">
            <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${badgeColor}`}>
              {isDf ? "Deepfake" : "Authentic"}
            </span>
            <span className="text-lg font-bold text-white">{score}%</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span>Confidence: {result.confidence != null ? `${(result.confidence * 100).toFixed(0)}%` : "N/A"}</span>
          <span>Risk: {(result.riskLevel ?? "unknown").toUpperCase()}</span>
          <span>{result.framesAnalyzed ?? 0} frames</span>
        </div>
      </div>
    </Link>
  );
}
