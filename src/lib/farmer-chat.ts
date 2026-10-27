import { z } from "zod";
import { DISTRICTS, SOILS } from "./api";
import type { AiErrorCode } from "./ai/error-codes";

// Browser-safe definition of the farmer Q&A assistant: input validation,
// suggested prompts, and the farmer-facing copy. Kept free of server-only
// imports so the form and the server function share one contract.

export const MAX_QUESTION_LENGTH = 500;
// How many of the most recent turns are sent to the model.
export const MAX_HISTORY_MESSAGES = 8;
// Upper bound on the whole on-screen thread, so the RPC payload stays bounded.
export const MAX_THREAD_MESSAGES = 40;
// Generous cap that also covers assistant answers (asked to stay under ~180 words).
export const MAX_MESSAGE_LENGTH = 4000;

export const farmerChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export const farmerChatInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value), "Choose a district."),
  soil: z.string().refine((value) => SOILS.includes(value), "Choose a soil type."),
  language: z.enum(["en", "rw", "fr"]).default("en"),
  messages: z.array(farmerChatMessageSchema).min(1).max(MAX_THREAD_MESSAGES),
});

export type FarmerChatInput = z.infer<typeof farmerChatInputSchema>;
export type FarmerChatMessage = z.infer<typeof farmerChatMessageSchema>;

