import UploadZone from "@/components/UploadZone";

export default function UploadPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-gradient mb-3 text-4xl font-bold tracking-tight">
          Analyze Media
        </h1>
        <p className="mb-10 text-gray-400">
          Upload a video file or paste a YouTube URL to begin deepfake analysis.
        </p>
        <UploadZone />
      </div>
    </div>
  );
}
