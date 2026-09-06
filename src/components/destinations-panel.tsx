"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Sparkles,
  KeyRound,
  Share2,
  Webhook,
  Bell,
  Download,
  Lock,
  ArrowRight,
} from "lucide-react";
import { useT } from "@/components/locale-context";
import { relativeTime } from "@/lib/relative-time";

/**
 * Destinations — the outbound side, in one place.
 *
 * Not a second settings screen. Every channel below is configured where
 * it always was, and this links there; duplicating the controls would
 * give the account two places to change one thing, which is worse than
 * having to click through. What is genuinely new is the state: whether
 * each channel is on, and when something last read the data through it.
 *
 * That last part existed only in the database. api_keys and oauth_tokens
 * have recorded last_used_at since they were built and no screen ever
 * showed it, so "an AI client read my analytics this afternoon" was
 * knowable and never known.
 */

interface Payload {
  plan: string;
  has_api: boolean;
  has_csv: boolean;
  sites: { id: string; name: string; domain: string; public_share_id: string | null }[];
  mcp: { client_name: string; scope: string; site_id: string; last_used_at: string | null }[];
  api_keys: { id: string; site_id: string; name: string | null; key_prefix: string; last_used_at: string | null }[];
  alerts: {
    site_id: string;
    enabled: boolean;
    threshold_pct: number;
    webhook_url: string | null;
    last_triggered_at: string | null;
  }[];
  last_read: string | null;
}

export function DestinationsPanel() {
  const { t, intl } = useT();
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/destinations");
      const json = await res.json();
      if (!cancelled) setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
      </div>
    );
  }

  const siteName = (id: string) => data.sites.find((s) => s.id === id)?.name ?? "—";
  const publicSites = data.sites.filter((s) => s.public_share_id);
  const webhooks = data.alerts.filter((a) => a.webhook_url);
  const emailAlerts = data.alerts.filter((a) => a.enabled);

  return (
    <div className="space-y-4">
      {/* The audit line. First thing on the screen because it is the one
          fact nowhere else in the product will tell you. */}
      <div className="app-card">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-light">
          {t.screens.destinations.lastRead}
        </p>
        <p className="mt-1 text-[13px]">
          {data.last_read ? (
            <>
              {t.screens.destinations.lastReadIntro}{" "}
              <span className="font-medium">{relativeTime(data.last_read, intl)}</span>.
            </>
          ) : (
            <span className="text-muted">{t.screens.destinations.lastReadNever}</span>
          )}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card
          icon={Sparkles}
          title={t.screens.destinations.mcpTitle}
          body={t.screens.destinations.mcpBody}
          active={data.mcp.length > 0}
          locked={!data.has_api}
          lockedPlan="Growth"
          href="/dashboard/settings?tab=api"
        >
          {data.mcp.length === 0 ? (
            <Empty>{t.screens.destinations.mcpNone}</Empty>
          ) : (
            data.mcp.map((m, i) => (
              <Row
                key={`${m.client_name}-${i}`}
                label={m.client_name}
                hint={`${siteName(m.site_id)} · ${t.screens.destinations.mcpScope} ${m.scope}`}
                when={m.last_used_at}
              />
            ))
          )}
        </Card>

        <Card
          icon={KeyRound}
          title={t.screens.destinations.keysTitle}
          body={t.screens.destinations.keysBody}
          active={data.api_keys.length > 0}
          locked={!data.has_api}
          lockedPlan="Growth"
          href="/dashboard/settings?tab=api"
        >
          {data.api_keys.length === 0 ? (
            <Empty>{t.screens.destinations.keysNone}</Empty>
          ) : (
            data.api_keys.map((k) => (
              <Row
                key={k.id}
                label={k.name || k.key_prefix}
                hint={siteName(k.site_id)}
                when={k.last_used_at}
              />
            ))
          )}
        </Card>

        <Card
          icon={Share2}
          title={t.screens.destinations.publicTitle}
          body={t.screens.destinations.publicBody}
          active={publicSites.length > 0}
          href="/dashboard/settings?tab=sites"
        >
          {publicSites.length === 0 ? (
            <Empty>{t.screens.destinations.publicNone}</Empty>
          ) : (
            publicSites.map((s) => (
              <Row key={s.id} label={s.name} hint={`/public/${s.public_share_id}`} />
            ))
          )}
        </Card>

        <Card
          icon={Webhook}
          title={t.screens.destinations.webhookTitle}
          body={t.screens.destinations.webhookBody}
          active={webhooks.length > 0}
          href="/dashboard/settings?tab=sites"
        >
          {webhooks.length === 0 ? (
            <Empty>{t.screens.destinations.webhookNone}</Empty>
          ) : (
            webhooks.map((a) => (
              <Row
                key={a.site_id}
                label={siteName(a.site_id)}
                hint={hostOf(a.webhook_url!)}
                when={a.last_triggered_at}
              />
            ))
          )}
        </Card>

        <Card
          icon={Bell}
          title={t.screens.destinations.emailTitle}
          body={t.screens.destinations.emailBody}
          active={emailAlerts.length > 0}
          href="/dashboard/settings?tab=sites"
        >
          {emailAlerts.length === 0 ? (
            <Empty>{t.screens.destinations.emailNone}</Empty>
          ) : (
            emailAlerts.map((a) => (
              <Row
                key={a.site_id}
                label={siteName(a.site_id)}
                hint={`${t.screens.destinations.emailOn} ${a.threshold_pct}%`}
                when={a.last_triggered_at}
              />
            ))
          )}
        </Card>

        <Card
          icon={Download}
          title={t.screens.destinations.csvTitle}
          body={t.screens.destinations.csvBody}
          active={data.has_csv}
          locked={!data.has_csv}
          lockedPlan="Business"
          href="/dashboard"
          hrefLabel={t.screens.destinations.csvGo}
        />
      </div>

      <p className="text-[12px] text-muted-light">{t.screens.destinations.oneNote}</p>
    </div>
  );
}

