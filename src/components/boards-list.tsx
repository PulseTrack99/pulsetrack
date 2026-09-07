"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Loader2, Plus, AlertTriangle } from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { relativeTime } from "@/lib/relative-time";
import { plural } from "@/lib/plural";

/**
 * The boards of a site.
 *
 * Deliberately thin: a board is worth nothing until it has blocks on
 * it, so this screen's job is to get out of the way and open one.
 */

interface BoardRow {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  blocks: number;
}

export function BoardsList() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <LayoutDashboard className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.boards.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return <SiteBoards key={siteId} siteId={siteId} />;
}

function SiteBoards({ siteId }: { siteId: string }) {
  const { t, intl } = useT();
  const router = useRouter();

  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/boards?site_id=${siteId}`);
    const data = await res.json();
    setBoards(data.boards ?? []);
    setPending(Boolean(data.migration_pending));
  }, [siteId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  async function create() {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, name: n }),
      });
      const data = await res.json();
      // Straight into the new board: an empty list of empty boards is
      // not a place anyone wants to be left.
      if (data.id) router.push(`/dashboard/boards/${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.boards.pendingTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.boards.pendingBody}
        </p>
        <pre className="mt-2.5 rounded-sm bg-surface-sunken p-3 font-mono text-[12px]">
          supabase/boards.sql
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-muted">
          {boards.length > 0 &&
            `${boards.length} ${plural(boards.length, t.screens.boards.countSuffixOne, t.screens.boards.countSuffix)}`}
        </span>
        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder={t.screens.boards.namePlaceholder}
              className="w-56 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-primary"
            />
            <button type="submit" disabled={busy} className="btn btn-brand py-1.5 text-[12.5px]">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.screens.boards.create}
            </button>
          </form>
        ) : (
          <button onClick={() => setCreating(true)} className="btn btn-brand py-1.5 text-[12.5px]">
            <Plus className="h-3.5 w-3.5" />
            {t.screens.boards.newBoard}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
        </div>
      ) : boards.length === 0 ? (
        <div className="app-card py-14 text-center">
          <LayoutDashboard className="mx-auto h-6 w-6 text-muted-light" />
          <p className="mt-3 text-[13px] font-medium">{t.screens.boards.listEmptyTitle}</p>
          <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
            {t.screens.boards.listEmptyBody}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/dashboard/boards/${b.id}`}
              className="app-card transition-colors hover:border-primary/40"
            >
              <p className="text-[13.5px] font-semibold">{b.name}</p>
              {b.description && (
                <p className="mt-1 line-clamp-2 text-[12.5px] text-muted">{b.description}</p>
              )}
              <p className="mt-2 text-[11.5px] text-muted-light">
                {b.blocks}{" "}
                {plural(b.blocks, t.screens.boards.blocksSuffixOne, t.screens.boards.blocksSuffix)} ·{" "}
                {relativeTime(b.updated_at, intl)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
