"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { useT } from "@/components/locale-context";

export function AcceptInviteButton({ token }: { token: string }) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.screens.common.inviteFailed);
        return;
      }
      setDone(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
    } catch {
      setError(t.screens.common.networkErrorRetry);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
        <Check className="h-4 w-4" />
        {t.screens.common.inviteAccepted}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <button
        onClick={accept}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.screens.common.acceptInvite}
      </button>
    </div>
  );
}
