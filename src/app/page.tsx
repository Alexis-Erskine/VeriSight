import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-verisight-500/20 bg-verisight-500/10 px-4 py-1.5 text-xs font-medium text-verisight-300">
          <span className="flex h-2 w-2 rounded-full bg-verisight-400 animate-pulse" />
          AI-Powered Detection
        </div>

        <h1 className="text-gradient mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          See Through
          <br />
          Synthetic Media
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-gray-400 sm:text-lg">
          VeriSight uses machine learning to detect deepfakes and AI-generated
          video content. Upload a file or paste a YouTube link for instant
          forensic analysis.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/upload"
            className="glass glow-border inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-verisight-600/80"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Analyze a Link
          </Link>
          <Link
            href="/results"
            className="inline-flex items-center gap-2 rounded-xl border border-verisight-500/20 px-8 py-3.5 text-sm font-medium text-gray-300 transition-all hover:border-verisight-500/40 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            View History
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:mt-20 sm:grid-cols-3">
          {[
            {
              title: "Deep Learning",
              desc: "Xception CNN architecture fine-tuned for frame-level deepfake detection with high accuracy.",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              ),
            },
            {
              title: "URL Analysis",
              desc: "Paste any video URL — YouTube, Vimeo, or direct .mp4 — for instant deepfake analysis.",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m7.288-4.075a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757" />
              ),
            },
            {
              title: "PDF Reports",
              desc: "Download comprehensive forensic reports with verdict, confidence scores, and recommendations.",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              ),
            },
          ].map((feature) => (
            <div key={feature.title} className="glass glow-border rounded-2xl p-6 text-left">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-verisight-500/20">
                <svg className="h-5 w-5 text-verisight-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {feature.icon}
                </svg>
              </div>
              <h3 className="mb-2 text-sm font-semibold text-white">{feature.title}</h3>
              <p className="text-xs leading-relaxed text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
