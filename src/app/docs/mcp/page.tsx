import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/i18n/get-locale";
import { dictionaries } from "@/i18n/dictionaries";
import { languageAlternates, localePath } from "@/i18n/paths";
import { getAssistantFaq } from "@/content/assistant-faq";
import { MCP_TOOLS, mcpDocs, type ToolGroup } from "@/content/mcp-docs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Assistant } from "@/components/marketing/assistant";
import { Footer, FinalCta } from "@/components/marketing/sections";

/**
 * Documentation publique du serveur MCP — la page que les annuaires de
 * Claude et de ChatGPT demandent, et que lit quiconque veut savoir ce
 * qu'un assistant fera de ses données avant de le brancher.
 *
 * Contenu dans src/content/mcp-docs.ts ; la liste des outils y est
 * confrontée à ceux du serveur à chaque build.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";
const MCP_URL = `${SITE_URL}/api/mcp`;
const GROUPS: ToolGroup[] = ["overview", "analysis", "boards", "product", "accounts", "write"];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const d = mcpDocs(locale);
  return {
    title: d.metaTitle,
    description: d.metaDescription,
    alternates: languageAlternates(locale, "/docs/mcp"),
    openGraph: {
      title: `${d.metaTitle} · PulseTrack`,
      description: d.metaDescription,
      url: localePath(locale, "/docs/mcp"),
      type: "article",
      locale: locale === "fr" ? "fr_FR" : "en_US",
    },
  };
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface px-4 py-3 text-[13px] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-border py-12">
      <h2 className="text-[1.6rem] md:text-[1.85rem]">{title}</h2>
      <div className="mt-5 text-[15px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function McpDocsPage() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  const d = mcpDocs(locale);

  return (
    <>
      <SiteNav t={t.nav} locale={locale} />

      <main>
        <section className="wash-hero pt-[132px] pb-12 md:pt-[152px]">
          <div className="mx-auto max-w-3xl px-6">
            <span className="eyebrow">{d.eyebrow}</span>
            <h1 className="mt-5 text-[2.4rem] md:text-[3rem]">{d.title}</h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted">{d.subtitle}</p>
            <p className="mt-8 text-[12px] font-medium uppercase tracking-wide text-muted-light">
              {d.serverUrlLabel}
            </p>
            <Code>{MCP_URL}</Code>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-6 pb-16">
          <Section id="connect" title={d.connect.title}>
            <p>{d.connect.intro}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5">
              {d.connect.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>

            <h3 className="mt-8 text-[17px] font-medium text-foreground">{d.connect.cliTitle}</h3>
            <Code>{`# Claude Code
claude mcp add --transport http pulsetrack ${MCP_URL}

# Codex
codex mcp add pulsetrack --url ${MCP_URL}
codex mcp login pulsetrack

# Gemini CLI
gemini mcp add --transport http pulsetrack ${MCP_URL}`}</Code>

            <h3 className="mt-8 text-[17px] font-medium text-foreground">{d.connect.keyTitle}</h3>
            <p className="mt-2">{d.connect.keyBody}</p>
            <p className="mt-4">{d.connect.guide}</p>
          </Section>

          <Section id="auth" title={d.auth.title}>
            <Bullets items={d.auth.items} />
          </Section>

          <Section id="tools" title={d.tools.title}>
            <p>{d.tools.intro}</p>
            {GROUPS.map((group) => (
              <div key={group} className="mt-8">
                <h3 className="text-[13px] font-medium uppercase tracking-wide text-muted-light">
                  {d.tools.groups[group]}
                </h3>
                <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {MCP_TOOLS.filter((tool) => tool.group === group).map((tool) => (
                    <div key={tool.name} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                      <code className="shrink-0 text-[13px] font-medium text-foreground sm:w-48">{tool.name}</code>
                      <span className="flex-1 text-[14px]">{locale === "fr" ? tool.fr : tool.en}</span>
                      <span
                        className={`w-fit shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] ${
                          tool.write
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-surface text-muted-light"
                        }`}
                      >
                        {tool.write ? d.tools.write : d.tools.readOnly}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          <Section id="examples" title={d.prompts.title}>
            <Bullets items={d.prompts.items} />
          </Section>

          <Section id="privacy" title={d.privacy.title}>
            <Bullets items={d.privacy.items} />
          </Section>

          <Section id="limits" title={d.limits.title}>
            <Bullets items={d.limits.items} />
            <p className="mt-8">
              <Link href={localePath(locale, "/#mcp-faq")} className="font-medium text-primary hover:underline">
                {locale === "fr" ? "Questions fréquentes sur le MCP →" : "MCP frequently asked questions →"}
              </Link>
            </p>
          </Section>
        </div>

        <FinalCta
          title={
            <>
              {t.finalCta.title} <span className="text-primary">{t.finalCta.titleAccent}</span>
            </>
          }
          primary={t.finalCta.primary}
          secondary={t.finalCta.secondary}
          notes={t.finalCta.notes}
          locale={locale}
        />
      </main>

      <Footer tagline={t.footer.tagline} columns={t.footer.columns} legal={t.footer.legal}
        locale={locale} />

      <Assistant t={t.assistant} faq={getAssistantFaq(locale)} locale={locale} />
    </>
  );
}
