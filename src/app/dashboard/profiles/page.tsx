import { ProfilesPanel } from "@/components/profiles-panel";
import { getLocale } from "@/i18n/get-locale";
import { APP_STRINGS } from "@/i18n/app-strings";

export const metadata = {
  title: "Profils",
};

export default async function ProfilesPage() {
  const t = APP_STRINGS[await getLocale()];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t.screens.intros.profiles}</p>
      <ProfilesPanel />
    </div>
  );
}
