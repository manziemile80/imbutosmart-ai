import type { AiErrorCode } from "./error-codes";
import type { VoiceLanguage } from "../voice-assistant";

// Shared contract for the speech backends. The browser only ever sees these
// shapes; every provider name, endpoint and credential stays on the server.

export type SpeechResult = { text: string; error: SpeechErrorCode | null };
export type SpeechAudio = { audio: string; mimeType: string; error: SpeechErrorCode | null };

// "unavailable" means the backend is reachable but cannot serve the request,
// for example a provider plan that does not include the requested feature. It
// is separate from "failed" so the page can say so calmly instead of showing a
// red error.
export type SpeechErrorCode = AiErrorCode | "unavailable";

// What the server tells the page about the speech setup: whether it is
// configured at all, and which of the app's languages it can actually speak
// aloud. A backend that cannot speak a language must not pretend to.
export type SpeechConfigStatus = { configured: boolean; spokenLanguages: VoiceLanguage[] };

// A voice the operator can pick from. Only the identifier and the label
// travel to the browser, never the credential that listed it.
export type SpeechVoice = { id: string; name: string; detail: string };
