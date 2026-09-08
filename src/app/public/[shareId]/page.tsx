import { PublicDashboard } from "@/components/public-dashboard";
import { getLocale } from "@/i18n/get-locale";
import { dictionaries } from "@/i18n/dictionaries";

/**
 * La langue suit celle du visiteur, pas celle du propriétaire du site.
 *
 * C'est la seule page du produit qu'un client montre à ses propres
 * clients : le lien peut être ouvert par n'importe qui, n'importe où.
 * getLocale lit le cookie de langue s'il existe, sinon Accept-Language.
 */
export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const locale = await getLocale();

  return (
    <PublicDashboard
      shareId={shareId}
      t={dictionaries[locale].publicDashboard}
      intl={locale === "fr" ? "fr-FR" : "en-US"}
    />
  );
}
