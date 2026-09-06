import { EventsPanel } from "@/components/events-panel";
import { getLocale } from "@/i18n/get-locale";
import { APP_STRINGS } from "@/i18n/app-strings";

export const metadata = {
  title: "Événements",
};

export default async function EventsPage() {
  const t = APP_STRINGS[await getLocale()];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t.screens.intros.events}</p>
      <EventsPanel />
    </div>
  );
}
