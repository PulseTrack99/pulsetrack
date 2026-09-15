"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Info } from "lucide-react";
import { useT } from "@/components/locale-context";
import { mcpGuide } from "@/content/mcp-guide";

/**
 * Connecter un assistant IA au serveur MCP — un onglet par outil, avec
 * les étapes exactes, les commandes à copier et, quand l'éditeur en
 * propose, un bouton d'installation en un clic (Cursor, VS Code).
 *
 * `apiKey` n'est renseignée que juste après la génération d'une clé :
 * les exemples qui en demandent une l'intègrent alors directement.
 */
export function McpGuide({ url, apiKey }: { url: string; apiKey: string | null }) {
  const { locale, t } = useT();
  const guide = mcpGuide(locale, url, apiKey);
  const [tabId, setTabId] = useState(guide.tabs[0].id);
  const [copied, setCopied] = useState<string | null>(null);
  const tab = guide.tabs.find((x) => x.id === tabId) ?? guide.tabs[0];

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
  }

  const copyButton = (id: string, text: string) => (
    <button
      onClick={() => copy(id, text)}
      aria-label="Copy"
      className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium hover:bg-surface-hover"
    >
      {copied === id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );

  return (
    <div className="rounded-lg border border-primary/20 bg-primary-pale/30 p-4">
      <p className="text-sm font-semibold">{t.settings.api.mcpTitle}</p>
      <p className="mt-1 text-xs text-muted">{guide.intro}</p>

      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2.5 py-1.5 text-xs">{url}</code>
        {copyButton("url", url)}
      </div>

      <div role="tablist" className="mt-3 flex flex-wrap gap-1.5">
        {guide.tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === tab.id}
            onClick={() => setTabId(x.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              x.id === tab.id
                ? "bg-primary text-white"
                : "border border-border bg-background text-muted hover:text-foreground"
            }`}
          >
            {x.name}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-3 space-y-3 rounded-md border border-border bg-background p-3">
        {tab.install && (
          <a
            href={tab.install.href}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
          >
            {tab.install.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed">
          {tab.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        {tab.snippets?.map((s, i) => {
          const id = `${tab.id}:${i}`;
          return (
            <div key={id}>
              <p className="text-[11px] text-muted">{s.label}</p>
              <div className="mt-1 flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-surface px-2.5 py-1.5 text-[11px] leading-relaxed">
                  <code>{s.code}</code>
                </pre>
                {copyButton(id, s.code)}
              </div>
              {s.usesKey && (
                <p className="mt-1 text-[11px] text-muted-light">
                  {apiKey ? guide.keyInsertedHint : guide.keyPlaceholderHint}
                </p>
              )}
            </div>
          );
        })}

        {tab.note && (
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {tab.note}
          </p>
        )}
      </div>
    </div>
  );
}
