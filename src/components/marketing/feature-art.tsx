import {
  Bell,
  Building2,
  Check,
  Hash,
  MessageSquare,
  MousePointer2,
  Play,
  ShieldCheck,
} from "lucide-react";

/**
 * Les illustrations des neuf pages de fonctionnalités ajoutées après
 * coup (replay, insights, rétention, parcours, comptes, expériences,
 * flags, alertes, API).
 *
 * Dessinées, pas capturées : une capture d'écran vieillit en silence à
 * la première évolution de l'interface, alors qu'un schéma dit ce que
 * la fonctionnalité fait sans prétendre montrer l'écran exact.
 *
 * Chacune tient dans un cadre au même format que les illustrations
 * existantes (src/components/marketing/feature-blocks.tsx).
 */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-surface"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {children}
    </div>
  );
}

function Bar({ label, value, width, accent = false }: { label: string; value: string; width: number; accent?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]">
        <span className={accent ? "font-medium" : "text-muted"}>{label}</span>
        <span className="tabular text-[11.5px] text-muted">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={`h-full rounded-full ${accent ? "bg-primary" : "bg-primary/35"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function ArtReplay({ fr }: { fr: boolean }) {
  return (
    <Frame>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
          <Play className="h-3 w-3" />
        </span>
        <span className="text-[11.5px] text-muted">{fr ? "Session · 2 min 14" : "Session · 2m 14s"}</span>
        <span className="ml-auto rounded-sm bg-coral/10 px-1.5 py-0.5 text-[10.5px] font-medium text-coral">
          {fr ? "3 clics de rage" : "3 rage clicks"}
        </span>
      </div>

      <div className="space-y-3 p-5">
        <div className="rounded-lg border border-border bg-surface-sunken/60 p-4">
          <div className="h-2 w-24 rounded-full bg-border" />
          <div className="mt-3 rounded-sm border border-border bg-surface px-3 py-2 text-[12px] tracking-[0.25em] text-muted-light">
            ••••••••••
          </div>
          <p className="mt-2 text-[10.5px] text-muted-light">
            {fr ? "Saisies masquées à l'enregistrement" : "Inputs masked at recording time"}
          </p>
          <div className="relative mt-4 h-16">
            <MousePointer2 className="absolute left-6 top-2 h-4 w-4 text-primary" />
            <MousePointer2 className="absolute left-24 top-8 h-4 w-4 text-primary/50" />
            <MousePointer2 className="absolute left-40 top-4 h-4 w-4 text-primary/25" />
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
      </div>
    </Frame>
  );
}

export function ArtInsights({ fr }: { fr: boolean }) {
  return (
    <Frame>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5 text-[11px]">
        {[
          fr ? "événements" : "events",
          "÷",
          "sessions",
          fr ? "par semaine" : "by week",
          fr ? "source = LinkedIn" : "source = LinkedIn",
        ].map((chip) => (
          <span key={chip} className="rounded-sm border border-border px-1.5 py-0.5 text-muted">
            {chip}
          </span>
        ))}
      </div>

      <div className="space-y-3 p-5">
        <p className="text-[26px] font-medium tracking-[-0.02em]">
          4,1 <span className="text-[16px] text-muted">%</span>
        </p>
        <div className="flex h-24 items-end gap-2">
          {[38, 52, 46, 61, 58, 72, 80].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm bg-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
        <p className="text-[11px] text-muted-light">
          {fr ? "Ratio calculé sur les totaux de la période" : "Ratio computed on period totals"}
        </p>
      </div>
    </Frame>
  );
}

export function ArtRetention({ fr }: { fr: boolean }) {
  const rows = [
    [100, 62, 48, 41, 38],
    [100, 58, 44, 37],
    [100, 66, 51],
    [100, 71],
    [100],
  ];

  return (
    <Frame>
      <div className="border-b border-border px-4 py-2.5 text-[11.5px] text-muted">
        {fr ? "Cohortes hebdomadaires · personnes identifiées" : "Weekly cohorts · identified people"}
      </div>
      <div className="space-y-1.5 p-5">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-1.5">
            <span className="w-14 shrink-0 text-[10.5px] leading-6 text-muted-light">
              {fr ? `S${i + 1}` : `W${i + 1}`}
            </span>
            {row.map((v, j) => (
              <span
                key={j}
                className="flex h-6 flex-1 items-center justify-center rounded-sm text-[10.5px] font-medium"
                style={{
                  background: `color-mix(in srgb, var(--primary) ${Math.round(v * 0.75)}%, transparent)`,
                  color: v > 55 ? "#fff" : "var(--foreground)",
                }}
              >
                {v}%
              </span>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ArtFlows({ fr }: { fr: boolean }) {
  const columns = [
    [{ label: "/", w: 100 }],
    [
      { label: "/pricing", w: 62 },
      { label: "/docs", w: 38 },
    ],
    [
      { label: "/signup", w: 34 },
      { label: fr ? "Sortie" : "Exit", w: 44 },
      { label: fr ? "Autres" : "Other", w: 22 },
    ],
  ];

  return (
    <Frame>
      <div className="border-b border-border px-4 py-2.5 text-[11.5px] text-muted">
        {fr ? "Parcours · 3 étapes" : "Flows · 3 steps"}
      </div>
      <div className="grid grid-cols-3 gap-3 p-5">
        {columns.map((col, i) => (
          <div key={i} className="space-y-2">
            {col.map((node) => (
              <div
                key={node.label}
                className="rounded-sm border border-border bg-surface-sunken/60 px-2.5 py-2"
                style={{ opacity: 0.55 + node.w / 220 }}
              >
                <p className="truncate text-[11.5px]">{node.label}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${node.w}%` }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ArtAccounts({ fr }: { fr: boolean }) {
  const accounts = [
    { name: "Northwind", people: 12, revenue: "1 240 €", active: true },
    { name: "Globex", people: 7, revenue: "890 €", active: true },
    { name: "Initech", people: 4, revenue: "290 €", active: false },
  ];

  return (
    <Frame>
      <div className="border-b border-border px-4 py-2.5 text-[11.5px] text-muted">
        {fr ? "Comptes · 30 jours" : "Accounts · 30 days"}
      </div>
      <div className="divide-y divide-border">
        {accounts.map((a) => (
          <div key={a.name} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary-pale">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{a.name}</p>
              <p className="text-[11px] text-muted-light">
                {a.people} {fr ? "personnes" : "people"}
              </p>
            </div>
            <span className="tabular text-[12.5px]">{a.revenue}</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${a.active ? "bg-emerald" : "bg-coral"}`}
              aria-hidden
            />
          </div>
        ))}
      </div>
      <p className="border-t border-border px-4 py-2.5 text-[10.5px] text-muted-light">
        {fr ? "Initech : aucune activité depuis 21 jours" : "Initech: no activity for 21 days"}
      </p>
    </Frame>
  );
}

export function ArtExperiments({ fr }: { fr: boolean }) {
  return (
    <Frame>
      <div className="border-b border-border px-4 py-2.5 text-[11.5px] text-muted">
        {fr ? "Test A/B · page de prix" : "A/B test · pricing page"}
      </div>
      <div className="space-y-4 p-5">
        <Bar label={fr ? "Version A (référence)" : "Variant A (control)"} value="3,1 %" width={46} />
        <Bar label={fr ? "Version B" : "Variant B"} value="4,6 %" width={68} accent />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald/10 px-2 py-1 text-[11px] font-medium text-emerald">
            <Check className="h-3 w-3" />
            {fr ? "Significatif à 95 %" : "Significant at 95%"}
          </span>
          <span className="text-[11px] text-muted-light">p = 0,012</span>
        </div>
      </div>
    </Frame>
  );
}

export function ArtFlags({ fr }: { fr: boolean }) {
  const flags = [
    { key: "new-checkout", on: true, rollout: 25 },
    { key: "dark-mode", on: true, rollout: 100 },
    { key: "beta-editor", on: false, rollout: 10 },
  ];

  return (
    <Frame>
      <div className="border-b border-border px-4 py-2.5 text-[11.5px] text-muted">
        {fr ? "Feature flags" : "Feature flags"}
      </div>
      <div className="divide-y divide-border">
        {flags.map((f) => (
          <div key={f.key} className="flex items-center gap-3 px-4 py-3">
            <Hash className="h-3.5 w-3.5 shrink-0 text-muted-light" />
            <code className="flex-1 truncate font-mono text-[12px]">{f.key}</code>
            <span className="tabular text-[11px] text-muted">{f.rollout} %</span>
            <span
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full ${
                f.on ? "bg-primary" : "bg-border"
              }`}
            >
              <span className={`absolute h-3 w-3 rounded-full bg-white ${f.on ? "right-0.5" : "left-0.5"}`} />
            </span>
          </div>
        ))}
      </div>
      <p className="border-t border-border px-4 py-2.5 text-[10.5px] text-muted-light">
        {fr ? "Un nouveau flag naît toujours éteint" : "A new flag is always created off"}
      </p>
    </Frame>
  );
}

