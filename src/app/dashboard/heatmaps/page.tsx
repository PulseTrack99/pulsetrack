import { Suspense } from "react";
import { HeatmapPanel } from "@/components/heatmap-panel";
// The intro line is server-rendered, so it reads the dictionary
// directly rather than through the client hook.
import { getLocale } from "@/i18n/get-locale";
import { APP_STRINGS } from "@/i18n/app-strings";

export const metadata = {
  title: "Heatmaps",
};

export default async function HeatmapsPage() {
  const t = APP_STRINGS[await getLocale()];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t.screens.intros.heatmaps}</p>

      {/* useSearchParams (for the ?site=&path= cross-link from a replay)
          requires a Suspense boundary around whatever reads it. */}
      <Suspense fallback={null}>
        <HeatmapPanel />
      </Suspense>
    </div>
  );
}
