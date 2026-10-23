// Delivery of the farmer's summary by email.
//
// Two channels, both configured with server-only variables, and neither is
// hardcoded into the page:
//
//   1. An HTTP provider accepting the Resend-style JSON body
//      `{ from, to, subject, text }`:
//        EMAIL_API_URL  the endpoint (default https://api.resend.com/emails)
//        EMAIL_API_KEY  the credential, sent as a bearer token
//
//   2. A mailbox that sends on the app's behalf over SMTP, which reaches any
//      address without owning a domain (a Gmail app password, for example):
//        EMAIL_SMTP_HOST      default smtp.gmail.com
//        EMAIL_SMTP_PORT      default 465 (TLS); 587 starts with STARTTLS
//        EMAIL_SMTP_USER      the mailbox address
//        EMAIL_SMTP_PASSWORD  an app password, never the account password
//
//   EMAIL_FROM  the sender, e.g. "ImbutoSmart <summary@example.com>". Defaults
//               to the SMTP mailbox when only that channel is configured.
//
// The HTTP provider answers for a farm most of the time, so it is tried first
// and SMTP carries the message when it cannot — a test sender that only accepts
// its own address, for instance. With neither channel configured the service is
// simply unavailable, and the page hands the same complete summary to the
// farmer's own mail app instead. A delivery that fails is treated the same way,
// so the farmer always has a way to send.

import nodemailer from "nodemailer";

const DEFAULT_EMAIL_API_URL = "https://api.resend.com/emails";
const DEFAULT_SMTP_HOST = "smtp.gmail.com";
const DEFAULT_SMTP_PORT = 465;
const EMAIL_TIMEOUT_MS = 10_000;

export type EmailDelivery = "sent" | "unavailable" | "failed";

type Message = { to: string; subject: string; text: string };

type ApiConfig = { endpoint: string; key: string; from: string };

type SmtpConfig = { host: string; port: number; user: string; password: string; from: string };

function apiConfig(): ApiConfig | null {
  const key = process.env["EMAIL_API_KEY"]?.trim();
  const from = process.env["EMAIL_FROM"]?.trim();
  if (!key || !from) return null;
  return {
    endpoint: process.env["EMAIL_API_URL"]?.trim() || DEFAULT_EMAIL_API_URL,
    key,
    from,
  };
}

function smtpConfig(): SmtpConfig | null {
  const user = process.env["EMAIL_SMTP_USER"]?.trim();
  const password = process.env["EMAIL_SMTP_PASSWORD"]?.trim();
  if (!user || !password) return null;
  const port = Number(process.env["EMAIL_SMTP_PORT"]?.trim() || DEFAULT_SMTP_PORT);
  return {
    host: process.env["EMAIL_SMTP_HOST"]?.trim() || DEFAULT_SMTP_HOST,
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_SMTP_PORT,
    user,
    password,
    from: process.env["EMAIL_FROM"]?.trim() || `ImbutoSmart <${user}>`,
  };
}

export function isEmailConfigured(): boolean {
  return Boolean(apiConfig() || smtpConfig());
}

// A provider's refusal is the host's problem, not the farmer's, so the reason
// is written to the server log: an unverified sender or an address the test
// service does not accept is fixed in the mail configuration.
async function sendThroughApi(config: ApiConfig, input: Message): Promise<EmailDelivery> {
  const signal =
    typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(EMAIL_TIMEOUT_MS) : undefined;

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
      signal: signal ?? null,
    });
    if (!response.ok) {
      const reason = await response.text().catch(() => "");
      const detail = reason.replace(/\s+/g, " ").trim().slice(0, 300);
      console.error(
        `[email] the provider refused the summary email (${response.status})${
          detail ? `: ${detail}` : "."
        }`,
      );
      return "failed";
    }
    return "sent";
  } catch {
    console.error("[email] the provider could not be reached.");
    return "failed";
  }
}

async function sendThroughSmtp(config: SmtpConfig, input: Message): Promise<EmailDelivery> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: EMAIL_TIMEOUT_MS,
      greetingTimeout: EMAIL_TIMEOUT_MS,
      socketTimeout: EMAIL_TIMEOUT_MS,
    });
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return "sent";
  } catch (error) {
    const detail = String((error as { message?: string } | null)?.message ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    console.error(`[email] the mailbox could not send the summary${detail ? `: ${detail}` : "."}`);
    return "failed";
  }
}

export async function sendSummaryEmail(input: Message): Promise<EmailDelivery> {
  const api = apiConfig();
  const smtp = smtpConfig();
  if (!api && !smtp) return "unavailable";

  if (api && (await sendThroughApi(api, input)) === "sent") return "sent";
  if (smtp && (await sendThroughSmtp(smtp, input)) === "sent") return "sent";

  return "failed";
}
