/**
 * Transactional email via Resend's REST API directly (no SDK — one
 * fetch call doesn't need a dependency), matching how the AI copilot
 * calls Anthropic's API without pulling in a client library either.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // resend.dev needs no domain verification — good enough until
      // a branded sending domain (e.g. alertes@pulsetrack.io) is set up.
      from: "PulseTrack <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
