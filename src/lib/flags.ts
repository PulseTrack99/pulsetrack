import { createHash } from "node:crypto";

/**
 * Décider si une personne voit une fonctionnalité.
 *
 * Rien n'est enregistré. Le verdict se recalcule à chaque appel à
 * partir d'un hachage, ce qui donne toujours la même réponse à la même
 * personne sans conserver une seule ligne d'assignation — ni table qui
 * grossit, ni donnée à effacer le jour où quelqu'un le demande.
 */

export interface Flag {
  key: string;
  enabled: boolean;
  rollout: number;
}

/**
 * Le seau d'une personne pour un flag donné, entre 0 et 99.
 *
 * La clé du flag entre dans le hachage, et c'est le détail qui compte :
 * sans elle, les mêmes 10 % de gens tomberaient dans le premier décile
 * de *tous* les flags. Deux déploiements à 10 % toucheraient exactement
 * le même public, et le second n'apprendrait rien que le premier n'ait
 * déjà biaisé.
 *
 * SHA-256 plutôt qu'un hachage court maison : la distribution doit être
 * uniforme sur des identifiants qui ne le sont pas — des e-mails d'un
 * même domaine, des identifiants séquentiels — et un hachage bricolé
 * regroupe ceux-là au lieu de les disperser.
 */
export function bucketOf(flagKey: string, id: string): number {
  const h = createHash("sha256").update(`${flagKey}:${id}`).digest();
  // Quatre octets suffisent largement pour cent seaux, et éviter le bit
  // de signe garde le modulo positif.
  return ((h.readUInt32BE(0) >>> 0) % 100);
}

/**
 * Le verdict, pour un flag et une personne.
 *
 * L'interrupteur principal l'emporte sur le pourcentage : éteint, le
 * flag répond faux à tout le monde. C'est le geste d'urgence, et il ne
 * doit dépendre d'aucun calcul.
 */
export function evaluate(flag: Flag, id: string): boolean {
  if (!flag.enabled) return false;
  if (flag.rollout <= 0) return false;
  if (flag.rollout >= 100) return true;
  return bucketOf(flag.key, id) < flag.rollout;
}

/** Tous les verdicts d'un site, sous la forme que le tracker attend. */
export function evaluateAll(flags: Flag[], id: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of flags) out[f.key] = evaluate(f, id);
  return out;
}
