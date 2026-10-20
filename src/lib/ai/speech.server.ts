import type { SpeechAudio, SpeechConfigStatus, SpeechResult, SpeechVoice } from "./speech";
import { VOICE_LANGUAGES } from "../voice-assistant";
import {
  getOpenAiSpeechConfig,
  synthesizeOpenAiSpeech,
  transcribeOpenAiAudio,
} from "./audio.server";
import {
  ELEVENLABS_SPOKEN_LANGUAGES,
  getElevenLabsConfig,
  listElevenLabsVoices,
  synthesizeElevenLabsSpeech,
  transcribeElevenLabsAudio,
} from "./elevenlabs.server";

// Server-only speech gateway. The backend is chosen by AI_SPEECH_PROVIDER:
//   openai      -> any OpenAI-compatible /audio/transcriptions + /audio/speech
//   elevenlabs  -> the ElevenLabs native speech endpoints
// Both read their endpoint, model and credential from the environment only,
// and the page only ever learns whether speech is configured and which
// languages it can speak aloud.

export type SpeechProvider = "openai" | "elevenlabs";

export function getSpeechProvider(): SpeechProvider {
  const configured = process.env["AI_SPEECH_PROVIDER"]?.trim().toLowerCase();
  return configured === "elevenlabs" ? "elevenlabs" : "openai";
}

// Reports what the browser needs to know: whether speech is set up, and which
// of the app's languages this backend can actually speak. A backend that
// cannot speak a language must not pretend to, so the answer is written out
// instead of being spoken badly.
export function getSpeechConfig(): SpeechConfigStatus | null {
  if (getSpeechProvider() === "elevenlabs") {
    if (!getElevenLabsConfig()) return null;
    return { configured: true, spokenLanguages: ELEVENLABS_SPOKEN_LANGUAGES };
  }
  if (!getOpenAiSpeechConfig()) return null;
  // An OpenAI-compatible backend does not advertise its languages, so every
  // farmer language stays available, exactly as before.
  return { configured: true, spokenLanguages: [...VOICE_LANGUAGES] };
}

export async function transcribeAudio(
  signal: AbortSignal | undefined,
  audioBase64: string,
  mimeType: string,
  language: string,
): Promise<SpeechResult> {
  if (getSpeechProvider() === "elevenlabs") {
    return transcribeElevenLabsAudio(signal, audioBase64, mimeType, language);
  }
  return transcribeOpenAiAudio(signal, audioBase64, mimeType, language);
}

export async function synthesizeSpeech(
  signal: AbortSignal | undefined,
  text: string,
  language: string,
): Promise<SpeechAudio> {
  if (getSpeechProvider() === "elevenlabs") {
    return synthesizeElevenLabsSpeech(signal, text);
  }
  return synthesizeOpenAiSpeech(signal, text, language);
}

// The voices the operator can choose from. Identifiers and labels only.
export async function listSpeechVoices(signal: AbortSignal | undefined): Promise<SpeechVoice[]> {
  if (getSpeechProvider() === "elevenlabs") {
    return listElevenLabsVoices(signal);
  }
  return [];
}
