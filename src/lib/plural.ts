/**
 * Le mot au singulier quand il n'y en a qu'un.
 *
 * Français et anglais prennent tous deux un -s nu sur les mots
 * concernés ici, donc deux formes suffisent — mais elles doivent venir
 * du dictionnaire et non d'une concaténation, sinon la première langue
 * qui ne marche pas comme ça casse en silence.
 *
 * Existait déjà comme défaut visible : « 1 enregistrements », « 1
 * tableaux ». Un compteur qui se trompe de nombre fait douter du
 * chiffre lui-même.
 */
export function plural(n: number, one: string, many: string): string {
  return Math.abs(n) === 1 ? one : many;
}
