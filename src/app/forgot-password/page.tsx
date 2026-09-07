import { ForgotPasswordForm } from "@/components/auth-forms";
import { getLocale } from "@/i18n/get-locale";
import { dictionaries } from "@/i18n/dictionaries";

// The tab said "PulseTrack — L'analytics qui suit l'argent" on every
// one of these, inherited from the root: the marketing tagline on the
// sign-in screen. Reuses the heading rather than inventing a second
// wording for the same page.
export async function generateMetadata() {
  const t = dictionaries[await getLocale()].auth;
  return { title: t.forgot.title };
}

export default async function Page() {
  const t = dictionaries[await getLocale()].auth;
  return <ForgotPasswordForm t={t} />;
}
