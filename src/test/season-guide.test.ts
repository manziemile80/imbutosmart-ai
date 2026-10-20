import { describe, expect, it } from "vitest";
import { getSeasonGuide, seasonInputSchema, statesMeasurement } from "../lib/season-guide";
import { seasonReferenceSummary } from "../lib/farmer-language";

describe("usual-season guidance", () => {
  it("supports exactly English, Kinyarwanda, and French for season advice", () => {
    expect(seasonInputSchema.shape.language.removeDefault().options).toEqual(["en", "rw", "fr"]);
    expect(seasonInputSchema.parse({ month: 10, district: "Musanze", language: "fr" }).language).toBe("fr");
  });
  it("accepts Kinyarwanda and rejects unsupported languages for AI advice", () => {
    expect(seasonInputSchema.parse({ month: 10, district: "Musanze", language: "rw" }).language).toBe("rw");
    expect(seasonInputSchema.safeParse({ month: 10, district: "Musanze", language: "unknown" }).success).toBe(false);
  });
  it("identifies October as Season A and short rains", () => {
    expect(getSeasonGuide(10)).toMatchObject({ farming: "Season A", local: "Umuhindo", rain: "Wetter period" });
  });
  it("identifies April as Season B and a wetter period", () => {
    expect(getSeasonGuide(4)).toMatchObject({ farming: "Season B", local: "Itumba", rain: "Wetter period" });
  });
  it("keeps June in Season B while recognizing dry conditions", () => {
    expect(getSeasonGuide(6)).toMatchObject({ farming: "Season B", rain: "Drier period" });
  });
  it("identifies July as Season C with drier conditions", () => {
    expect(getSeasonGuide(7)).toMatchObject({ farming: "Season C", rain: "Drier period" });
  });
  it("recognizes the September agricultural overlap", () => {
    expect(getSeasonGuide(9)).toMatchObject({ farming: "Seasons A & C", rain: "Variable" });
  });
  it("keeps January in Season A but shows the short dry period", () => {
    expect(getSeasonGuide(1)).toMatchObject({ farming: "Season A", local: "Urugaryi" });
  });
  it("rejects unknown months and districts", () => {
    expect(seasonInputSchema.safeParse({ month: 13, district: "Musanze" }).success).toBe(false);
    expect(seasonInputSchema.safeParse({ month: 10, district: "Unknown" }).success).toBe(false);
  });
});

describe("fabricated-measurement guard", () => {
  it("flags answers that state a rainfall, temperature or quantity figure", () => {
    expect(statesMeasurement("We usually get around 130 millimeters of rain in Musanze.")).toBe(true);
    expect(statesMeasurement("Temperatures reach 30 degrees this month.")).toBe(true);
    expect(statesMeasurement("Expect 80 percent germination.")).toBe(true);
    expect(statesMeasurement("Apply 2 kg per hectare.")).toBe(true);
  });
  it("allows qualitative answers that stay inside the reference guide", () => {
    expect(statesMeasurement("This month falls in Season B, from March to June.")).toBe(false);
    expect(statesMeasurement("March to May is a usual rainy period, but rainfall varies by place and year.")).toBe(false);
  });
  it("falls back to reference guidance that states no measurement", () => {
    for (const language of ["en", "rw", "fr"] as const) {
      const summary = seasonReferenceSummary(getSeasonGuide(4), language);
      expect(summary.length).toBeGreaterThan(20);
      expect(statesMeasurement(summary)).toBe(false);
    }
  });
  it("names the farming season, the climatic season and the usual rainfall level", () => {
    const summary = seasonReferenceSummary(getSeasonGuide(4), "en");
    expect(summary).toContain("Season B");
    expect(summary).toContain("Long rainy season");
    expect(summary).toContain("wetter period");
  });
});