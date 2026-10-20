import { DEFAULT_AI_BASE_URL } from "./chat.server";
import type { SpeechAudio, SpeechResult } from "./speech";

// Server-only transport for an OpenAI-compatible speech endpoint, which serves
// speech-to-text at /audio/transcriptions and text-to-speech at /audio/speech.
// Every value comes from the environment, so no provider, gateway, or
// credential is baked in here.

export const DEFAULT_STT_MODEL = "whisper-1";
export const DEFAULT_TTS_MODEL = "tts-1";
export const DEFAULT_TTS_VOICE = "alloy";
export const DEFAULT_TTS_FORMAT = "mp3";

export type SpeechConfig = {
  baseURL: string;
  apiKey: string;
  sttModel: string;
  ttsModel: string;
  ttsVoice: string;
  ttsFormat: string;
};

export function getOpenAiSpeechConfig(): SpeechConfig | null {
  // Speech can run against its own backend (e.g. a free self-hosted STT/TTS
  // server) that is separate from the chat backend, so voice keeps working even
  // when the chat provider is unset. Both fall back to the shared AI_* values so
  // a single-provider setup needs no extra configuration.
  const explicitBase = process.env["AI_SPEECH_BASE_URL"]?.trim();
  const baseURL = (explicitBase || process.env["AI_BASE_URL"]?.trim() || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
  const apiKey =
    process.env["AI_SPEECH_API_KEY"]?.trim() ||
    process.env["AI_API_KEY"]?.trim() ||
    process.env["OPENAI_API_KEY"]?.trim();
  // A self-hosted speech server typically ignores auth, but the client still
  // expects a non-empty key. When a dedicated speech base URL is configured
  // without a key, send a placeholder so voice works with zero credentials.
  if (!apiKey && !explicitBase) return null;
  const sttModel = process.env["AI_STT_MODEL"]?.trim() || DEFAULT_STT_MODEL;
  const ttsModel = process.env["AI_TTS_MODEL"]?.trim() || DEFAULT_TTS_MODEL;
  const ttsVoice = process.env["AI_TTS_VOICE"]?.trim() || DEFAULT_TTS_VOICE;
  // Some speech models only accept one audio format, so it is configurable.
  const ttsFormat = process.env["AI_TTS_FORMAT"]?.trim() || DEFAULT_TTS_FORMAT;
  return { baseURL, apiKey: apiKey || "not-needed", sttModel, ttsModel, ttsVoice, ttsFormat };
}

// Transcribes a short recording into text. The audio arrives base64-encoded from
// the browser recorder and is re-wrapped as multipart form data.
export async function transcribeOpenAiAudio(
  signal: AbortSignal | undefined,
  audioBase64: string,
  mimeType: string,
  language: string,
): Promise<SpeechResult> {
  const config = getOpenAiSpeechConfig();
  if (!config) return { text: "", error: "unconfigured" };
  try {
    const bytes = Buffer.from(audioBase64, "base64");
    const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm";
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeType }), `recording.${extension}`);
    form.append("model", config.sttModel);
    form.append("language", language);
    form.append("response_format", "json");
    const response = await fetch(`${config.baseURL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      console.error("[ai] transcription failed", response.status, await response.text().catch(() => ""));
      return { text: "", error: "failed" };
    }
    const payload = (await response.json()) as { text?: unknown };
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    return { text, error: text ? null : "empty" };
  } catch (error) {
    console.error("[ai] transcription error", error);
    return { text: "", error: "failed" };
  }
}

// Renders one piece of text as speech and returns the audio as base64 for the
// browser to play.
export async function synthesizeOpenAiSpeech(
  signal: AbortSignal | undefined,
  text: string,
  language: string,
): Promise<{ audio: string; mimeType: string; error: SpeechAudio["error"] }> {
  const config = getOpenAiSpeechConfig();
  if (!config) return { audio: "", mimeType: "", error: "unconfigured" };
  try {
    const response = await fetch(`${config.baseURL}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ttsModel,
        voice: config.ttsVoice,
        input: text,
        response_format: config.ttsFormat,
        // OpenAI-compatible servers ignore unknown fields; language is a hint.
        language,
      }),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      console.error("[ai] speech synthesis failed", response.status, await response.text().catch(() => ""));
      return { audio: "", mimeType: "", error: "failed" };
    }
    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    const audio = buffer.toString("base64");
    return { audio, mimeType: contentType.split(";")[0]?.trim() || "audio/mpeg", error: audio ? null : "empty" };
  } catch (error) {
    console.error("[ai] speech synthesis error", error);
    return { audio: "", mimeType: "", error: "failed" };
  }
}
