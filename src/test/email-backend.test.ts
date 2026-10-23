import { afterEach, describe, expect, it, vi } from "vitest";

import { sendSummaryEmail } from "../lib/email.server";

// Email delivery is server-only configuration and fetch logic, so it can be
// exercised directly with a stubbed fetch.
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env["EMAIL_API_URL"];
  delete process.env["EMAIL_API_KEY"];
  delete process.env["EMAIL_FROM"];
  vi.restoreAllMocks();
});

function configured() {
  process.env["EMAIL_API_URL"] = "https://mail.example.test/send";
  process.env["EMAIL_API_KEY"] = "test-key";
  process.env["EMAIL_FROM"] = "ImbutoSmart <summary@example.test>";
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

  it("reports an unreachable provider without throwing", async () => {
    configured();
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sendSummaryEmail(message)).toBe("failed");
  });
});
