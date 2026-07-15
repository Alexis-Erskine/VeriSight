import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-gradient mb-4 text-6xl font-bold">404</h1>
        <p className="mb-8 text-gray-400">This page does not exist.</p>
        <Link
          href="/"
          className="glass inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-all hover:bg-verisight-600/80"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
