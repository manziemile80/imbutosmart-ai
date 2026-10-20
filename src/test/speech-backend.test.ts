import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpeechConfig, getSpeechProvider } from "../lib/ai/speech.server";
import { ELEVENLABS_SPOKEN_LANGUAGES, getElevenLabsConfig } from "../lib/ai/elevenlabs.server";

// The speech gateway is server-only, but it is pure configuration and fetch
// logic, so it can be exercised directly with a stubbed fetch.
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env["AI_SPEECH_PROVIDER"];
  delete process.env["ELEVENLABS_API_KEY"];
  delete process.env["ELEVENLABS_VOICE_ID"];
  delete process.env["ELEVENLABS_TTS_MODEL"];
  delete process.env["AI_API_KEY"];
  delete process.env["AI_SPEECH_BASE_URL"];
  vi.restoreAllMocks();
});

describe("speech provider selection", () => {
  it("defaults to the OpenAI-compatible backend", () => {
    expect(getSpeechProvider()).toBe("openai");
  });

  it("selects a named provider from the environment", () => {
    process.env["AI_SPEECH_PROVIDER"] = "ElevenLabs";
    expect(getSpeechProvider()).toBe("elevenlabs");
  });

  it("keeps every farmer language available on an OpenAI-compatible backend", () => {
    process.env["AI_API_KEY"] = "test-key";
    expect(getSpeechConfig()).toEqual({ configured: true, spokenLanguages: ["en", "rw", "fr"] });
  });

  it("reports nothing configured when no credential is set", () => {
    expect(getSpeechConfig()).toBeNull();
  });
});

describe("elevenlabs configuration", () => {
  it("needs a credential before it can be used", () => {
    expect(getElevenLabsConfig()).toBeNull();
    process.env["ELEVENLABS_API_KEY"] = "sk_test";
    expect(getElevenLabsConfig()?.apiKey).toBe("sk_test");
  });

  it("reads the endpoint, models and voice from the environment", () => {
    process.env["ELEVENLABS_API_KEY"] = "sk_test";
    process.env["ELEVENLABS_VOICE_ID"] = "voice-123";
    process.env["ELEVENLABS_TTS_MODEL"] = "eleven_v4";
    const config = getElevenLabsConfig();
    expect(config?.voiceId).toBe("voice-123");
    expect(config?.ttsModel).toBe("eleven_v4");
    expect(config?.baseURL).toMatch(/^https:\/\//);
  });

  it("does not offer spoken Kinyarwanda, which the models do not support", () => {
    process.env["AI_SPEECH_PROVIDER"] = "elevenlabs";
    process.env["ELEVENLABS_API_KEY"] = "sk_test";
    const status = getSpeechConfig();
    expect(status?.configured).toBe(true);
    expect(status?.spokenLanguages).toEqual(ELEVENLABS_SPOKEN_LANGUAGES);
    expect(status?.spokenLanguages).not.toContain("rw");
    expect(status?.spokenLanguages).toContain("en");
    expect(status?.spokenLanguages).toContain("fr");
  });
});
