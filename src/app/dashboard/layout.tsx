import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { SiteProvider } from "@/components/site-context";
import { getUserPlan } from "@/lib/plan";
import { PLANS } from "@/lib/stripe";
import { LocaleProvider } from "@/components/locale-context";
import { getLocale } from "@/i18n/get-locale";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [locale, plan, { data: sites }] = await Promise.all([
    getLocale(),
    getUserPlan(supabase, user.id),
    // Fetched once here rather than separately on every page — the
    // selector lives in the rail now (src/components/site-context.tsx).
    supabase
      .from("sites")
      .select("id, name, domain, public_share_id, created_at")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <LocaleProvider locale={locale}>
      <SiteProvider sites={sites ?? []}>
        <DashboardShell user={user} planName={PLANS[plan].name}>
          {children}
        </DashboardShell>
      </SiteProvider>
    </LocaleProvider>
  );
}
