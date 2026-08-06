import { cookies, headers } from "next/headers";
import type { Locale } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  // 1. Check cookie (user explicitly chose a language)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  if (localeCookie === "fr" || localeCookie === "en") {
    return localeCookie;
  }

  // 2. Auto-detect from Accept-Language header
  const headerStore = await headers();
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
