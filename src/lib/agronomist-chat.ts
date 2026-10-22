import { z } from "zod";

import { DISTRICTS } from "./api";
import type { AiErrorCode } from "./ai/error-codes";

// Browser-safe contract for the agronomist assistant: input validation,
// suggested questions, the copy, and the digest of the figures the dashboard
// shows. The digest is what keeps the answer honest: the model is given the
// numbers on screen and told to use nothing else.

export const MAX_QUESTION_LENGTH = 500;
export const MAX_HISTORY_MESSAGES = 8;
export const MAX_THREAD_MESSAGES = 40;
export const MAX_MESSAGE_LENGTH = 4000;

export const agronomistMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export const agronomistChatInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value), "Choose a district."),
  season: z.enum(["A", "B", "C"]).nullable(),
  messages: z.array(agronomistMessageSchema).min(1).max(MAX_THREAD_MESSAGES),
});

export type AgronomistMessage = z.infer<typeof agronomistMessageSchema>;
export type AgronomistChatInput = z.infer<typeof agronomistChatInputSchema>;

export function recentHistory(messages: AgronomistMessage[]): AgronomistMessage[] {
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

export const agronomistSuggestions: string[] = [
  "What should an extension officer check first this season?",
  "Which crops performed best per hectare in the survey?",
  "How accurate is the trained model, and what does that mean for advice?",
  "What does this district's rainfall mean for the season ahead?",
];

export const agronomistCopy: {
  eyebrow: string;
  heading: string;
  intro: string;
  placeholder: string;
  send: string;
  thinking: string;
  suggestions: string;
  clear: string;
  you: string;
  assistant: string;
  listen: string;
  disclaimer: string;
  empty: string;
  tooLong: string;
  errors: Record<AiErrorCode, string>;
} = {
  eyebrow: "Agronomist assistant",
  heading: "Ask about the figures on this page",
  intro:
    "Ask a question about the survey figures, the district you selected or the trained model. The answer uses only the numbers shown here, and says so when a figure is missing.",
  placeholder: "Type your question…",
  send: "Send",
  thinking: "Thinking…",
  suggestions: "Example questions",
  clear: "Clear chat",
  you: "You",
  assistant: "AI assistant",
  listen: "Listen",
  disclaimer:
    "The answer is only as good as the figures behind it: check anything important against the NISR Seasonal Agricultural Survey, the model report and Meteo Rwanda.",
  empty: "Type a question before sending.",
  tooLong: `Keep each question under ${MAX_QUESTION_LENGTH} characters.`,
  errors: {
    unconfigured: "AI assistance is not configured yet. The figures on this page remain available.",
    failed: "The assistant could not answer just now. Please try again.",
    empty: "The assistant returned no answer. Please try rephrasing your question.",
  },
};

// The figures the dashboard is showing, in a form the model can quote.
export type AgronomistDigestInput = {
  district: string;
  season: "A" | "B" | "C" | null;
  nisr: {
    totalLandMha: number;
    agriculturalLandMha: number;
    agriculturalShare: number;
    land: { name: string; value: number }[];
    inputs: { name: string; small: number; large: number }[];
    practices: { name: string; value: number }[];
  };
  model: {
    rows?: number | undefined;
    districts?: number | undefined;
    crops?: number | undefined;
    seasons?: number | undefined;
    testAccuracy?: number | null;
    testAuc?: number | null;
    testR2?: number | null;
    testMae?: number | null;
    byCrop?: { crop: string; actual: number; predicted: number; n: number }[] | undefined;
  } | null;
  climate: { period: string; rainMm: number; tempC: number } | null;
  outlook: {
    day: string;
    rainMm: number;
    tempMinC: number;
    tempMaxC: number;
    rainWindow: string | null;
    sky: string | null;
  }[];
};

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// A compact, factual digest. Every number in it comes from the page.
export function buildAgronomistDigest(input: AgronomistDigestInput): string {
  const lines: string[] = [];

  lines.push(
    `NISR Seasonal Agricultural Survey, Season B 2026 (national figures): ` +
      `total land ${input.nisr.totalLandMha} M ha, agricultural land ${input.nisr.agriculturalLandMha} M ha (${input.nisr.agriculturalShare}% of the country).`,
  );
  if (input.nisr.land.length > 0) {
    lines.push(
      `Land use (M ha): ${input.nisr.land.map((row) => `${row.name} ${row.value}`).join("; ")}.`,
    );
  }
  if (input.nisr.inputs.length > 0) {
    lines.push(
      `Inputs used (% of farmers, small-scale then large-scale): ` +
        input.nisr.inputs.map((row) => `${row.name} ${row.small} / ${row.large}`).join("; ") +
        ".",
    );
  }
  if (input.nisr.practices.length > 0) {
    lines.push(
      `Practices (% of farmers): ${input.nisr.practices.map((row) => `${row.name} ${row.value}`).join("; ")}.`,
    );
  }

  if (input.model) {
    const parts: string[] = [];
    if (input.model.rows) parts.push(`${input.model.rows} crop observations`);
    if (input.model.districts) parts.push(`${input.model.districts} districts`);
    if (input.model.crops) parts.push(`${input.model.crops} crops`);
    if (input.model.seasons) parts.push(`${input.model.seasons} seasons`);
    lines.push(
      `Trained model on the NISR Seasonal Agricultural Survey 2025 microdata` +
        (parts.length > 0 ? ` (${parts.join(", ")})` : "") +
        ": " +
        [
          input.model.testAuc != null ? `classifier AUC ${round(input.model.testAuc, 3)}` : null,
          input.model.testAccuracy != null
            ? `accuracy ${round(input.model.testAccuracy, 3)}`
            : null,
          input.model.testR2 != null ? `yield R2 ${round(input.model.testR2, 3)}` : null,
          input.model.testMae != null ? `yield error ${round(input.model.testMae, 2)} t/ha` : null,
        ]
          .filter(Boolean)
          .join(", ") +
        ".",
    );
    if (input.model.byCrop?.length) {
      lines.push(
        `Measured yield per crop (t/ha, survey average): ` +
          input.model.byCrop
            .map((row) => `${row.crop} ${round(row.actual, 2)} (n=${row.n})`)
            .join("; ") +
          ".",
      );
    }
  }

  if (input.climate) {
    lines.push(
      `${input.district} climate (${input.climate.period} record): ` +
        `season ${input.season ?? "not set"} — ${round(input.climate.rainMm, 0)} mm rain, ${round(input.climate.tempC, 1)} °C mean temperature.`,
    );
  } else {
    lines.push(`${input.district} climate: not available in this session.`);
  }

  if (input.outlook.length > 0) {
    lines.push(
      `Forecast for ${input.district} (Open-Meteo): ` +
        input.outlook
          .map(
            (day) =>
              `${day.day} ${round(day.rainMm, 0)} mm, ${round(day.tempMinC, 0)}–${round(day.tempMaxC, 0)} °C` +
              (day.sky ? `, ${day.sky}` : "") +
              (day.rainWindow ? `, rain likely ${day.rainWindow}` : ""),
          )
          .join("; ") +
        ".",
    );
  }

  return lines.join("\n");
}

export function buildAgronomistSystemPrompt(digest: string): string {
  return [
    "You are the analyst assistant of ImbutoSmart AI, helping agronomists and extension officers in Rwanda.",
    "Answer in plain English, under 200 words, with a short list of concrete next steps when the question asks for action.",
    "Write plain text: no markdown, no bold, no tables. Use short lines and plain sentences, because the answer is read as it is written.",
    "Answer the question that was asked. Do not list every figure in the data and do not repeat yourself; give the figures the question needs.",
    "The data below is the whole of what you know. Follow these rules:",
    "- Use only the figures in the data. Never state a number that is not there, and never estimate one.",
    "- Never give an application rate, a spacing, a depth or a price: the data holds none of them.",
    "- If the answer needs a figure that is missing, say which figure is missing and where it comes from (the NISR Seasonal Agricultural Survey, the model report, or Meteo Rwanda).",
    "- Say plainly when a figure is a national average and the question is about one district.",
    "- Do not forecast prices, recommend policy, or claim a treatment will work for certain.",
    "- If the question is unrelated to agriculture in Rwanda, say you can only help with agricultural questions.",
    "",
    "Data:",
    digest,
  ].join("\n");
}
