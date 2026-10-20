import type { SpeechAudio, SpeechErrorCode, SpeechResult, SpeechVoice } from "./speech";
import type { VoiceLanguage } from "../voice-assistant";

// Server-only ElevenLabs transport. ElevenLabs does not expose the
// OpenAI-compatible speech endpoints, so it gets its own client. The provider
// is selected by AI_SPEECH_PROVIDER and every value comes from the
// environment, so no endpoint or credential is baked into the app.

export const DEFAULT_ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";
export const DEFAULT_ELEVENLABS_TTS_MODEL = "eleven_multilingual_v2";
export const DEFAULT_ELEVENLABS_STT_MODEL = "scribe_v2";
export const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";
// A stock voice that every ElevenLabs account can use. Set ELEVENLABS_VOICE_ID
// to pick another voice from the account's library.
export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

// ElevenLabs speech models list English and French among their languages but
// not Kinyarwanda, so spoken Kinyarwanda is never offered. The written answer
// and the text assistants still work in every language.
export const ELEVENLABS_SPOKEN_LANGUAGES: VoiceLanguage[] = ["en", "fr"];
// The transcription models recognise these languages well enough to be given
// as a hint. For any other language the hint is left out and the model
// detects the language itself, which the API accepts.
const ELEVENLABS_TRANSCRIPTION_LANGUAGES = ["en", "fr"];

export type ElevenLabsConfig = {
  apiKey: string;
  baseURL: string;
  sttModel: string;
  ttsModel: string;
  voiceId: string;
  outputFormat: string;
};

export function getElevenLabsConfig(): ElevenLabsConfig | null {
  const apiKey = process.env["ELEVENLABS_API_KEY"]?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseURL: (process.env["ELEVENLABS_BASE_URL"]?.trim() || DEFAULT_ELEVENLABS_BASE_URL).replace(
      /\/+$/,
      "",
    ),
    sttModel: process.env["ELEVENLABS_STT_MODEL"]?.trim() || DEFAULT_ELEVENLABS_STT_MODEL,
    ttsModel: process.env["ELEVENLABS_TTS_MODEL"]?.trim() || DEFAULT_ELEVENLABS_TTS_MODEL,
    voiceId: process.env["ELEVENLABS_VOICE_ID"]?.trim() || DEFAULT_ELEVENLABS_VOICE_ID,
    outputFormat:
      process.env["ELEVENLABS_OUTPUT_FORMAT"]?.trim() || DEFAULT_ELEVENLABS_OUTPUT_FORMAT,
  };
}

// The browser records webm/opus, ogg, mp4 or wav. ElevenLabs accepts all of
// them, so the recording is forwarded as it arrives.
function audioExtension(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

// A plan that does not include the feature, or a key without the permission,
// is not a crash: the caller is told the backend cannot serve it right now.
function speechErrorFor(status: number): SpeechErrorCode {
  if (status === 401 || status === 402 || status === 403) return "unavailable";
  return "failed";
}

export async function transcribeElevenLabsAudio(
  signal: AbortSignal | undefined,
  audioBase64: string,
  mimeType: string,
  language: string,
): Promise<SpeechResult> {
  const config = getElevenLabsConfig();
  if (!config) return { text: "", error: "unconfigured" };
  try {
    const bytes = Buffer.from(audioBase64, "base64");
    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes], { type: mimeType }),
      `recording.${audioExtension(mimeType)}`,
    );
    form.append("model_id", config.sttModel);
    if (ELEVENLABS_TRANSCRIPTION_LANGUAGES.includes(language))
      form.append("language_code", language);
    const response = await fetch(`${config.baseURL}/v1/speech-to-text`, {
      method: "POST",
      headers: { "xi-api-key": config.apiKey },
      body: form,
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      console.error(
        "[ai] elevenlabs transcription failed",
        response.status,
        await response.text().catch(() => ""),
      );
      return { text: "", error: speechErrorFor(response.status) };
    }
    const payload = (await response.json()) as { text?: unknown };
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    return { text, error: text ? null : "empty" };
  } catch (error) {
    console.error("[ai] elevenlabs transcription error", error);
    return { text: "", error: "failed" };
  }
}

export async function synthesizeElevenLabsSpeech(
  signal: AbortSignal | undefined,
  text: string,
): Promise<SpeechAudio> {
  const config = getElevenLabsConfig();
  if (!config) return { audio: "", mimeType: "", error: "unconfigured" };
  try {
    const url = `${config.baseURL}/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=${encodeURIComponent(config.outputFormat)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": config.apiKey, "Content-Type": "application/json" },
      // The model picks the language from the text, so no language hint is sent.
      body: JSON.stringify({ text, model_id: config.ttsModel }),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      console.error(
        "[ai] elevenlabs speech synthesis failed",
        response.status,
        await response.text().catch(() => ""),
      );
      return { audio: "", mimeType: "", error: speechErrorFor(response.status) };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const audio = buffer.toString("base64");
    if (!audio) return { audio: "", mimeType: "", error: "empty" };
    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    return { audio, mimeType: contentType.split(";")[0]?.trim() || "audio/mpeg", error: null };
  } catch (error) {
    console.error("[ai] elevenlabs speech synthesis error", error);
    return { audio: "", mimeType: "", error: "failed" };
  }
}

// Lists the voices the account can use, so the operator can pick one and set
// ELEVENLABS_VOICE_ID. Only identifiers and labels are returned to the caller.
export async function listElevenLabsVoices(
  signal: AbortSignal | undefined,
): Promise<SpeechVoice[]> {
  const config = getElevenLabsConfig();
  if (!config) return [];
  try {
    const response = await fetch(`${config.baseURL}/v2/voices?page_size=100`, {
      method: "GET",
      headers: { "xi-api-key": config.apiKey },
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      console.error(
        "[ai] elevenlabs voices failed",
        response.status,
        await response.text().catch(() => ""),
      );
      return [];
    }
    const payload = (await response.json()) as {
      voices?: Array<{ voice_id?: unknown; name?: unknown; labels?: Record<string, unknown> }>;
    };
    if (!Array.isArray(payload.voices)) return [];
    return payload.voices.flatMap((voice) => {
      const id = typeof voice.voice_id === "string" ? voice.voice_id : "";
      if (!id) return [];
      const name = typeof voice.name === "string" ? voice.name : id;
      const labels = voice.labels ?? {};
      const detail = [labels["accent"], labels["gender"], labels["language"], labels["age"]]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .join(" · ");
      return [{ id, name, detail }];
    });
  } catch (error) {
    console.error("[ai] elevenlabs voices error", error);
    return [];
  }
}
