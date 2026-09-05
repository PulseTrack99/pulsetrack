import { Suspense } from "react";
import { HeatmapPanel } from "@/components/heatmap-panel";

export const metadata = {
  title: "Heatmaps",
};

export default function HeatmapsPage() {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        Où vos visiteurs cliquent, jusqu&apos;où ils scrollent, et ce sur quoi
        ils s&apos;acharnent sans résultat.
      </p>

      {/* useSearchParams (for the ?site=&path= cross-link from a replay)
          requires a Suspense boundary around whatever reads it. */}
      <Suspense fallback={null}>
        <HeatmapPanel />
      </Suspense>
    </div>
  );
}
