import { PublicDashboard } from "@/components/public-dashboard";

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return <PublicDashboard shareId={shareId} />;
}
