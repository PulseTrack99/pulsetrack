import { Suspense } from "react";
import { AgentConsole } from "@/components/agent-console";

export const metadata = {
  title: "Agent",
};

export default function AgentPage() {
  // The console reads the pathname for its per-screen suggestions, so
  // it needs a boundary like the other client screens.
  return (
    <Suspense fallback={null}>
      <AgentConsole />
    </Suspense>
  );
}
