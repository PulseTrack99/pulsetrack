import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PulseTrack — Analytics simple et puissant pour votre site web",
  description:
    "Comprenez votre trafic, identifiez vos meilleurs canaux et découvrez ce qui génère vraiment du revenu. Installation en 1 minute. Conforme RGPD.",
  keywords: [
    "web analytics",
    "tracking",
    "GDPR compliant analytics",
    "google analytics alternative",
    "privacy analytics",
    "revenue attribution",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
