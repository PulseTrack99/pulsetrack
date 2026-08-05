import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service-level client for ingestion (no auth needed — events come from visitors)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple in-memory rate limiter (per IP, 100 events/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Parse country from headers (Vercel/Cloudflare provide this)
function getCountry(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "Unknown"
  );
}

// Parse device type from User-Agent
function getDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipod/i.test(ua)) return "Mobile";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  return "Desktop";
}

// Parse browser from User-Agent
function getBrowser(ua: string): string {
  if (/firefox/i.test(ua)) return "Firefox";
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  if (/opera|opr/i.test(ua)) return "Opera";
  return "Other";
}

// Parse referrer source
function getSource(referrer: string | null): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace("www.", "");
    const sourceMap: Record<string, string> = {
      "google.com": "Google",
      "google.fr": "Google",
      "bing.com": "Bing",
      "duckduckgo.com": "DuckDuckGo",
      "facebook.com": "Facebook",
      "instagram.com": "Instagram",
      "twitter.com": "X (Twitter)",
      "x.com": "X (Twitter)",
      "linkedin.com": "LinkedIn",
      "reddit.com": "Reddit",
      "youtube.com": "YouTube",
      "t.co": "X (Twitter)",
    };
    return sourceMap[host] || host;
  } catch {
    return "Unknown";
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limited" },
        { status: 429, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Parse body (supports both JSON and sendBeacon text)
    let body;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = JSON.parse(text);
    }

    const {
      site_id,
      type,
      url,
      path,
      referrer,
      title,
      screen_width,
      language,
      session_id,
      utm,
      duration,
      event_name,
      event_props,
    } = body;

    // Validate required fields
    if (!site_id || !type || !path) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Verify that site_id exists
    const { data: site } = await supabase
      .from("sites")
      .select("id, domain")
      .eq("id", site_id)
      .single();

    if (!site) {
      return NextResponse.json(
        { error: "Invalid site_id" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const ua = req.headers.get("user-agent") || "";
    const country = getCountry(req);

    // Insert event
    const { error } = await supabase.from("events").insert({
      site_id,
      type,
      url,
      path,
      referrer,
      title,
      source: utm?.utm_source || getSource(referrer),
      utm_medium: utm?.utm_medium || null,
      utm_campaign: utm?.utm_campaign || null,
      country,
      device: getDeviceType(ua),
      browser: getBrowser(ua),
      screen_width,
      language,
      session_id,
      duration: duration || null,
      event_name: event_name || null,
      event_props: event_props || null,
      ip_hash: ip ? Buffer.from(ip).toString("base64").slice(0, 16) : null,
    });

    if (error) {
      console.error("Failed to insert event:", error);
      return NextResponse.json(
        { error: "Insert failed" },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("Track error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
