"use client";

import dynamic from "next/dynamic";

const ThreeScene = dynamic(() => import("@/components/ThreeScene"), {
  ssr: false,
});

export default function ThreeSceneWrapper() {
  return <ThreeScene />;
}
