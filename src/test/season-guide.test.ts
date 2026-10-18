import { describe, expect, it } from "vitest";
import { getSeasonGuide, seasonInputSchema } from "../lib/season-guide";

describe("usual-season guidance", () => {
  it("identifies October as Season A and short rains", () => {
    expect(getSeasonGuide(10)).toMatchObject({ farming: "Season A", local: "Umuhindo", rain: "Moderate to high" });
  });
  it("identifies April as Season B and high rainfall", () => {
    expect(getSeasonGuide(4)).toMatchObject({ farming: "Season B", local: "Itumba", rain: "High" });
  });
  it("keeps June in Season B while recognizing dry conditions", () => {
    expect(getSeasonGuide(6)).toMatchObject({ farming: "Season B", rain: "Low" });
  });
  it("identifies July as Season C with low rainfall", () => {
    expect(getSeasonGuide(7)).toMatchObject({ farming: "Season C", rain: "Low" });
  });
  it("keeps January in Season A but shows the short dry period", () => {
    expect(getSeasonGuide(1)).toMatchObject({ farming: "Season A", local: "Urugaryi" });
  });
  it("rejects unknown months and districts", () => {
    expect(seasonInputSchema.safeParse({ month: 13, district: "Musanze" }).success).toBe(false);
    expect(seasonInputSchema.safeParse({ month: 10, district: "Unknown" }).success).toBe(false);
  });
});