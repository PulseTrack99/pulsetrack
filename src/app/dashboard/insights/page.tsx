import { InsightsPanel } from "@/components/insights-panel";
import { getLocale } from "@/i18n/get-locale";
import { APP_STRINGS } from "@/i18n/app-strings";

export const metadata = {
  title: "Insights",
};

export default async function InsightsPage() {
  const t = APP_STRINGS[await getLocale()];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t.screens.intros.insights}</p>
      <InsightsPanel />
    </div>
  );
}
