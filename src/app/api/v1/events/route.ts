import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveApiKey, isApiKeyRateLimited } from "@/lib/api-keys";
import { planHas } from "@/lib/plan";

/**
 * Raw event export — the aggregated CSV export (src/app/api/export/
 * csv) gives a summary; this gives the underlying rows, for anyone
 * piping PulseTrack into their own warehouse (BigQuery, Snowflake, a
 * cron'd script) instead of waiting for first-party connectors nobody
 * has asked for yet. Same auth as the rest of the public API (Bearer
 * key — the key IS the site, never a client-supplied site_id) and the
 * same "csv_export" capability the aggregated export already uses,
 * since both are "get my data out" on the same plan tier.
 *
 * Cursor-based (created_at, id), not offset/limit — a page number
 * shifts under a caller mid-export as new events keep arriving; a
 * cursor doesn't.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

interface Cursor {
  created_at: string;
  id: string;
}

function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof decoded.created_at === "string" && typeof decoded.id === "string") return decoded;
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return NextResponse.json(
        { error: "Missing Authorization: Bearer <key> header" },
        { status: 401 }
      );
    }

    const resolved = await resolveApiKey(supabase, match[1].trim());
    if (!resolved) {
      return NextResponse.json(
        { error: "Invalid, revoked API key, or this site's plan no longer includes API access" },
        { status: 401 }
      );
    }
    if (!planHas(resolved.plan, "csv_export")) {
      return NextResponse.json(
        { error: "upgrade_required", plan: resolved.plan, feature: "raw_export" },
        { status: 402 }
      );
    }
    if (await isApiKeyRateLimited(supabase, resolved.keyId)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since") ?? new Date(Date.now() - 30 * 86_400_000).toISOString();
    const until = searchParams.get("until") ?? new Date().toISOString();
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(searchParams.get("limit")) || DEFAULT_LIMIT));
    const cursor = decodeCursor(searchParams.get("cursor"));

    if (Number.isNaN(Date.parse(since)) || Number.isNaN(Date.parse(until))) {
      return NextResponse.json({ error: "since/until must be ISO 8601 timestamps" }, { status: 400 });
    }

    let query = supabase
      .from("events")
      .select(
        "id, type, path, referrer, title, source, utm_medium, utm_campaign, country, device, browser, screen_width, language, session_id, visitor_id, duration, event_name, event_props, created_at"
      )
      .eq("site_id", resolved.site.id)
      .gte("created_at", since)
      .lte("created_at", until)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    // Keyset pagination: strictly after the last (created_at, id) the
    // caller has already seen, so a page boundary can't skip or repeat
    // a row even if events keep arriving between calls.
    if (cursor) {
      query = query.or(
        `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Raw export query error:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const events = data ?? [];
    const last = events[events.length - 1];
    const nextCursor =
      events.length === limit && last ? encodeCursor({ created_at: last.created_at, id: last.id }) : null;

    return NextResponse.json({
      site: { name: resolved.site.name, domain: resolved.site.domain },
      events,
      next_cursor: nextCursor,
    });
  } catch (err) {
    console.error("Raw export error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
