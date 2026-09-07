import { RetentionPanel } from "@/components/retention-panel";
import { getLocale } from "@/i18n/get-locale";
import { APP_STRINGS } from "@/i18n/app-strings";

export const metadata = {
  title: "Rétention",
};

export default async function RetentionPage() {
  const t = APP_STRINGS[await getLocale()];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t.screens.intros.retention}</p>
      <RetentionPanel />
    </div>
  );
}
