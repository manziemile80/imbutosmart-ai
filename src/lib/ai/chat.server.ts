import { createOpenAI } from "@ai-sdk/openai";
import { gateway, streamText, type ModelMessage } from "ai";

import type { AiAnswer, AiErrorCode } from "./error-codes";

// Server-only helpers for the app's own AI assistance. The chat backend is any
// OpenAI-compatible endpoint, configured entirely through environment variables
// so no provider SDK, gateway, or credential is baked into the app.
export type ChatProvider = "openai" | "vercel-gateway";
export type ChatConfig = { provider: ChatProvider; baseURL: string; apiKey: string; model: string };

export const DEFAULT_AI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_AI_MODEL = "gpt-4o-mini";
// The Vercel AI Gateway addresses models as "provider/model".
export const DEFAULT_GATEWAY_MODEL = "openai/gpt-4o-mini";

// Stable error codes cross the server/client boundary; the browser maps them to
// farmer-facing copy in the shared language catalog.
export type { AiAnswer, AiErrorCode };

// The backend is chosen by name so a hosted gateway can be used next to a
// plain OpenAI-compatible endpoint without changing the app.
export function getChatProvider(): ChatProvider {
  const configured = process.env["AI_PROVIDER"]?.trim().toLowerCase();
  if (configured === "vercel-gateway" || configured === "gateway") return "vercel-gateway";
  return "openai";
}

export function getChatConfig(): ChatConfig | null {
  if (getChatProvider() === "vercel-gateway") {
    // The gateway authenticates a Vercel deployment with its own OIDC token, so
    // a key is optional. It still needs a credential of some kind to be
    // reachable, so the app can report that it is not configured.
    const apiKey = process.env["AI_GATEWAY_API_KEY"]?.trim() || process.env["VERCEL_OIDC_TOKEN"]?.trim() || "";
    if (!apiKey) return null;
    const model = process.env["AI_MODEL"]?.trim() || DEFAULT_GATEWAY_MODEL;
    return { provider: "vercel-gateway", baseURL: process.env["AI_BASE_URL"]?.trim() || "", apiKey, model };
  }
  const explicitBase = process.env["AI_BASE_URL"]?.trim();
  const apiKey = process.env["AI_API_KEY"]?.trim() || process.env["OPENAI_API_KEY"]?.trim();
  // An explicitly configured endpoint may not need auth, so it gets a harmless
  // placeholder key. Without one the assistant reports that it is not set up.
  if (!apiKey && !explicitBase) return null;
  const baseURL = (explicitBase || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
  const model = process.env["AI_MODEL"]?.trim() || DEFAULT_AI_MODEL;
  return { provider: "openai", baseURL, apiKey: apiKey || "not-needed", model };
}

export function createChatStream(
  signal: AbortSignal | undefined,
  config: ChatConfig,
  messages: ModelMessage[],
  system?: string,
) {
  const model = config.provider === "vercel-gateway" ? gateway(config.model) : createOpenAI({ baseURL: config.baseURL, apiKey: config.apiKey }).chat(config.model);
  return streamText({
    model,
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
// A blank completion is retried once: a throttled or flaky backend usually
// answers on the second try, and an empty answer tells the farmer nothing.
export async function answerWithAi(
  signal: AbortSignal | undefined,
  system: string,
  messages: ModelMessage[],
): Promise<AiAnswer> {
  const config = getChatConfig();
  if (!config) return { answer: "", error: "unconfigured" };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = createChatStream(signal, config, messages, system);
      const answer = await collectText(result);
      if (answer) return { answer, error: null };
      if (attempt === 0) continue;
      return { answer: "", error: "empty" };
    } catch (error) {
      console.error("[ai] request failed", error);
      if (attempt === 0) continue;
      return { answer: "", error: "failed" };
    }
  }
  return { answer: "", error: "empty" };
}
