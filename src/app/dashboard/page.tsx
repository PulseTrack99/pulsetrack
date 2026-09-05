import { DashboardContent } from "@/components/dashboard-content";

export const metadata = {
  title: "Accueil",
};

/** Sites are fetched once in the layout and shared through
 *  SiteProvider — this page no longer needs to fetch them itself. */
export default function DashboardPage() {
  return <DashboardContent />;
}
