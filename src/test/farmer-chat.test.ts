import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  chatCopy,
  farmerChatInputSchema,
  MAX_HISTORY_MESSAGES,
  recentHistory,
  suggestedQuestions,
} from "../lib/farmer-chat";

const user = (content: string) => ({ role: "user" as const, content });

describe("farmer Q&A assistant contract", () => {
  it("accepts a valid question and defaults the language to English", () => {
    const parsed = farmerChatInputSchema.parse({
      district: "Musanze",
      soil: "Volcanic",
      messages: [user("How do I plant maize?")],
    });
    expect(parsed.language).toBe("en");
  });

  it("supports exactly English, Kinyarwanda, and French", () => {
    expect(farmerChatInputSchema.shape.language.removeDefault().options).toEqual(["en", "rw", "fr"]);
  });

  it("rejects unknown districts, soils, and languages", () => {
    expect(farmerChatInputSchema.safeParse({ district: "Nowhere", soil: "Volcanic", messages: [user("hi")] }).success).toBe(false);
    expect(farmerChatInputSchema.safeParse({ district: "Musanze", soil: "Moon", messages: [user("hi")] }).success).toBe(false);
    expect(farmerChatInputSchema.safeParse({ district: "Musanze", soil: "Volcanic", language: "es", messages: [user("hi")] }).success).toBe(false);
  });

  it("rejects empty conversations and blank messages", () => {
    expect(farmerChatInputSchema.safeParse({ district: "Musanze", soil: "Volcanic", messages: [] }).success).toBe(false);
    expect(farmerChatInputSchema.safeParse({ district: "Musanze", soil: "Volcanic", messages: [user("   ")] }).success).toBe(false);
  });

  it("trims history to the most recent turns", () => {
    const many = Array.from({ length: MAX_HISTORY_MESSAGES + 4 }, (_, index) => user(`q${index}`));
    const kept = recentHistory(many);
    expect(kept).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(kept.at(-1)?.content).toBe(`q${MAX_HISTORY_MESSAGES + 3}`);
  });

  it("offers suggested questions and error copy in every language", () => {
    for (const language of ["en", "rw", "fr"] as const) {
      expect(suggestedQuestions(language).length).toBeGreaterThan(0);
      expect(Object.keys(chatCopy[language].errors).sort()).toEqual(["empty", "failed", "unconfigured"]);
    }
  });

  it("builds a language-specific system prompt with anti-fabrication rules", () => {
    const prompt = buildSystemPrompt("rw", "Musanze", "Volcanic");
    expect(prompt).toContain("Kinyarwanda");
    expect(prompt).toContain("Musanze");
    expect(prompt).toContain("Never invent");
  });
});
