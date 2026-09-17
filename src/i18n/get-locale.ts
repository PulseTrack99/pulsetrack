import { cookies, headers } from "next/headers";
import type { Locale } from "./dictionaries";

/** Posé par src/middleware.ts sur les pages publiques : la langue vient de l'adresse. */
export const LOCALE_HEADER = "x-pt-locale";

export async function getLocale(): Promise<Locale> {
  const headerStore = await headers();

  // 0. Page publique : la langue est celle de l'adresse (/ ou /fr), jamais
  //    celle du navigateur — sinon une même URL servirait deux langues et
  //    Google n'en indexerait qu'une.
  const fromPath = headerStore.get(LOCALE_HEADER);
  if (fromPath === "fr" || fromPath === "en") {
    return fromPath;
  }

  // 1. Check cookie (user explicitly chose a language)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  if (localeCookie === "fr" || localeCookie === "en") {
    return localeCookie;
  }

  // 2. Auto-detect from Accept-Language header
  const acceptLang = headerStore.get("accept-language") || "";

  // Parse Accept-Language: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  const languages = acceptLang
    .split(",")
    .map((lang) => {
      const [code, qStr] = lang.trim().split(";q=");
      return { code: code.split("-")[0].toLowerCase(), q: qStr ? parseFloat(qStr) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  // If French is the top preference, use French
  if (languages[0]?.code === "fr") {
    return "fr";
  }

  // Default to English
  return "en";
}
