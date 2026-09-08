import { GroupsPanel } from "@/components/groups-panel";
import { getLocale } from "@/i18n/get-locale";
import { APP_STRINGS } from "@/i18n/app-strings";

export const metadata = {
  title: "Comptes",
};

export default async function GroupsPage() {
  const t = APP_STRINGS[await getLocale()];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t.screens.intros.groups}</p>
      <GroupsPanel />
    </div>
  );
}
