import type { Metadata } from "next";
import ThreeSceneWrapper from "@/components/ThreeSceneWrapper";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriSight — AI-Powered Deepfake Detection",
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
