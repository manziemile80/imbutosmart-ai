import { afterEach, describe, expect, it, vi } from "vitest";
import { answerWithAi } from "../lib/ai/chat.server";

// The chat gateway is server-only, but it is pure configuration and fetch
// logic, so it can be exercised directly with a stubbed fetch.
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env["AI_BASE_URL"];
  delete process.env["AI_API_KEY"];
  delete process.env["AI_MODEL"];
  vi.restoreAllMocks();
});

// A streaming chat completion, the shape the backend sends.
function completion(text: string): string {
  const chunk = (delta: Record<string, unknown>) =>
    `data: ${JSON.stringify({
      id: "1",
      object: "chat.completion.chunk",
      created: 1,
      model: "test",
      choices: [{ index: 0, delta, finish_reason: null }],
    })}\n\n`;
  const stop = `data: ${JSON.stringify({
    id: "1",
    object: "chat.completion.chunk",
    created: 1,
    model: "test",
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  })}\n\n`;
  return `${chunk({ role: "assistant", content: text })}${stop}data: [DONE]\n\n`;
}

function configured() {
  process.env["AI_BASE_URL"] = "https://example.test/v1";
  process.env["AI_API_KEY"] = "test-key";
  process.env["AI_MODEL"] = "test-model";
}

describe("chat gateway", () => {
  it("answers after a dropped connection, without showing the farmer an error", async () => {
    // A weak connection drops the first request; the answer still arrives.
    configured();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("fetch failed");
      return new Response(completion("Maize needs good drainage."), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as typeof fetch;

    const result = await answerWithAi(undefined, "system", [{ role: "user", content: "hello" }]);
    expect(result.error).toBeNull();
    expect(result.answer).toContain("drainage");
    expect(calls).toBe(2);
  });

  it("waits and tries again when the backend is rate limiting", async () => {
    // A free provider limits how many tokens it serves a minute, so the
    // answer still arrives instead of a "please try again".
    configured();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          JSON.stringify({ error: { message: "Rate limit reached", code: "rate_limit_exceeded" } }),
          { status: 429, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(completion("Maize needs good drainage."), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as typeof fetch;

    const result = await answerWithAi(undefined, "system", [{ role: "user", content: "hello" }]);
    expect(result.error).toBeNull();
    expect(result.answer).toContain("drainage");
    expect(calls).toBe(2);
  });

  it("reports a stable error when the backend cannot be reached at all", async () => {    configured();
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    const result = await answerWithAi(undefined, "system", [{ role: "user", content: "hello" }]);
    expect(result.answer).toBe("");
    expect(result.error).toBe("failed");
  });

  it("reports that it is not configured when no endpoint or key is set", async () => {
    const result = await answerWithAi(undefined, "system", [{ role: "user", content: "hello" }]);
    expect(result.error).toBe("unconfigured");
  });
});
