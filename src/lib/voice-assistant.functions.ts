import { createServerFn } from "@tanstack/react-start";
import { farmerChatInputSchema, recentHistory } from "./farmer-chat";
import { buildVoiceSystemPrompt, speechInputSchema, synthesisInputSchema } from "./voice-assistant";
import type { AiAnswer } from "./ai/error-codes";
import type { SpeechAudio, SpeechResult } from "./ai/audio.server";

// Voice assistant server functions. They reuse the text assistant's input
// contract for the spoken Q&A and add speech-to-text / text-to-speech endpoints
// on the shared OpenAI-compatible backend. Credentials never reach the browser.

// Reports whether the voice backend is configured on the server. Returns a bare
// boolean so the browser can show a calm "not set up yet" note up front without
// learning any provider, endpoint, or credential.
export const getVoiceConfigStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ configured: boolean }> => {
    const { getSpeechConfig } = await import("./ai/audio.server");
    return { configured: Boolean(getSpeechConfig()) };
  },
);

export const transcribeFarmerSpeech = createServerFn({ method: "POST" })
  .validator((input: unknown) => speechInputSchema.parse(input))
  .handler(async ({ data }): Promise<SpeechResult> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { transcribeAudio } = await import("./ai/audio.server");
    return transcribeAudio(getRequest()?.signal, data.audioBase64, data.mimeType, data.language);
  });

export const speakFarmerText = createServerFn({ method: "POST" })
  .validator((input: unknown) => synthesisInputSchema.parse(input))
  .handler(async ({ data }): Promise<SpeechAudio> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { synthesizeSpeech } = await import("./ai/audio.server");
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
