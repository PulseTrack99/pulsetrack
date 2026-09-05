import { Suspense } from "react";
import { SessionReplayPanel } from "@/components/session-replay-panel";

export const metadata = {
  title: "Session Replay",
};

export default function ReplaysPage() {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        Regardez vos visiteurs naviguer réellement sur votre site — chaque clic,
        chaque scroll, chaque hésitation.
      </p>

      {/* useSearchParams (for the ?site=&path= cross-link from the
          heatmap view) requires a Suspense boundary around whatever
          reads it. */}
      <Suspense fallback={null}>
        <SessionReplayPanel />
      </Suspense>
    </div>
  );
}
