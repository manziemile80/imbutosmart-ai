import { createServerFn } from "@tanstack/react-start";
import { seasonInputSchema, getSeasonGuide, MONTHS, statesMeasurement } from "./season-guide";
import { seasonReferenceSummary } from "./farmer-language";
import type { AiAnswer } from "./ai/error-codes";

export const explainSeason = createServerFn({ method: "POST" })
  .validator((input: unknown) => seasonInputSchema.parse(input))
  .handler(async ({ data }): Promise<AiAnswer> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { answerWithAi } = await import("./ai/chat.server");
    const guide = getSeasonGuide(data.month);
    const system = `You are ImbutoSmart AI's Rwanda farming season assistant. Explain the supplied reference guide to a farmer in simple ${data.language === "rw" ? "Kinyarwanda (write the entire answer in Kinyarwanda)" : data.language === "fr" ? "French (write the entire answer in French)" : "English"}, in 3 short paragraphs, under 150 words. State the agricultural season and the separate climatic season, then typical qualitative rainfall level, then practical water/planting precautions. The provided guide is the authoritative reference: do not change its month boundaries. This is usual-season guidance, NOT live weather or a forecast. Never claim rain is currently available, invent rainfall millimeters, exact district measurements, probabilities, or guarantees. Write every month, season and quantity in words and never use digits, because the reference contains no measurements. Season C typically involves marshland or irrigated production during dry conditions; use water legally and avoid protected wetlands. Season B extends into June even though the long rainy period is March–May. District terrain may affect rain, but no district climate data is supplied. Suggest checking Meteo Rwanda and a local agronomist before planting. No markdown tables or headings.`;
    const answer = await answerWithAi(
      getRequest()?.signal,
      system,
      [
        {
          role: "user",
          // The keys spell out what each value is, so the model does not read the local season name as a crop.
          content: JSON.stringify({ district: data.district, month: MONTHS[data.month - 1], farmingSeason: guide.farming, farmingPeriod: guide.period, climaticSeason: guide.name, localNameForClimaticSeason: guide.local, usualRainfallLevel: guide.rain, referenceNote: guide.note }),
        },
      ],
    );
    // The guide holds no measurements, so any figure in the answer was invented. Fall back to the deterministic reference instead of showing it.
    if (!answer.error && statesMeasurement(answer.answer)) {
      return { answer: seasonReferenceSummary(guide, data.language), error: null };
    }
    return answer;
  });
