import { describe, expect, it } from "vitest";
import { getSeasonGuide, seasonInputSchema } from "../lib/season-guide";

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