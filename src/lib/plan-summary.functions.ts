import { createServerFn } from "@tanstack/react-start";

import { districtInputs } from "./advice";
import {
  buildPlanEmail,
  buildPlanSummary,
  planEmailInputSchema,
  type PlanEmailInput,
} from "./plan-summary";
import { engineInput } from "./recommendation";
import { recommendOffline } from "./recommendation-engine";

// The server sends the same summary the panel shows, rebuilt from the field
// and the published figures. The browser sends the field, never a ready-made
// message, so the endpoint cannot be used to post arbitrary content.

export type PlanEmailResult = { status: "sent" | "unavailable" | "failed" };

export const sendPlanSummaryEmail = createServerFn({ method: "POST" })
  .validator((input: unknown) => planEmailInputSchema.parse(input))
  .handler(async ({ data }): Promise<PlanEmailResult> => {
    const { getDistrictClimate } = await import("./weather.server");
    const { sendSummaryEmail } = await import("./email.server");
    const { seasonRainMm, seasonTempC } = await import("./weather");

    const climate = await getDistrictClimate(data.district);
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

    const summary = buildPlanSummary({
      district: data.district,
      soil: data.soil,
      season: data.season,
      crops: [engine.primary, ...engine.alternatives].slice(0, 3).map((crop) => ({
        crop: crop.crop,
        score: crop.score,
      })),
      profile: districtInputs[data.district] ?? null,
      climate: rainMm != null && tempC != null ? { rainMm, tempC } : null,
      language: data.language,
    });

    const message = buildPlanEmail({
      summary,
      district: data.district,
      soil: data.soil,
      season: data.season,
      language: data.language,
      to: data.email,
      name: data.name,
    });

    const status = await sendSummaryEmail({
      to: message.to,
      subject: message.subject,
      text: message.body,
    });
    return { status };
  });

// A small helper for callers that already hold a full input, such as tests.
export type { PlanEmailInput };
