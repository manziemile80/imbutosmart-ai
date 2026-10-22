import { createServerFn } from "@tanstack/react-start";

import {
  adviceInputSchema,
  buildAdviceDigest,
  buildAdvicePrompt,
  districtInputs,
  type AdviceDigestInput,
} from "./advice";
import { recommendOffline } from "./recommendation-engine";
import { engineInput } from "./recommendation";
import { findCrop } from "./crop-knowledge";
import { seasonRainMm, seasonTempC, weatherCodeLabel } from "./weather";
import { groundToDigest } from "./grounding";
import type { AiAnswer } from "./ai/error-codes";

// The advice the farmer follows. The server builds the facts from the same
// published sources the page shows, so the written plan and the page can never
// disagree, and the model is told to use nothing else.

export const getAdvice = createServerFn({ method: "POST" })
  .validator((input: unknown) => adviceInputSchema.parse(input))
  .handler(async ({ data }): Promise<AiAnswer> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { answerWithAi } = await import("./ai/chat.server");
    const { getDistrictClimate, getDistrictWeather } = await import("./weather.server");

    const climate = await getDistrictClimate(data.district);
    const weather = await getDistrictWeather(data.district);
    const rainMm = climate && data.season ? seasonRainMm(climate, data.season) : null;
    const tempC = climate && data.season ? seasonTempC(climate, data.season) : null;

    const engine = recommendOffline(
      engineInput({
        district: data.district,
        soil: data.soil,
        language: data.language,
        season: data.season,
        rainfallMm: rainMm,
        temperatureC: tempC,
      }),
    );
    const crops = [engine.primary, ...engine.alternatives].map((crop) => {
      const knowledge = findCrop(crop.crop);
      return {
        crop: crop.crop,
        score: crop.score,
        band: crop.band,
        growingPeriod: knowledge?.growingPeriod ?? "",
        soilFit: knowledge?.soils[data.soil] ?? 0,
      };
    });

    const digest: AdviceDigestInput = {
      district: data.district,
      soil: data.soil,
      season: data.season,
      crops,
      inputs: districtInputs[data.district] ?? null,
      climate:
        climate && rainMm != null && tempC != null
          ? { period: climate.period, rainMm, tempC }
          : null,
      outlook: (weather?.forecast?.days ?? []).slice(0, 3).map((day) => ({
        day: day.date,
        rainMm: day.rainMm,
        tempMinC: day.tempMinC,
        tempMaxC: day.tempMaxC,
        rainWindow: day.rainWindow ? `${day.rainWindow.from}-${day.rainWindow.to}` : null,
        sky: weatherCodeLabel(day.weatherCode, data.language),
      })),
    };

    const system = buildAdvicePrompt(buildAdviceDigest(digest), data.language, data.mode);
    const answer = await answerWithAi(getRequest()?.signal, system, [
      {
        role: "user",
        content: data.mode === "simple" ? "Write the simple version." : "Write the plan.",
      },
    ]);
    // A rate the model added on its own is dropped: the plan may only quote
    // figures the digest holds.
    return {
      ...answer,
      answer: groundToDigest(answer.answer, buildAdviceDigest(digest)),
    };
  });
