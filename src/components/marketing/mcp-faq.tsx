import { Reveal, RevealGroup } from "@/components/marketing/reveal";

/**
 * Les questions qu'on se pose avant de brancher son assistant IA sur ses
 * analytics — juste sous la présentation du serveur MCP, là où elles
 * naissent.
 *
 * Chaque réponse décrit ce qui existe et a été vérifié : les outils
 * couverts par le guide des Paramètres, la lecture seule, l'absence de
 * données personnelles dans les réponses, l'offre requise. Une réponse
 * rassurante mais fausse coûterait plus cher qu'une question sans
 * réponse.
 *
 * Même rendu que la FAQ des pages fonctionnalités, et même balisage
 * FAQPage pour les moteurs de recherche.
 */
export function McpFaq({
  title,
  items,
  docsLabel,
  docsHref,
}: {
  title: string;
  items: { q: string; a: string }[];
  docsLabel: string;
  docsHref: string;
}) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section id="mcp-faq" className="border-t border-border py-20">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="text-[2rem] md:text-[2.25rem]">{title}</h2>
        </Reveal>

        <RevealGroup className="mt-10">
          {items.map((item) => (
            <details key={item.q} className="reveal group border-b border-border py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium marker:hidden">
                {item.q}
                <span className="shrink-0 text-muted-light transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </RevealGroup>

        <p className="mt-8 text-[14.5px]">
          <a href={docsHref} className="font-medium text-primary hover:underline">
            {docsLabel} →
          </a>
        </p>
      </div>

      <script
        type="application/ld+json"
        // Contenu statique issu des dictionnaires, pas d'une saisie.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </section>
  );
}
