import { createServerFn } from "@tanstack/react-start";
import { buildSystemPrompt, farmerChatInputSchema, recentHistory } from "./farmer-chat";
import type { AiAnswer } from "./ai/error-codes";

export const askFarmerAssistant = createServerFn({ method: "POST" })
  .validator((input: unknown) => farmerChatInputSchema.parse(input))
  .handler(async ({ data }): Promise<AiAnswer> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { answerWithAi } = await import("./ai/chat.server");
    const system = buildSystemPrompt(data.language, data.district, data.soil);
    // Only the most recent turns are sent, so the request stays bounded even as
    // the on-screen thread grows.
    const messages = recentHistory(data.messages).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    return answerWithAi(getRequest()?.signal, system, messages);
  });
