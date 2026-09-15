/**
 * La règle de mot de passe, en un seul endroit.
 *
 * Elle doit rester identique à celle réglée dans Supabase
 * (Authentication → Email : longueur minimale 10, « lowercase,
 * uppercase letters and digits »). Supabase reste le vrai garde ; ce
 * fichier sert à prévenir l'utilisateur avant l'envoi, dans sa langue,
 * plutôt que de lui renvoyer l'erreur anglaise du serveur.
 */
export const MIN_PASSWORD_LENGTH = 10;

export type PasswordIssue = "length" | "characters";

export function passwordIssue(password: string): PasswordIssue | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "length";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "characters";
  }
  return null;
}

/** L'erreur « mot de passe faible » de Supabase, quelle que soit sa raison. */
export function isWeakPasswordError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "weak_password";
}