export function ArtAlerts({ fr }: { fr: boolean }) {
  const bars = [70, 74, 68, 72, 71, 30, 28];

  return (
    <Frame>
      <div className="flex items-end gap-1.5 px-5 pb-3 pt-5" style={{ height: 120 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm ${h < 40 ? "bg-coral/70" : "bg-primary/45"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="border-t border-border p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-sm bg-coral/10">
            <Bell className="h-3.5 w-3.5 text-coral" />
          </span>
          <div>
            <p className="text-[12.5px] font-medium">
              {fr ? "Trafic en baisse de 58 %" : "Traffic down 58%"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-light">
              {fr ? "E-mail envoyé · Slack #growth" : "E-mail sent · Slack #growth"}
            </p>
          </div>
          <MessageSquare className="ml-auto h-3.5 w-3.5 text-muted-light" />
        </div>
      </div>
    </Frame>
  );
}

export function ArtApi({ fr }: { fr: boolean }) {
  return (
    <Frame>
      <div className="border-b border-border px-4 py-2.5 text-[11.5px] text-muted">
        {fr ? "Livraison quotidienne" : "Daily delivery"}
      </div>
      <div className="space-y-3 p-5">
        <div className="overflow-x-auto rounded-lg bg-surface-inverse p-4">
          <code className="whitespace-pre font-mono text-[11px] leading-relaxed text-white/85">
            {`POST https://vous.exemple/pulsetrack
X-PulseTrack-Signature: sha256=…
{ "events": [ … ] }`}
          </code>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald/10 px-2 py-1 text-[11px] font-medium text-emerald">
            <ShieldCheck className="h-3 w-3" />
            {fr ? "Signature vérifiée" : "Signature verified"}
          </span>
          <span className="text-[11px] text-muted-light">
            {fr ? "Reprise au curseur en cas d'échec" : "Resumes from the cursor on failure"}
          </span>
        </div>
      </div>
    </Frame>
  );
}
