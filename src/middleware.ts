import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalizedPath, stripLocale } from "@/i18n/paths";

const LOCALE_HEADER = "x-pt-locale";

/**
 * Pages publiques : la langue vient de l'adresse.
 *
 * /fr/... est servi par la même page que /..., avec la langue fixée par
 * un en-tête que lit src/i18n/get-locale.ts. L'adresse affichée reste
 * /fr/..., aucune page n'est dupliquée, et Google voit deux URL, une par
 * langue. Toute autre adresse publique est en anglais.
 *
 * Un en-tête de langue envoyé par le navigateur lui-même est écrasé :
 * seule l'adresse décide.
 */
function localizePublicPage(request: NextRequest): NextResponse | null {
  const { locale, path } = stripLocale(request.nextUrl.pathname);
  if (!isLocalizedPath(path)) return null;

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);

  if (locale === "fr") {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export async function middleware(request: NextRequest) {
  const localized = localizePublicPage(request);
  if (localized) return localized;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session (important for Server Components)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not signed in and the route is protected, redirect to login
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is signed in and tries to access login/signup, redirect to dashboard
  if (
    user &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    // Pages publiques par langue (src/i18n/paths.ts)
    "/",
    "/fr",
    "/fr/:path*",
    "/features/:path*",
    "/docs/:path*",
    "/compare/:path*",
    "/use-cases/:path*",
  ],
};
