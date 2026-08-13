import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VerdictGauge from "@/components/VerdictGauge";
import AutoRefresh from "@/components/AutoRefresh";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await prisma.analysisResult.findUnique({
    where: { id },
    include: { video: true },
  });

  if (!result) notFound();

  const prediction = result.prediction;
  const isDf = prediction != null && prediction >= 0.5;
  const score = prediction != null ? (prediction * 100).toFixed(1) : "N/A";
  const conf = result.confidence != null ? (result.confidence * 100).toFixed(0) : "N/A";
  const filename = result.video.originalFilename || result.video.youtubeUrl || result.filename;
  const isProcessing = result.status === "pending";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <Link
        href="/results"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to History
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-gradient text-2xl font-bold tracking-tight sm:text-3xl">
            Analysis Result
          </h1>
          <p className="mt-1 break-all text-sm text-gray-400">{filename}</p>
          <p className="text-xs text-gray-500">
            {new Date(result.createdAt).toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        </div>
        {result.status === "completed" && prediction != null && (
          <a
            href={`/api/results/${id}/download`}
            className="glass inline-flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-verisight-600/80"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF Report
          </a>
        )}
      </div>

      {isProcessing ? (
        <div className="glass glow-border rounded-2xl p-6 text-center sm:p-12">
          <svg className="mx-auto mb-4 h-12 w-12 animate-spin text-verisight-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h2 className="mb-2 text-xl font-semibold text-white">Analysis in Progress</h2>
          <p className="text-sm text-gray-400">Results will appear automatically once complete.</p>
          <AutoRefresh />
        </div>
      ) : result.status === "failed" ? (
        <div className="glass glow-border rounded-2xl border border-red-500/30 p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-400">Analysis Failed</h2>
          <p className="text-sm text-gray-400">
            {result.errorMessage || "An unknown error occurred during analysis."}
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <VerdictGauge
            prediction={prediction}
            confidence={result.confidence}
            riskLevel={result.riskLevel}
          />

          <div className="glass glow-border rounded-2xl p-6">
            <h3 className="mb-4 text-sm font-semibold text-white">Details</h3>
            <dl className="space-y-3 text-sm">
              {[
                ["Deepfake Score", `${score}%`],
                ["Confidence", `${conf}%`],
                ["Risk Level", (result.riskLevel ?? "unknown").toUpperCase()],
                ["Verdict", isDf ? "Deepfake Detected" : "Likely Authentic"],
                ["Frames Analyzed", `${result.framesAnalyzed ?? 0} / ${result.totalFrames ?? 0}`],
                ["Method", result.method === "xception" ? "Xception CNN + metadata" : result.method === "vision" ? "Frame/thumbnail + metadata" : "Metadata only"],
                ["Processing Time", result.processingTimeMs ? `${(result.processingTimeMs / 1000).toFixed(1)}s` : "N/A"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-400">{label}</dt>
                  <dd className="font-medium text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {result.analysisText && (
            <div className="lg:col-span-2">
              <div className="glass glow-border rounded-2xl p-6">
                <h3 className="mb-2 text-sm font-semibold text-white">AI Analysis</h3>
                <p className="text-sm leading-relaxed text-gray-300">{result.analysisText}</p>
              </div>
            </div>
          )}
          {result.method !== "vision" && result.status === "completed" && (
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                Preliminary metadata-based assessment — no video content was examined. This result is a
                provisional guess from the video&apos;s metadata and should not be treated as a definitive
                deepfake verdict.
              </div>
            </div>
          )}
          <div className="lg:col-span-2">
            <div className="glass glow-border rounded-2xl p-6">
              <h3 className="mb-4 text-sm font-semibold text-white">Recommendations</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                {isDf ? (
                  <>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-red-400">&bull;</span>
                      Do not share this content. Deepfakes can spread misinformation.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-red-400">&bull;</span>
                      Look for visual artifacts, unnatural blinking, and audio desynchronization.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-red-400">&bull;</span>
                      Verify the source and cross-reference with trusted media.
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-emerald-400">&bull;</span>
                      Content appears authentic with no significant deepfake indicators.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-emerald-400">&bull;</span>
                      Cross-verify the source for contextual consistency.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-emerald-400">&bull;</span>
                      Stay vigilant as deepfake technology evolves rapidly.
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
