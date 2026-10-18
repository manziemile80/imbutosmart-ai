import { createServerFn } from "@tanstack/react-start";
import { seasonInputSchema, getSeasonGuide, MONTHS } from "./season-guide";

export const explainSeason = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => seasonInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { answer: "", error: "AI assistance is not configured yet." };
    const { createResponsesCall } = await import("./ai/responses.server");
    const guide = getSeasonGuide(data.month);
    try {
      const { result } = createResponsesCall(
        new Request("https://sowsmart.lovable.app"),
        { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, model: "openai/gpt-6-astra" },
        [{ role: "user", content: JSON.stringify({ district: data.district, month: MONTHS[data.month - 1], guide }) }],
        `You are SowSmart's Rwanda farming season assistant. Explain the supplied reference guide to a farmer in simple ${data.language === "rw" ? "Kinyarwanda (write the entire answer in Kinyarwanda)" : "English"}, in 3 short paragraphs, under 150 words. State the agricultural season and the separate climatic season, then typical qualitative rainfall level, then practical water/planting precautions. The provided guide is the authoritative reference: do not change its month boundaries. This is usual-season guidance, NOT live weather or a forecast. Never claim rain is currently available, invent rainfall millimeters, exact district measurements, probabilities, or guarantees. Season C typically involves marshland or irrigated production during dry conditions; use water legally and avoid protected wetlands. Season B extends into June even though the long rainy period is March–May. District terrain may affect rain, but no district climate data is supplied. Suggest checking Meteo Rwanda and a local agronomist before planting. No markdown tables or headings.`
      );
      let answer = "";
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") answer += part.text;
        if (part.type === "error") throw part.error;
      }
      return { answer, error: answer.trim() ? null : "The AI returned no advice. The season guide below remains available." };
    } catch (error) {
      const { APICallError } = await import("ai");
      let message = "AI assistance could not finish. The usual-season guide is still available.";
      if (APICallError.isInstance(error) && error.responseBody) {
        try {
          const body = JSON.parse(error.responseBody);
          const safeMessage = body.message ?? body.error?.message;
          if (typeof safeMessage === "string") message = safeMessage;
        } catch { /* Retain the safe fallback for non-JSON failures. */ }
      }
      return { answer: "", error: message };
    }
  });