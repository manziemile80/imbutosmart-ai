import type { AiErrorCode } from "./error-codes";
import { DEFAULT_AI_BASE_URL } from "./chat.server";

// Server-only speech helpers. Speech-to-text and text-to-speech run against the
// same OpenAI-compatible backend as the chat assistants, configured entirely by
// environment variables so no provider, gateway, or credential is hardcoded.

export const DEFAULT_STT_MODEL = "whisper-1";
export const DEFAULT_TTS_MODEL = "tts-1";
export const DEFAULT_TTS_VOICE = "alloy";

export type SpeechConfig = {
  baseURL: string;
  apiKey: string;
  sttModel: string;
  ttsModel: string;
  ttsVoice: string;
};

export type SpeechResult = { text: string; error: AiErrorCode | null };
export type SpeechAudio = { audio: string; mimeType: string; error: AiErrorCode | null };

export function getSpeechConfig(): SpeechConfig | null {
  const apiKey = process.env["AI_API_KEY"]?.trim() || process.env["OPENAI_API_KEY"]?.trim();
  if (!apiKey) return null;
  const baseURL = (process.env["AI_BASE_URL"]?.trim() || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
  const sttModel = process.env["AI_STT_MODEL"]?.trim() || DEFAULT_STT_MODEL;
  const ttsModel = process.env["AI_TTS_MODEL"]?.trim() || DEFAULT_TTS_MODEL;
  const ttsVoice = process.env["AI_TTS_VOICE"]?.trim() || DEFAULT_TTS_VOICE;
  return { baseURL, apiKey, sttModel, ttsModel, ttsVoice };
}

// Transcribes a short recording into text. The audio arrives base64-encoded from
// the browser recorder and is re-wrapped as multipart form data.
export async function transcribeAudio(
  signal: AbortSignal | undefined,
  audioBase64: string,
  mimeType: string,
  language: string,
): Promise<SpeechResult> {
  const config = getSpeechConfig();
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

// Renders text as speech and returns the audio as base64 for the browser to play.
export async function synthesizeSpeech(
  signal: AbortSignal | undefined,
  text: string,
  language: string,
): Promise<SpeechAudio> {
  const config = getSpeechConfig();
  if (!config) return { audio: "", mimeType: "", error: "unconfigured" };
  try {
    const response = await fetch(`${config.baseURL}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ttsModel,
        voice: config.ttsVoice,
        input: text,
        response_format: "mp3",
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
