"use client";

import dynamic from "next/dynamic";

const Globe = dynamic(() => import("@/components/globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-16 w-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  ),
});

export function GlobeLoader({ className }: { className?: string }) {
  return <Globe className={className} />;
}
