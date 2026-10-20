import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpeechConfig } from "../lib/ai/speech.server";

// The speech gateway is server-only, but it is pure configuration and fetch
// logic, so it can be exercised directly with a stubbed fetch.
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env["AI_SPEECH_BASE_URL"];
  delete process.env["AI_SPEECH_API_KEY"];
  delete process.env["AI_API_KEY"];
  delete process.env["AI_SPEECH_LANGUAGES"];
  delete process.env["AI_TTS_FORMAT"];
  delete process.env["AI_TTS_MAX_CHARS"];
  vi.restoreAllMocks();
});

describe("speech gateway", () => {
  it("reports nothing configured when no endpoint or key is set", () => {
    expect(getSpeechConfig()).toBeNull();
  });

  it("treats an explicitly configured endpoint as configured without a key", () => {
    process.env["AI_SPEECH_BASE_URL"] = "https://api.groq.com/openai/v1";
    expect(getSpeechConfig()).toEqual({ configured: true, spokenLanguages: ["en", "rw", "fr"] });
  });

  it("reports only the languages the deployment declares the backend can speak", () => {
    process.env["AI_SPEECH_BASE_URL"] = "https://api.groq.com/openai/v1";
    process.env["AI_SPEECH_LANGUAGES"] = "en";
    expect(getSpeechConfig()?.spokenLanguages).toEqual(["en"]);
  });

  it("ignores unknown languages in the declaration", () => {
    process.env["AI_SPEECH_BASE_URL"] = "https://api.groq.com/openai/v1";
    process.env["AI_SPEECH_LANGUAGES"] = "en,xx,rw";
    expect(getSpeechConfig()?.spokenLanguages).toEqual(["en", "rw"]);
  });

  it("splits a long answer into clips the speech model can accept", async () => {
    process.env["AI_SPEECH_BASE_URL"] = "https://api.groq.com/openai/v1";
    process.env["AI_TTS_MAX_CHARS"] = "40";
    const requests: string[] = [];
    globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
      requests.push(String(init.body));
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/wav" } });
    }) as typeof fetch;

    const { synthesizeSpeech } = await import("../lib/ai/speech.server");
    const result = await synthesizeSpeech(undefined, "One two three four five six seven eight nine ten.", "en");
    expect(result.error).toBeNull();
    expect(result.audios.length).toBeGreaterThan(1);
    expect(result.mimeType).toBe("audio/wav");
    expect(requests.length).toBe(result.audios.length);
  });

  it("sends one request when no length limit is set", async () => {
    process.env["AI_SPEECH_BASE_URL"] = "https://api.groq.com/openai/v1";
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "audio/mpeg" } });
    }) as typeof fetch;

    const { synthesizeSpeech } = await import("../lib/ai/speech.server");
    const result = await synthesizeSpeech(undefined, "A short answer.", "en");
    expect(result.audios).toHaveLength(1);
    expect(calls).toBe(1);
  });

  it("reports a request the backend cannot serve as unavailable", async () => {
    process.env["AI_SPEECH_BASE_URL"] = "https://api.groq.com/openai/v1";
    globalThis.fetch = (async () => new Response("nope", { status: 402 })) as typeof fetch;

    const { synthesizeSpeech } = await import("../lib/ai/speech.server");
    const result = await synthesizeSpeech(undefined, "A short answer.", "en");
    expect(result.error).toBe("unavailable");
    expect(result.audios).toHaveLength(0);
  });

  it("reports a broken request as a plain failure", async () => {
    process.env["AI_SPEECH_BASE_URL"] = "https://api.groq.com/openai/v1";
    globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;

    const { synthesizeSpeech } = await import("../lib/ai/speech.server");
    const result = await synthesizeSpeech(undefined, "A short answer.", "en");
    expect(result.error).toBe("failed");
    expect(result.audios).toHaveLength(0);
  });
});
