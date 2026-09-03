import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/i18n/get-locale";
import { dictionaries } from "@/i18n/dictionaries";

const sans = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
  display: "swap",
});

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = dictionaries[locale].meta;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.title,
      template: "%s · PulseTrack",
    },
    description: t.description,
    keywords: t.keywords,
    applicationName: "PulseTrack",
    authors: [{ name: "PulseTrack" }],
    creator: "PulseTrack",
    alternates: {
      canonical: "/",
      languages: { en: "/", fr: "/" },
    },
    openGraph: {
      type: "website",
      siteName: "PulseTrack",
      title: t.title,
      description: t.description,
      url: "/",
      locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t.title,
      description: t.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    category: "technology",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = dictionaries[locale];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "PulseTrack",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: t.meta.description,
        url: SITE_URL,
        offers: t.pricing.plans.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: p.price,
          priceCurrency: "EUR",
          category: p.price === "0" ? "free" : "subscription",
        })),
      },
      {
        "@type": "Organization",
        name: "PulseTrack",
        url: SITE_URL,
        description: t.footer.tagline,
      },
      {
        "@type": "WebSite",
        name: "PulseTrack",
        url: SITE_URL,
        inLanguage: locale === "fr" ? "fr-FR" : "en-US",
      },
    ],
  };

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <script
          type="application/ld+json"
          // Serialised from our own dictionary — no user input reaches this.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
