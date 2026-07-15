import type { Metadata } from "next";
import ThreeSceneWrapper from "@/components/ThreeSceneWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriSight \u2014 AI-Powered Deepfake Detection",
  description:
    "Upload videos or analyze YouTube content with machine learning to detect deepfakes and synthetic media.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <div className="fixed inset-0 z-0">
          <ThreeSceneWrapper />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

function Navbar() {
  return (
    <header className="glass sticky top-0 z-50 border-b border-verisight-500/10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-verisight-500 to-purple-500 text-xs font-bold text-white">
            V
          </span>
          <span className="text-gradient">VeriSight</span>
        </a>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
          <a href="/" className="transition-colors hover:text-verisight-400">
            Home
          </a>
          <a href="/upload" className="transition-colors hover:text-verisight-400">
            Upload
          </a>
          <a
            href="https://github.com/Alexis-Erskine/VeriSight"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-verisight-400"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="glass mt-auto border-t border-verisight-500/10 py-6 text-center text-xs text-gray-500">
      <div className="mx-auto max-w-7xl px-6">
        <p>
          VeriSight \u2014 AI-Powered Deepfake Detection &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
