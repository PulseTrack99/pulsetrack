import { FlowPanel } from "@/components/flow-panel";
// The intro line is server-rendered, so it reads the dictionary
// directly rather than through the client hook.
import { getLocale } from "@/i18n/get-locale";
import { APP_STRINGS } from "@/i18n/app-strings";

export const metadata = {
  title: "Flows",
};

export default async function FlowsPage() {
  const t = APP_STRINGS[await getLocale()];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t.screens.intros.flows}</p>
      <FlowPanel />
    </div>
  );
}
