"use client";

interface VerdictGaugeProps {
  prediction: number | null;
  confidence: number | null;
  riskLevel: string | null;
}

export default function VerdictGauge({ prediction, confidence, riskLevel }: VerdictGaugeProps) {
  if (prediction == null) {
    return (
      <div className="glass glow-border rounded-2xl p-6 text-center">
        <p className="text-gray-400">Analysis pending</p>
      </div>
    );
  }

  const score = prediction * 100;
  const conf = confidence != null ? confidence * 100 : 0;
  const isDeepfake = score >= 50;
  const verdictText = isDeepfake ? "Deepfake Detected" : "Authentic";
  const verdictColor = isDeepfake ? "#ef4444" : "#10b981";
  const riskColor: Record<string, string> = {
    critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#10b981",
  };

  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass glow-border rounded-2xl p-8 text-center">
      <div className="relative mx-auto mb-6 h-40 w-40 sm:h-48 sm:w-48">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="12" />
          <circle
            cx="100" cy="100" r="80" fill="none"
            stroke={verdictColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: verdictColor }}>
            {score.toFixed(0)}%
          </span>
          <span className="mt-1 text-xs font-medium text-gray-400">
            deepfake score
          </span>
        </div>
      </div>

      <h2
        className="mb-2 text-xl font-bold tracking-tight sm:text-2xl"
        style={{ color: verdictColor }}
      >
        {verdictText}
      </h2>

      {riskLevel && (
        <p
          className="mb-6 text-sm font-semibold uppercase tracking-wider"
          style={{ color: riskColor[riskLevel] ?? "#666" }}
        >
          {riskLevel} risk
        </p>
      )}

      <div className="mx-auto grid max-w-xs grid-cols-2 gap-4 text-center">
        <div className="rounded-xl bg-surface/50 p-3">
          <p className="text-lg font-bold text-white">{conf.toFixed(0)}%</p>
          <p className="text-xs text-gray-400">Confidence</p>
        </div>
        <div className="rounded-xl bg-surface/50 p-3">
          <p className="text-lg font-bold text-white">
            {isDeepfake ? "Yes" : "No"}
          </p>
          <p className="text-xs text-gray-400">Deepfake</p>
        </div>
      </div>
    </div>
  );
}
