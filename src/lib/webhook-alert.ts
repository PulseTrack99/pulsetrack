/**
 * Slack/Discord delivery for the traffic-drop alert (src/app/api/cron/
 * check-alerts) — a second channel alongside the existing email, not
 * a replacement. One "webhook_url" field (supabase migration
 * alert_webhook_url): the platform is auto-detected from the URL's
 * host rather than asking the user to pick one, since Slack and
 * Discord incoming-webhook URLs are each unambiguous by domain.
 */

type WebhookPlatform = "slack" | "discord" | "unknown";

function detectPlatform(url: string): WebhookPlatform {
  try {
    const host = new URL(url).hostname;
    if (host === "hooks.slack.com") return "slack";
    if (host === "discord.com" || host === "discordapp.com") return "discord";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export interface WebhookAlertParams {
  webhookUrl: string;
  siteName: string;
  domain: string;
  dropPct: number;
  todayCount: number;
  lastWeekCount: number;
  dashboardUrl: string;
}

export async function sendWebhookAlert(params: WebhookAlertParams): Promise<void> {
  const { webhookUrl, siteName, domain, dropPct, todayCount, lastWeekCount, dashboardUrl } = params;
  const platform = detectPlatform(webhookUrl);

  const message = `⚠️ *Chute de trafic sur ${siteName}* (${domain})\nLe trafic a chuté de *${dropPct}%* par rapport à la même période la semaine dernière.\n${todayCount} visiteurs sur les dernières 24h, contre ${lastWeekCount} la semaine précédente.\n<${dashboardUrl}|Voir le dashboard>`;

  // Slack blocks and Discord embeds each have their own shape — kept
  // as two small literal payloads rather than one abstraction, since
  // there's nothing to actually share beyond the same three numbers.
  const body =
    platform === "discord"
      ? {
          embeds: [
            {
              title: `⚠️ Chute de trafic sur ${siteName}`,
              description: `Le trafic a chuté de **${dropPct}%** par rapport à la même période la semaine dernière.\n\n${todayCount} visiteurs sur les dernières 24h, contre ${lastWeekCount} la semaine précédente.`,
              url: dashboardUrl,
              color: 0xd64545,
            },
          ],
        }
      : // Slack's mrkdwn also degrades gracefully as plain-ish text on
        // any other webhook-compatible receiver (e.g. Mattermost) that
        // accepts a bare {text: "..."} payload.
        { text: message };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Webhook delivery failed (${res.status}): ${errBody}`);
  }
}
