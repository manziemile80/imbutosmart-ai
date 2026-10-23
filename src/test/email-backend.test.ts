import { afterEach, describe, expect, it, vi } from "vitest";

const mailer = vi.hoisted(() => ({ sendMail: vi.fn(), createTransport: vi.fn() }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mailer.createTransport.mockImplementation(() => ({
      sendMail: mailer.sendMail,
    })),
  },
}));

import { sendSummaryEmail } from "../lib/email.server";

// Email delivery is server-only configuration and fetch/SMTP logic, so it can
// be exercised directly with a stubbed provider and a stubbed mailbox.
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env["EMAIL_API_URL"];
  delete process.env["EMAIL_API_KEY"];
  delete process.env["EMAIL_FROM"];
  delete process.env["EMAIL_SMTP_HOST"];
  delete process.env["EMAIL_SMTP_PORT"];
  delete process.env["EMAIL_SMTP_USER"];
  delete process.env["EMAIL_SMTP_PASSWORD"];
  mailer.sendMail.mockReset();
  mailer.createTransport.mockClear();
  vi.restoreAllMocks();
});

function configured() {
  process.env["EMAIL_API_URL"] = "https://mail.example.test/send";
  process.env["EMAIL_API_KEY"] = "test-key";
  process.env["EMAIL_FROM"] = "ImbutoSmart <summary@example.test>";
}

function mailbox() {
  process.env["EMAIL_SMTP_USER"] = "grower@example.test";
  process.env["EMAIL_SMTP_PASSWORD"] = "app-password";
}

const message = {
  to: "farmer@example.com",
  subject: "Your summary — Musanze",
  text: "Hello Aline,\n\nYour field: Musanze · Volcanic · Season A",
};

describe("summary email delivery", () => {
  it("is unavailable without a credential, so the page offers the mail app", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await sendSummaryEmail(message)).toBe("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mailer.createTransport).not.toHaveBeenCalled();
  });

  it("sends the whole summary to the address the farmer gave", async () => {
    configured();
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await sendSummaryEmail(message)).toBe("sent");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://mail.example.test/send");
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer test-key");

    const body = JSON.parse(String(init.body)) as {
      from: string;
      to: string[];
      subject: string;
      text: string;
    };
    expect(body.from).toBe("ImbutoSmart <summary@example.test>");
    expect(body.to).toEqual(["farmer@example.com"]);
    expect(body.subject).toBe("Your summary — Musanze");
    expect(body.text).toContain("Hello Aline,");
    expect(body.text).toContain("Your field: Musanze");
  });

  it("reports a failed delivery without throwing", async () => {
    configured();
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 422 })) as unknown as typeof fetch;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sendSummaryEmail(message)).toBe("failed");
    expect(logged).toHaveBeenCalled();
  });

  it("writes the provider's own reason to the server log", async () => {
    configured();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message:
            "You can only send testing emails to your own email address (owner@example.test).",
          name: "validation_error",
        }),
        { status: 403 },
      ),
    ) as unknown as typeof fetch;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sendSummaryEmail(message)).toBe("failed");
    // The farmer is not shown the reason, but the host can act on it: a refused
    // sender or an unaccepted address is fixed in the mail configuration.
    expect(String(logged.mock.calls[0]?.[0])).toContain("own email address");
  });

  it("reports an unreachable provider without throwing", async () => {
    configured();
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sendSummaryEmail(message)).toBe("failed");
  });

  it("sends from a configured mailbox, so any address can receive the summary", async () => {
    mailbox();
    mailer.sendMail.mockResolvedValue({ messageId: "1" });

    expect(await sendSummaryEmail(message)).toBe("sent");

    const [config] = mailer.createTransport.mock.calls[0] as [
      { host: string; port: number; secure: boolean; auth: { user: string } },
    ];
    expect(config.host).toBe("smtp.gmail.com");
    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
    expect(config.auth.user).toBe("grower@example.test");

    const [sent] = mailer.sendMail.mock.calls[0] as [
      { from: string; to: string; subject: string; text: string },
    ];
    expect(sent.from).toBe("ImbutoSmart <grower@example.test>");
    expect(sent.to).toBe("farmer@example.com");
    expect(sent.text).toContain("Your field: Musanze");
  });

  it("lets the mailbox carry the message when the provider refuses it", async () => {
    configured();
    mailbox();
    mailer.sendMail.mockResolvedValue({ messageId: "1" });
    // The usual test-sender answer: this address is not the account owner's.
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ message: "You can only send testing emails to your own address." }),
        {
          status: 403,
        },
      ),
    ) as unknown as typeof fetch;
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sendSummaryEmail(message)).toBe("sent");
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
  });

  it("reports a mailbox that cannot send, without printing the password", async () => {
    mailbox();
    mailer.sendMail.mockRejectedValue(new Error("Invalid login: 535-5.7.8"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sendSummaryEmail(message)).toBe("failed");
    expect(String(logged.mock.calls[0]?.[0])).toContain("Invalid login");
    expect(String(logged.mock.calls[0]?.[0])).not.toContain("app-password");
  });

  it("starts in the clear only when the port asks for it", async () => {
    mailbox();
    process.env["EMAIL_SMTP_PORT"] = "587";
    mailer.sendMail.mockResolvedValue({ messageId: "1" });

    expect(await sendSummaryEmail(message)).toBe("sent");

    const [config] = mailer.createTransport.mock.calls[0] as [{ port: number; secure: boolean }];
    expect(config.port).toBe(587);
    expect(config.secure).toBe(false);
  });
});
