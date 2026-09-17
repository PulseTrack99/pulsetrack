import { Check, X } from "lucide-react";
import { Reveal } from "./reveal";

/**
 * Le problème, puis la réponse — deux colonnes face à face.
 *
 * C'est la section qui manquait entre « voici notre produit » et
 * « voici nos fonctionnalités » : pourquoi un analytics classique
 * laisse son propriétaire avec des trous dans ses chiffres et sans
 * réponse sur l'argent.
 */
export function ProblemSolution({
  eyebrow,
  title,
  before,
  after,
}: {
  eyebrow: string;
  title: string;
  before: { title: string; items: string[] };
  after: { title: string; items: string[] };
}) {
  return (
    <section className="border-t border-border py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="mt-5 text-[2rem] md:text-[2.5rem]">{title}</h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal className="rounded-lg border border-border bg-surface p-7">
            <h3 className="text-[17px] font-medium tracking-[-0.015em] text-muted">{before.title}</h3>
            <ul className="mt-5 space-y-3">
              {before.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-[14.5px] leading-relaxed text-muted">
                  <X className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-light" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="rounded-lg border border-primary/30 bg-primary-pale/20 p-7">
            <h3 className="text-[17px] font-medium tracking-[-0.015em]">{after.title}</h3>
            <ul className="mt-5 space-y-3">
              {after.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-[14.5px] leading-relaxed">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
