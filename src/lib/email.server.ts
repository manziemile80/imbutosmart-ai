// Delivery of the farmer's summary by email.
//
// Three channels, all configured with server-only variables, and none of them
// hardcoded into the page. They are tried in the order below and the next one
// carries the message when the previous one cannot:
//
//   1. An HTTP provider accepting the Resend-style JSON body
//      `{ from, to, subject, text }`:
//        EMAIL_API_URL  the endpoint (default https://api.resend.com/emails)
//        EMAIL_API_KEY  the credential, sent as a bearer token
//
//   2. Brevo, whose free account verifies one sender address instead of asking
//      for a domain of your own, and then sends to any address (300 a day):
//        EMAIL_BREVO_API_KEY  the credential, sent as `api-key`
//
//   3. A mailbox that sends on the app's behalf over SMTP, which also reaches
//      any address without owning a domain (a Gmail app password, for example):
//        EMAIL_SMTP_HOST      default smtp.gmail.com
//        EMAIL_SMTP_PORT      default 465 (TLS); 587 starts with STARTTLS
//        EMAIL_SMTP_USER      the mailbox address
//        EMAIL_SMTP_PASSWORD  an app password, never the account password
//
//   EMAIL_FROM  the sender, e.g. "ImbutoSmart <summary@example.com>". It must be
//               a sender the chosen service has verified. Defaults to the SMTP
//               mailbox when only that channel is configured.
//
// A provider that only accepts its own address — a test sender before a sending
// domain is verified, for instance — is simply the first channel that fails: the
// next channel still delivers the same summary to the farmer's own address. With
// no channel configured the service is unavailable, and the page hands the same
// complete summary to the farmer's own mail app instead. A delivery that fails
// everywhere is treated the same way, so the farmer always has a way to send.

import nodemailer from "nodemailer";

const DEFAULT_EMAIL_API_URL = "https://api.resend.com/emails";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_SMTP_HOST = "smtp.gmail.com";
const DEFAULT_SMTP_PORT = 465;
const EMAIL_TIMEOUT_MS = 10_000;

export type EmailDelivery = "sent" | "unavailable" | "failed";

type Message = { to: string; subject: string; text: string };

type ApiConfig = { endpoint: string; key: string; from: string };

type BrevoConfig = { key: string; from: string };

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

function brevoConfig(): BrevoConfig | null {
  const key = process.env["EMAIL_BREVO_API_KEY"]?.trim();
  const from = process.env["EMAIL_FROM"]?.trim();
  if (!key || !from) return null;
  return { key, from };
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
  return Boolean(apiConfig() || brevoConfig() || smtpConfig());
}

// "ImbutoSmart <summary@example.com>" is one sender with a display name; a bare
// address is the same sender without one.
function senderParts(from: string): { email: string; name?: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  if (!match) return { email: from.trim() };
  const name = (match[1] ?? "").trim();
  return { email: (match[2] ?? "").trim(), ...(name ? { name } : {}) };
}

// A provider's refusal is the host's problem, not the farmer's, so the reason is
// written to the server log: an unverified sender or an address the test service
// does not accept is fixed in the mail configuration.
async function refuse(provider: string, response: Response): Promise<EmailDelivery> {
  const reason = await response.text().catch(() => "");
  const detail = reason.replace(/\s+/g, " ").trim().slice(0, 300);
  console.error(
    `[email] ${provider} refused the summary email (${response.status})${
      detail ? `: ${detail}` : "."
    }`,
  );
  return "failed";
}

function timeoutSignal(): AbortSignal | null {
  return typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(EMAIL_TIMEOUT_MS) : null;
}

async function sendThroughApi(config: ApiConfig, input: Message): Promise<EmailDelivery> {
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
      signal: timeoutSignal(),
    });
    if (!response.ok) return refuse("the provider", response);
    return "sent";
  } catch {
    console.error("[email] the provider could not be reached.");
    return "failed";
  }
}

async function sendThroughBrevo(config: BrevoConfig, input: Message): Promise<EmailDelivery> {
  const sender = senderParts(config.from);
  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": config.key,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: input.text,
      }),
      signal: timeoutSignal(),
    });
    if (!response.ok) return refuse("Brevo", response);
    return "sent";
  } catch {
    console.error("[email] Brevo could not be reached.");
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
  const brevo = brevoConfig();
  const smtp = smtpConfig();
  if (!api && !brevo && !smtp) return "unavailable";

  if (api && (await sendThroughApi(api, input)) === "sent") return "sent";
  if (brevo && (await sendThroughBrevo(brevo, input)) === "sent") return "sent";
  if (smtp && (await sendThroughSmtp(smtp, input)) === "sent") return "sent";

  return "failed";
}
