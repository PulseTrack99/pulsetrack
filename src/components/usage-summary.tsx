import { AlertTriangle } from "lucide-react";

/**
 * Current month's usage against the plan's caps.
 *
 * Reads what supabase/quotas.sql actually tracks (usage_summary RPC),
 * so this can never show a number the enforcement itself disagrees with.
 */

export interface Usage {
  plan: string;
  events_used: number;
  events_limit: number;
  sites_used: number;
  sites_limit: number;
  funnels_used: number;
  funnels_limit: number;
}

function Bar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = limit < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const near = pct >= 80;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
        <span className="text-muted">{label}</span>
        <span className={near ? "font-medium text-coral" : "text-foreground"}>
          {used.toLocaleString("fr-FR")}
          {unlimited ? "" : ` / ${limit.toLocaleString("fr-FR")}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: near ? "var(--coral)" : "var(--primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function UsageSummary({ usage }: { usage: Usage }) {
  const anyNear =
    (usage.events_limit > 0 && usage.events_used / usage.events_limit >= 0.8) ||
    (usage.sites_limit > 0 && usage.sites_used / usage.sites_limit >= 0.8) ||
    (usage.funnels_limit > 0 && usage.funnels_used / usage.funnels_limit >= 0.8);

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium">Utilisation ce mois-ci</h3>
        <span className="rounded-sm bg-primary-pale px-2 py-0.5 text-[11px] font-medium text-primary">
          {usage.plan}
        </span>
      </div>

      <div className="mt-4 space-y-3.5">
        <Bar label="Événements" used={usage.events_used} limit={usage.events_limit} />
        <Bar label="Sites" used={usage.sites_used} limit={usage.sites_limit} />
        <Bar label="Funnels" used={usage.funnels_used} limit={usage.funnels_limit} />
      </div>

      {anyNear && (
        <p className="mt-4 flex items-start gap-1.5 text-[11.5px] text-coral">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Vous approchez d&apos;une limite de votre offre.
        </p>
      )}
    </div>
  );
}
