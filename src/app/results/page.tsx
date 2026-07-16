import { prisma } from "@/lib/prisma";
import ResultCard from "@/components/ResultCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analysis History | VeriSight" };

export default async function ResultsPage() {
  const results = await prisma.analysisResult.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { video: { select: { originalFilename: true, youtubeUrl: true, source: true } } },
  });

  const mapped = results.map((r) => ({
    id: r.id,
    videoId: r.videoId,
    filename: r.video.originalFilename || r.video.youtubeUrl || r.filename,
    prediction: r.prediction,
    predictionLabel: r.prediction != null ? (r.prediction >= 0.5 ? "deepfake" as const : "authentic" as const) : null,
    confidence: r.confidence,
    riskLevel: r.riskLevel,
    framesAnalyzed: r.framesAnalyzed,
    totalFrames: r.totalFrames,
    processingTimeMs: r.processingTimeMs,
    status: r.status as "pending" | "completed" | "failed",
    errorMessage: r.errorMessage,
    dateUploaded: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-gradient mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Analysis History
      </h1>
      <p className="mb-10 text-sm text-gray-400">
        Recent deepfake detection results
      </p>

      {mapped.length === 0 ? (
        <div className="glass glow-border rounded-2xl p-6 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-verisight-500/20">
            <svg className="h-8 w-8 text-verisight-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-white">No analyses yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Upload a video to see results here
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {mapped.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
