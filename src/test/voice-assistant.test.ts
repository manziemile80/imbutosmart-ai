import { describe, expect, it } from "vitest";
import {
  buildVoiceSystemPrompt,
  guideSpokenText,
  isSupportedAudioType,
  MAX_AUDIO_BASE64_CHARS,
  MAX_SPEECH_TEXT,
  speechInputSchema,
  synthesisInputSchema,
  voiceCopy,
  voiceGuide,
  VOICE_LANGUAGES,
} from "../lib/voice-assistant";

describe("voice assistant contract", () => {
  it("supports exactly English, Kinyarwanda, and French", () => {
    expect(VOICE_LANGUAGES).toEqual(["en", "rw", "fr"]);
    expect(synthesisInputSchema.shape.language.removeDefault().options).toEqual(["en", "rw", "fr"]);
  });

  it("defaults speech and synthesis language to English", () => {
    expect(speechInputSchema.parse({ mimeType: "audio/webm;codecs=opus", audioBase64: "AAAA" }).language).toBe("en");
    expect(synthesisInputSchema.parse({ text: "Hello" }).language).toBe("en");
  });

  it("accepts common recorder formats and rejects others", () => {
    expect(isSupportedAudioType("audio/webm;codecs=opus")).toBe(true);
    expect(isSupportedAudioType("audio/mp4")).toBe(true);
    expect(isSupportedAudioType("video/mp4")).toBe(false);
    expect(speechInputSchema.safeParse({ mimeType: "application/json", audioBase64: "AAAA" }).success).toBe(false);
  });

  it("rejects empty and oversized speech and synthesis input", () => {
    expect(speechInputSchema.safeParse({ mimeType: "audio/webm", audioBase64: "   " }).success).toBe(false);
    expect(speechInputSchema.safeParse({ mimeType: "audio/webm", audioBase64: "a".repeat(MAX_AUDIO_BASE64_CHARS + 1) }).success).toBe(false);
    expect(synthesisInputSchema.safeParse({ text: "   " }).success).toBe(false);
    expect(synthesisInputSchema.safeParse({ text: "a".repeat(MAX_SPEECH_TEXT + 1) }).success).toBe(false);
  });

  it("offers the information checklist and copy in every language", () => {
    for (const language of VOICE_LANGUAGES) {
      expect(voiceGuide(language).length).toBeGreaterThan(0);
      expect(voiceCopy[language].heading.length).toBeGreaterThan(0);
      expect(Object.keys(voiceCopy[language].notices).sort()).toEqual(
        ["denied", "empty", "failed", "no-speech", "unconfigured", "unsupported"],
      );
    }
  });

  it("builds spoken guide text that includes every item title", () => {
    const spoken = guideSpokenText("fr");
    for (const item of voiceGuide("fr")) {
      expect(spoken).toContain(item.title);
    }
  });

  it("builds a language-specific voice prompt about needed information", () => {
    const prompt = buildVoiceSystemPrompt("rw", "Musanze", "Volcanic");
    expect(prompt).toContain("Kinyarwanda");
    expect(prompt).toContain("Musanze");
    expect(prompt).toContain("information the farmer needs");
    expect(prompt).toContain("Never invent");
  });
});
