import { createServerFn } from "@tanstack/react-start";

import { recommendOffline } from "./recommendation-engine";
import {
  buildLocalExplanation,
  engineInput,
  groundedSentences,
  recommendationInputSchema,
  recommendationSyncSchema,
  type RecommendationInput,
  type RecommendationResult,
} from "./recommendation";
import { cropReferenceForPrompt } from "./crop-knowledge";
import type { AiErrorCode } from "./ai/error-codes";

// Online half of the hybrid recommender. The suitability score, growing
// period and alternatives always come from the local engine, so an AI that
// guesses cannot invent numbers. The model is asked only to explain, in the
// farmer's language, why the engine's top crop fits the supplied conditions.
// If the AI is unconfigured, slow, or answers badly, the deterministic
// explanation from the same engine is returned instead — the farmer still
// gets a full recommendation.

export type OnlineRecommendation = {
  result: RecommendationResult | null;
  error: AiErrorCode | null;
};

export function buildRecommendationSystemPrompt(language: "en" | "rw" | "fr"): string {
  const lang =
    language === "rw"
      ? "Kinyarwanda (write the entire answer in Kinyarwanda)"
      : language === "fr"
        ? "French (write the entire answer in French)"
        : "English";
  return `You are ImbutoSmart AI's crop adviser for a farmer in Rwanda. Reply ONLY with a JSON object, no markdown, matching this shape:
{"reasons": ["..."], "considerations": ["..."], "risks": ["..."]}
Each field is an array of 1 to 4 short plain sentences, in simple ${lang}, under 25 words each.
- "reasons": why the named crop suits the supplied field conditions.
- "considerations": practical planting and water tips for that crop and season.
- "risks": what could go wrong given the supplied conditions.
The suitability score, growing period and crop list are computed locally and are authoritative — do not mention or invent percentages, yields, millimetres not supplied by the farmer, prices, probabilities or guarantees. If a value was not supplied, do not guess it. Never promise a harvest. Base everything only on the supplied field information and the crop reference.`;
}

// Strips fences or chatter around the JSON the model was asked to produce.
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no object in answer");
  return JSON.parse(text.slice(start, end + 1));
}

const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 4)
    : [];

export const recommendCropsOnline = createServerFn({ method: "POST" })
  .validator((input: unknown) => recommendationInputSchema.parse(input))
  .handler(async ({ data }): Promise<OnlineRecommendation> => {
    const engineResult = recommendOffline(engineInput(data));
    const fallback = buildLocalExplanation(engineResult, data, data.language);
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const { answerWithAi } = await import("./ai/chat.server");
      const answer = await answerWithAi(
        getRequest()?.signal,
        buildRecommendationSystemPrompt(data.language),
        [
          {
            role: "user",
            // Keys spell out each value so the model reads them as conditions,
            // and the reference keeps its crop names unambiguous.
            content: JSON.stringify({
              field: fieldSummary(data),
              reference: cropReferenceForPrompt(),
              localEngineSays: {
                crop: engineResult.primary.crop,
                suitabilityBand: engineResult.primary.band,
                topAlternatives: engineResult.alternatives.map((a) => a.crop),
              },
            }),
          },
        ],
      );
      if (answer.error) return { result: fallback, error: answer.error };
      const parsed = extractJson(answer.answer) as {
        reasons?: unknown;
        considerations?: unknown;
        risks?: unknown;
      };
      // Only sentences whose figures the farmer actually supplied survive.
      const reasons = groundedSentences(stringArray(parsed.reasons), data);
      if (reasons.length === 0) return { result: fallback, error: "empty" };
      const considerations = groundedSentences(stringArray(parsed.considerations), data);
      const risks = groundedSentences(stringArray(parsed.risks), data);
      return {
        result: {
          ...fallback,
          source: "online-ai",
          reasons,
          considerations: considerations.length > 0 ? considerations : fallback.considerations,
          risks: risks.length > 0 ? risks : fallback.risks,
        },
        error: null,
      };
    } catch (error) {
      console.error("[recommendation] online explanation failed", error);
      return { result: fallback, error: "failed" };
    }
  });

function fieldSummary(data: RecommendationInput): Record<string, string | number> {
  const summary: Record<string, string | number> = { district: data.district, soilType: data.soil };
  if (data.season) summary["plantingSeason"] = data.season;
  if (data.rainfallMm != null) summary["rainfallMm"] = data.rainfallMm;
  if (data.temperatureC != null) summary["temperatureC"] = data.temperatureC;
  if (data.soilPh != null) summary["soilPh"] = data.soilPh;
  if (data.landSizeHa != null) summary["landSizeHectares"] = data.landSizeHa;
  if (data.waterAvailability) summary["water"] = data.waterAvailability;
  if (data.experience) summary["experience"] = data.experience;
  if (data.preferredCrop) summary["preferredCrop"] = data.preferredCrop;
  return summary;
}

// Sync endpoint. Without a database behind the app there is nothing durable
// to write to, so records are only accepted when a sync target is configured:
// RECOMMENDATION_SYNC_URL (and optionally RECOMMENDATION_SYNC_TOKEN) on the
// server. When it is not configured the client keeps records on the device
// and says so, rather than pretending a server accepted them.
export const syncRecommendations = createServerFn({ method: "POST" })
  .validator((input: unknown) => recommendationSyncSchema.parse(input))
  .handler(async ({ data }): Promise<{ stored: number; durable: boolean }> => {
    const url = process.env["RECOMMENDATION_SYNC_URL"]?.trim();
    if (!url) return { stored: 0, durable: false };
    const token = process.env["RECOMMENDATION_SYNC_TOKEN"]?.trim();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ records: data.records }),
      });
      return { stored: response.ok ? data.records.length : 0, durable: response.ok };
    } catch (error) {
      console.error("[recommendation] sync failed", error);
      return { stored: 0, durable: false };
    }
  });
