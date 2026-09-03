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
      // pulsetrack.eu verified on Resend (SPF/DKIM/DMARC) — branded
      // sender instead of the resend.dev sandbox address.
      from: "PulseTrack <alerts@pulsetrack.eu>",
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
