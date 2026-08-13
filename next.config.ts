import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "onnxruntime-node", "sharp"],
};

export default nextConfig;
