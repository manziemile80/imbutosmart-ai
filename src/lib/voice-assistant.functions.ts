import { createServerFn } from "@tanstack/react-start";
import { farmerChatInputSchema, recentHistory } from "./farmer-chat";
import { buildVoiceSystemPrompt, speechInputSchema, synthesisInputSchema } from "./voice-assistant";
import type { AiAnswer } from "./ai/error-codes";
import type { SpeechAudio, SpeechConfigStatus, SpeechResult, SpeechVoice } from "./ai/speech";

// Voice assistant server functions. They reuse the text assistant's input
// contract for the spoken Q&A and add speech-to-text / text-to-speech endpoints
// on the configured speech backend. Credentials never reach the browser.

// Reports whether the speech backend is configured on the server, and which of
// the app's languages it can speak aloud. Returns no provider, endpoint or
// credential, only what the page needs to decide what to offer.
export const getVoiceConfigStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<SpeechConfigStatus> => {
    const { getSpeechConfig } = await import("./ai/speech.server");
    return getSpeechConfig() ?? { configured: false, spokenLanguages: [] };
  },
);

// Lists the voices the operator can pick from, so one can be set as
// ELEVENLABS_VOICE_ID. Only identifiers and labels are returned.
export const listVoiceOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<SpeechVoice[]> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { listSpeechVoices } = await import("./ai/speech.server");
    return listSpeechVoices(getRequest()?.signal);
  },
);

export const transcribeFarmerSpeech = createServerFn({ method: "POST" })
  .validator((input: unknown) => speechInputSchema.parse(input))
  .handler(async ({ data }): Promise<SpeechResult> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { transcribeAudio } = await import("./ai/speech.server");
    return transcribeAudio(getRequest()?.signal, data.audioBase64, data.mimeType, data.language);
  });

export const speakFarmerText = createServerFn({ method: "POST" })
  .validator((input: unknown) => synthesisInputSchema.parse(input))
  .handler(async ({ data }): Promise<SpeechAudio> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { synthesizeSpeech } = await import("./ai/speech.server");
    return synthesizeSpeech(getRequest()?.signal, data.text, data.language);
  });

export const askVoiceAssistant = createServerFn({ method: "POST" })
  .validator((input: unknown) => farmerChatInputSchema.parse(input))
  .handler(async ({ data }): Promise<AiAnswer> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { answerWithAi } = await import("./ai/chat.server");
    const system = buildVoiceSystemPrompt(data.language, data.district, data.soil);
    const messages = recentHistory(data.messages).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    return answerWithAi(getRequest()?.signal, system, messages);
  });
