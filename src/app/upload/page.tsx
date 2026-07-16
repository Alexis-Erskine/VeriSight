import UploadZone from "@/components/UploadZone";

export default function UploadPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-gradient mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Analyze Content
        </h1>
        <p className="mb-10 text-gray-400">
          Paste a video URL to begin deepfake analysis.
        </p>
        <UploadZone />
      </div>
    </div>
  );
}
