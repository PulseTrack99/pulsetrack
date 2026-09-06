import { Suspense } from "react";
import { SessionReplayPanel } from "@/components/session-replay-panel";
// The intro line is server-rendered, so it reads the dictionary
// directly rather than through the client hook.
import { getLocale } from "@/i18n/get-locale";
import { APP_STRINGS } from "@/i18n/app-strings";

export const metadata = {
  title: "Session Replay",
};

export default async function ReplaysPage() {
  const t = APP_STRINGS[await getLocale()];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t.screens.intros.replays}</p>

      {/* useSearchParams (for the ?site=&path= cross-link from the
          heatmap view) requires a Suspense boundary around whatever
          reads it. */}
      <Suspense fallback={null}>
        <SessionReplayPanel />
      </Suspense>
    </div>
  );
}