// Trimmed to the last few turns so the payload stays bounded while the on-screen
// thread keeps the full conversation.
export function recentHistory(messages: FarmerChatMessage[]): FarmerChatMessage[] {
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

const suggested: Record<"en" | "rw" | "fr", string[]> = {
  en: [
    "Which crops suit my soil this season?",
    "How can I prepare my land before the rains?",
    "How do I control pests on maize without harmful chemicals?",
    "How can I store my harvest safely?",
  ],
  rw: [
    "Ni ibihe bihingwa bibereye ubutaka bwanjye muri iki gihembwe?",
    "Nategura nte ubutaka mbere y’imvura?",
    "Nakumira nte udukoko ku bigori nta muti wanduye?",
    "Nabika nte umusaruro wanjye neza?",
  ],
  fr: [
    "Quelles cultures conviennent à mon sol cette saison ?",
    "Comment préparer mon terrain avant les pluies ?",
    "Comment lutter contre les ravageurs du maïs sans produits nocifs ?",
    "Comment stocker ma récolte en toute sécurité ?",
  ],
};

export function suggestedQuestions(language: "en" | "rw" | "fr"): string[] {
  return suggested[language];
}

export const chatCopy: Record<
  "en" | "rw" | "fr",
  {
    heading: string;
    intro: string;
    placeholder: string;
    send: string;
    thinking: string;
    suggestions: string;
    clear: string;
    you: string;
    assistant: string;
    disclaimer: string;
    empty: string;
    tooLong: string;
    errors: Record<AiErrorCode, string>;
  }
> = {
  en: {
    heading: "Ask about your farm",
    intro:
      "Ask a question about your crops, soil or season. Answers use the district and soil you selected and general agronomic knowledge — always confirm important decisions with a local agronomist.",
    placeholder: "Type your question…",
    send: "Send",
    thinking: "Thinking…",
    suggestions: "Example questions",
    clear: "Clear chat",
    you: "You",
    assistant: "AI assistant",
    disclaimer:
      "General guidance only — not live weather, a diagnosis, or a guarantee. Confirm with a local agronomist and Meteo Rwanda before acting.",
    empty: "Type a question before sending.",
    tooLong: `Keep each question under ${MAX_QUESTION_LENGTH} characters.`,
    errors: {
      unconfigured:
        "AI assistance is not configured yet. Crop estimates and the season guide remain available.",
      failed: "The assistant could not answer just now. Please try again.",
      empty: "The assistant returned no answer. Please try rephrasing your question.",
    },
  },
  rw: {
    heading: "Baza ku murima wawe",
    intro:
      "Baza ikibazo ku bihingwa, ubutaka cyangwa igihembwe. Ibisubizo bikoresha akarere n’ubutaka wahisemo hamwe n’ubumenyi rusange bw’ubuhinzi — ibyemezo by’ingirakamaro buri gihe bijyane n’impuguke y’ubuhinzi yo hafi yawe.",
    placeholder: "Andika ikibazo cyawe…",
    send: "Ohereza",
    thinking: "Turatekereza…",
    suggestions: "Ingero z’ibibazo",
    clear: "Gusiba ikiganiro",
    you: "Wowe",
    assistant: "Umufasha wa AI",
    disclaimer:
      "Ni inama rusange gusa — si amakuru y’ikirere ariho, isuzuma, cyangwa isezerano. Emeza n’impuguke y’ubuhinzi yo hafi yawe na Meteo Rwanda mbere yo kubikora.",
    empty: "Andika ikibazo mbere yo kohereza.",
    tooLong: `Koresha inyuguti zitarenze ${MAX_QUESTION_LENGTH} kuri buri kibazo.`,
    errors: {
      unconfigured:
        "Umufasha wa AI ntarashyirwaho kuri seriveri. Ibigereranyo by’ibihingwa n’amakuru y’ibihembwe biracyaboneka.",
      failed: "Umufasha ntiyashoboye gusubiza ubu. Ongera ugerageze.",
      empty: "Umufasha nta gisubizo yatanze. Ongera ugerageze uhindure ikibazo.",
    },
  },
  fr: {
    heading: "Posez une question sur votre exploitation",
    intro:
      "Posez une question sur vos cultures, votre sol ou la saison. Les réponses utilisent le district et le sol sélectionnés ainsi que des connaissances agronomiques générales — confirmez toujours les décisions importantes avec un agronome local.",
    placeholder: "Écrivez votre question…",
    send: "Envoyer",
    thinking: "Réflexion…",
    suggestions: "Exemples de questions",
    clear: "Effacer la discussion",
    you: "Vous",
    assistant: "Assistant IA",
    disclaimer:
      "Conseils généraux uniquement — pas de météo en direct, de diagnostic ni de garantie. Confirmez avec un agronome local et Meteo Rwanda avant d’agir.",
    empty: "Écrivez une question avant d’envoyer.",
    tooLong: `Gardez chaque question sous ${MAX_QUESTION_LENGTH} caractères.`,
    errors: {
      unconfigured:
        "L’assistance IA n’est pas encore configurée. Les estimations de cultures et le guide des saisons restent disponibles.",
      failed: "L’assistant n’a pas pu répondre pour l’instant. Veuillez réessayer.",
      empty: "L’assistant n’a renvoyé aucune réponse. Reformulez votre question.",
    },
  },
};

export function buildSystemPrompt(
  language: "en" | "rw" | "fr",
  district: string,
  soil: string,
): string {
  const languageName =
    language === "rw"
      ? "Kinyarwanda (write the entire answer in Kinyarwanda)"
      : language === "fr"
        ? "French (write the entire answer in French)"
        : "English";
  return [
    `You are the farming assistant of ImbutoSmart AI, helping smallholder farmers in Rwanda.`,
    `Answer in simple ${languageName}. Keep answers under 180 words, practical, and easy to read. No markdown tables or headings.`,
    `The farmer is in ${district} district with ${soil} soil.`,
    `Rules you must follow:`,
    `- Give general agronomic guidance only; you have no live weather, no district measurements, and no soil test results.`,
    `- Never invent rainfall amounts, temperatures, probabilities, prices, yields, or guarantees, and never claim a treatment is certain to work.`,
    `- If the question needs live weather, a soil test, or a diagnosis, say what the farmer should check and point to Meteo Rwanda or a local agronomist.`,
    `- Prefer low-cost, safe, environmentally sound practices; never recommend banned or hazardous pesticides.`,
    `- If the question is unrelated to farming in Rwanda, politely say you can only help with farming questions.`,
  ].join("\n");
}
