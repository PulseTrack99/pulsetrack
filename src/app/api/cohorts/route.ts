import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Saved cohorts — a name attached to a list of conditions combined
 * with AND/OR (supabase/cohort-builder.sql). Validated against the
 * same whitelist resolve_cohort_sessions matches on, so a malformed
 * condition is rejected here with a clear error rather than silently
 * dropped by the SQL function later.
 */

const FIELD_OPERATORS: Record<string, string[]> = {
  duration: ["gt", "gte", "lt", "lte"],
  pageview_count: ["gt", "gte", "lt", "lte"],
  scroll_pct: ["gt", "gte", "lt", "lte"],
  rage_click: ["exists", "not_exists"],
  converted: ["exists", "not_exists"],
  device: ["eq"],
  source: ["eq", "contains"],
  country: ["eq"],
  funnel_step: ["reached", "dropped"],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeConditions(raw: any): { conditions: object[] | null; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 8) {
    return { conditions: null, error: "1 à 8 conditions requises" };
  }
  const out = [];
  for (const c of raw) {
    const field = c?.field;
    const operator = c?.operator;
    const allowedOps = FIELD_OPERATORS[field];
    if (!allowedOps || !allowedOps.includes(operator)) {
      return { conditions: null, error: `Condition invalide : ${field}/${operator}` };
    }
    if (field === "funnel_step") {
      if (typeof c.funnel_id !== "string" || !Number.isInteger(c.step)) {
        return { conditions: null, error: "funnel_step nécessite funnel_id et step" };
      }
      out.push({ field, operator: operator === "reached" ? "reached" : "dropped", funnel_id: c.funnel_id, step: c.step });
      continue;
    }
    if (["gt", "gte", "lt", "lte"].includes(operator)) {
      const value = Number(c.value);
      if (!Number.isFinite(value)) return { conditions: null, error: `Valeur numérique requise pour ${field}` };
      out.push({ field, operator, value });
      continue;
    }
    if (["eq", "contains"].includes(operator)) {
      const value = typeof c.value === "string" ? c.value.trim().slice(0, 100) : "";
      if (!value) return { conditions: null, error: `Valeur requise pour ${field}` };
      out.push({ field, operator, value });
      continue;
    }
    // exists / not_exists — no value needed
    out.push({ field, operator });
  }
  return { conditions: out };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  // No .eq("user_id", user.id) on a sites check here — RLS on cohorts
  // itself (has_account_access) already scopes the result correctly.
  const { data, error } = await supabase
    .from("cohorts")
    .select("id, name, conditions, match, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ cohorts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const siteId = typeof body.site_id === "string" ? body.site_id : null;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  const match = body.match === "OR" ? "OR" : "AND";

  if (!siteId || !name) {
    return NextResponse.json({ error: "site_id and name are required" }, { status: 400 });
  }

  const { conditions, error: condError } = sanitizeConditions(body.conditions);
  if (condError) return NextResponse.json({ error: condError }, { status: 400 });

  const { data, error } = await supabase
    .from("cohorts")
    .insert({ site_id: siteId, name, conditions, match })
    .select("id, name, conditions, match, created_at")
    .single();

  // RLS (site_id must resolve to an accessible site) turns an attempt
  // to save against a foreign site into a clean insert failure here.
  if (error) return NextResponse.json({ error: "Could not save cohort" }, { status: 500 });

  return NextResponse.json(data);
}
