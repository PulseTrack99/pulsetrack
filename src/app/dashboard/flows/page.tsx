import { FlowPanel } from "@/components/flow-panel";

export const metadata = {
  title: "Flows",
};

export default function FlowsPage() {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        Le parcours réel de vos visiteurs entre les pages — pas un funnel défini
        à l&apos;avance, ce qui se passe vraiment.
      </p>
      <FlowPanel />
    </div>
  );
}
