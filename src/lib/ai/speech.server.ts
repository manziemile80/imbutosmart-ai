import type { SpeechAudio, SpeechConfigStatus, SpeechResult } from "./speech";
import { VOICE_LANGUAGES, type VoiceLanguage } from "../voice-assistant";
import { getOpenAiSpeechConfig, synthesizeOpenAiSpeech, transcribeOpenAiAudio } from "./audio.server";

// Server-only speech gateway. The backend is any OpenAI-compatible endpoint
// that serves /audio/transcriptions and /audio/speech, configured entirely
// through environment variables. The page only ever learns whether speech is
// configured and which languages it can speak aloud.

export function getSpeechConfig(): SpeechConfigStatus | null {
  if (!getOpenAiSpeechConfig()) return null;
  return { configured: true, spokenLanguages: spokenLanguages() };
}

// Some speech models only speak certain languages, so the deployment declares
// them. Without a declaration every farmer language stays available, which is
// right for a self-hosted server that voices each language itself.
function spokenLanguages() {
  const declared = process.env["AI_SPEECH_LANGUAGES"]?.trim();
  if (!declared) return [...VOICE_LANGUAGES];
  const languages = declared
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is VoiceLanguage => (VOICE_LANGUAGES as readonly string[]).includes(value));
  return languages;
}

// Some speech models accept only a limited amount of text per request, so a
// longer answer is split into pieces that are spoken in order.
function splitForSpeech(text: string, limit: number): string[] {
  const trimmed = text.trim();
  if (!limit || trimmed.length <= limit) return trimmed ? [trimmed] : [];
  const pieces: string[] = [];
  let rest = trimmed;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf(" ", limit);
    if (cut < limit / 2) cut = limit;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces.filter(Boolean);
}

export async function transcribeAudio(
  signal: AbortSignal | undefined,
  audioBase64: string,
  mimeType: string,
  language: string,
): Promise<SpeechResult> {
  return transcribeOpenAiAudio(signal, audioBase64, mimeType, language);
}

export async function synthesizeSpeech(
  signal: AbortSignal | undefined,
  text: string,
  language: string,
): Promise<SpeechAudio> {
  // The backend must not read a language it cannot really speak: the request
  // is refused instead of returning audio in the wrong language.
  if (!spokenLanguages().includes(language as VoiceLanguage)) {
    return { audios: [], mimeType: "", error: "unavailable", refusal: null };
  }
  const limit = Number(process.env["AI_TTS_MAX_CHARS"]?.trim() || 0);
  const pieces = splitForSpeech(text, Number.isFinite(limit) && limit > 0 ? limit : 0);
  if (pieces.length === 0) return { audios: [], mimeType: "", error: "empty", refusal: null };
  // The clips are requested together so a long answer is not spoken one piece
  // at a time with a wait between each.
  const clips = await Promise.all(pieces.map((piece) => synthesizeOpenAiSpeech(signal, piece)));
  const failed = clips.find((clip) => clip.error || !clip.audio);
  if (failed) {
    return { audios: [], mimeType: "", error: failed.error ?? "empty", refusal: failed.refusal };
  }
  return {
    audios: clips.map((clip) => clip.audio),
    mimeType: clips[0]?.mimeType ?? "",
    error: null,
    refusal: null,
  };
}
