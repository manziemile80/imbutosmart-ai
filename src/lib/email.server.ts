// Delivery of the farmer's summary by email.
//
// The provider is never hardcoded: any endpoint that accepts the Resend-style
// JSON body `{ from, to, subject, text }` works. Configuration is server-only:
//
//   EMAIL_API_URL  the endpoint (default https://api.resend.com/emails)
//   EMAIL_API_KEY  the credential, sent as a bearer token
//   EMAIL_FROM     the verified sender, e.g. "ImbutoSmart <summary@example.com>"
//
// With no key or sender the service is simply unavailable, and the page hands
// the same complete summary to the farmer's own mail app instead. A delivery
// that fails is treated the same way, so the farmer always has a way to send.

const DEFAULT_EMAIL_API_URL = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 10_000;

export type EmailDelivery = "sent" | "unavailable" | "failed";

export function isEmailConfigured(): boolean {
  return Boolean(process.env["EMAIL_API_KEY"]?.trim() && process.env["EMAIL_FROM"]?.trim());
}

export async function sendSummaryEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailDelivery> {
  const key = process.env["EMAIL_API_KEY"]?.trim();
  const from = process.env["EMAIL_FROM"]?.trim();
  if (!key || !from) return "unavailable";

  const endpoint = process.env["EMAIL_API_URL"]?.trim() || DEFAULT_EMAIL_API_URL;
  const signal =
    typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(EMAIL_TIMEOUT_MS) : undefined;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
      signal: signal ?? null,
    });
    if (!response.ok) {
      // The reason belongs to whoever runs the deployment, not to the farmer.
      console.error(`[email] the provider refused the summary email (${response.status}).`);
      return "failed";
    }
    return "sent";
  } catch {
    console.error("[email] the provider could not be reached.");
    return "failed";
  }
}
