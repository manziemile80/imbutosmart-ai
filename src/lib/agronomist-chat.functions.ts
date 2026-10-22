import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { DISTRICTS } from "./api";
import {
  agronomistMessageSchema,
  buildAgronomistDigest,
  buildAgronomistSystemPrompt,
  recentHistory,
  type AgronomistMessage,
} from "./agronomist-chat";
import { seasonRainMm, seasonTempC } from "./weather";
import type { AiAnswer } from "./ai/error-codes";

// Server function for the agronomist assistant. The browser sends the question
// and the model figures it is showing; the server adds the published survey
// figures and the district's climate, so the answer is grounded in the same
// sources the page uses. The credential never leaves the server.

const modelFiguresSchema = z.object({
  rows: z.number().optional(),
  districts: z.number().optional(),
  crops: z.number().optional(),
  seasons: z.number().optional(),
  testAccuracy: z.number().nullable().optional(),
  testAuc: z.number().nullable().optional(),
  testR2: z.number().nullable().optional(),
  testMae: z.number().nullable().optional(),
  byCrop: z
    .array(
      z.object({
        crop: z.string(),
        actual: z.number(),
        predicted: z.number(),
        n: z.number(),
      }),
    )
    .optional(),
});

export const agronomistChatInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value), "Choose a district."),
  season: z.enum(["A", "B", "C"]).nullable(),
  model: modelFiguresSchema.nullable(),
  messages: z.array(agronomistMessageSchema).min(1).max(40),
});

export const askAgronomist = createServerFn({ method: "POST" })
  .validator((input: unknown) => agronomistChatInputSchema.parse(input))
  .handler(async ({ data }): Promise<AiAnswer> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { answerWithAi } = await import("./ai/chat.server");
    const { NISR_2026B } = await import("./local-model");
    const { getDistrictClimate } = await import("./weather.server");

    const climate = await getDistrictClimate(data.district);
    const digest = buildAgronomistDigest({
      district: data.district,
      season: data.season,
      nisr: {
        totalLandMha: NISR_2026B.totalLand,
        agriculturalLandMha: NISR_2026B.agriLand,
        agriculturalShare: 59,
        land: NISR_2026B.land,
        inputs: NISR_2026B.inputs,
        practices: NISR_2026B.practices,
      },
      model: data.model
        ? {
            rows: data.model.rows,
            districts: data.model.districts,
            crops: data.model.crops,
            seasons: data.model.seasons,
            testAccuracy: data.model.testAccuracy ?? null,
            testAuc: data.model.testAuc ?? null,
            testR2: data.model.testR2 ?? null,
            testMae: data.model.testMae ?? null,
            byCrop: data.model.byCrop,
          }
        : null,
      climate: climate
        ? {
            period: climate.period,
            rainMm: data.season ? seasonRainMm(climate, data.season) : 0,
            tempC: seasonTempC(climate, data.season) ?? 0,
          }
        : null,
    });

    const system = buildAgronomistSystemPrompt(digest);
    const messages = recentHistory(data.messages).map((message: AgronomistMessage) => ({
      role: message.role,
      content: message.content,
    }));
    return answerWithAi(getRequest()?.signal, system, messages);
  });