/** The host of a webhook URL — the whole URL can carry a secret path. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.slice(0, 40);
  }
}

function Card({
  icon: Icon,
  title,
  body,
  active,
  locked,
  lockedPlan,
  href,
  hrefLabel,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  active: boolean;
  locked?: boolean;
  /** Named per card: API access starts at Growth, CSV at Business. */
  lockedPlan?: string;
  href: string;
  hrefLabel?: string;
  children?: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="app-card flex flex-col">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">{body}</p>
        </div>
        {locked ? (
          <span className="flex shrink-0 items-center gap-1 rounded-sm bg-surface-sunken px-1.5 py-0.5 text-[10px] text-muted-light">
            <Lock className="h-2.5 w-2.5" />
            {t.screens.destinations.lockedFrom.replace("{plan}", lockedPlan ?? "Growth")}
          </span>
        ) : (
          <span
            className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${
              active
                ? "bg-primary-pale text-primary"
                : "bg-surface-sunken text-muted-light"
            }`}
          >
            {active ? t.screens.destinations.active : t.screens.destinations.inactive}
          </span>
        )}
      </div>

      {children && <div className="mt-3 space-y-1">{children}</div>}

      <a
        href={href}
        className="mt-3 flex items-center gap-1 self-start text-[12px] font-medium text-primary transition-colors hover:underline"
      >
        {hrefLabel ?? t.screens.destinations.configure}
        <ArrowRight className="h-3 w-3" />
      </a>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-muted-light">{children}</p>;
}

function Row({
  label,
  hint,
  when,
}: {
  label: string;
  hint?: string;
  when?: string | null;
}) {
  const { t, intl } = useT();
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-sm bg-surface-sunken px-2 py-1.5 text-[12px]">
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{label}</span>
        {hint && <span className="ml-1.5 text-muted-light">{hint}</span>}
      </span>
      {when !== undefined && (
        <span className="shrink-0 text-[11px] text-muted-light">
          {when
            ? `${t.screens.destinations.usedOn} ${relativeTime(when, intl)}`
            : t.screens.destinations.neverUsed}
        </span>
      )}
    </div>
  );
}
