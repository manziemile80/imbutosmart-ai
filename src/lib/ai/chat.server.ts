import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

import type { AiAnswer, AiErrorCode } from "./error-codes";

// Server-only helpers for the app's own AI assistance. The chat backend is any
// OpenAI-compatible endpoint, configured entirely through environment variables
// so no provider SDK, gateway, or credential is baked into the app.
export type ChatConfig = { baseURL: string; apiKey: string; model: string };

export const DEFAULT_AI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_AI_MODEL = "gpt-4o-mini";

// Stable error codes cross the server/client boundary; the browser maps them to
// farmer-facing copy in the shared language catalog.
export type { AiAnswer, AiErrorCode };

export function getChatConfig(): ChatConfig | null {
  const apiKey = process.env["AI_API_KEY"]?.trim() || process.env["OPENAI_API_KEY"]?.trim();
  if (!apiKey) return null;
  const baseURL = (process.env["AI_BASE_URL"]?.trim() || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
  const model = process.env["AI_MODEL"]?.trim() || DEFAULT_AI_MODEL;
  return { baseURL, apiKey, model };
}

export function createChatStream(
  signal: AbortSignal | undefined,
  config: ChatConfig,
  messages: ModelMessage[],
  system?: string,
) {
  const provider = createOpenAI({ baseURL: config.baseURL, apiKey: config.apiKey });
  return streamText({
    model: provider.chat(config.model),
    ...(system ? { system } : {}),
    messages,
    maxRetries: 0,
    ...(signal ? { abortSignal: signal } : {}),
  });
}

async function collectText(result: ReturnType<typeof streamText>): Promise<string> {
  let answer = "";
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") answer += part.text;
    if (part.type === "error") throw part.error;
  }
  return answer.trim();
}

// Answers a farmer/season request with the configured backend, degrading to a
// stable error code so the UI can keep deterministic reference guidance visible.
export async function answerWithAi(
  signal: AbortSignal | undefined,
  system: string,
  messages: ModelMessage[],
): Promise<AiAnswer> {
  const config = getChatConfig();
  if (!config) return { answer: "", error: "unconfigured" };
  try {
    const result = createChatStream(signal, config, messages, system);
    const answer = await collectText(result);
    return { answer, error: answer ? null : "empty" };
  } catch (error) {
    console.error("[ai] request failed", error);
    return { answer: "", error: "failed" };
  }
}
