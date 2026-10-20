import { describe, expect, it } from "vitest";
import {
  AHS_CROPS,
  AHS_SOURCE,
  RSAS_METHODOLOGY,
  ahsCopy,
  ahsCropShare,
  ahsSeasonRanking,
  ahsShareLine,
  monthToAhsSeason,
} from "../lib/ahs-crops";

describe("NISR AHS 2024 crop reference", () => {
  it("cites the NISR source", () => {
    expect(AHS_SOURCE.publisher).toContain("National Institute of Statistics of Rwanda");
    expect(AHS_SOURCE.url).toBe("https://www.statistics.gov.rw");
  });

  it("covers nine staple crops with at least one published season", () => {
    expect(AHS_CROPS).toHaveLength(9);
    for (const crop of AHS_CROPS) {
      const seasons = (["A", "B", "C"] as const).map((s) => ahsCropShare(crop, s));
      expect(seasons.some((v) => v !== null)).toBe(true);
    }
  });

  it("keeps unpublished seasons unavailable rather than inferring them", () => {
    expect(ahsCropShare("Maize", "C")).toBeNull();
    expect(ahsCropShare("Wheat", "C")).toBeNull();
    expect(ahsCropShare("Beans", "C")).toBe(19.3);
  });

  it("matches the published figures for the prose-confirmed crops", () => {
    expect(ahsCropShare("Beans", "A")).toBe(89.8);
    expect(ahsCropShare("Beans", "B")).toBe(83.3);
    expect(ahsCropShare("Maize", "A")).toBe(80.8);
    expect(ahsCropShare("Maize", "B")).toBe(42.4);
    expect(ahsCropShare("Cassava", "A")).toBe(52.8);
    expect(ahsCropShare("Cassava", "B")).toBe(49.6);
    expect(ahsCropShare("Sweet Potato", "A")).toBe(45.9);
    expect(ahsCropShare("Sweet Potato", "B")).toBe(55.4);
    expect(ahsCropShare("Banana", "A")).toBe(70.6);
    expect(ahsCropShare("Banana", "B")).toBe(73.9);
  });

  it("ranks most-grown first and excludes unavailable values", () => {
    const ranking = ahsSeasonRanking("A");
    const shares = ranking.map((r) => r.share);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    expect(ranking.every((r) => r.share !== null)).toBe(true);
    expect(ranking[0]?.crop).toBe("Beans");
  });

  it("maps months to seasons and leaves the September transition unset", () => {
    expect(monthToAhsSeason(10)).toBe("A");
    expect(monthToAhsSeason(1)).toBe("A");
    expect(monthToAhsSeason(2)).toBe("A");
    expect(monthToAhsSeason(3)).toBe("B");
    expect(monthToAhsSeason(6)).toBe("B");
    expect(monthToAhsSeason(7)).toBe("C");
    expect(monthToAhsSeason(8)).toBe("C");
    expect(monthToAhsSeason(9)).toBeNull();
    expect(monthToAhsSeason(0)).toBeNull();
    expect(monthToAhsSeason(13)).toBeNull();
  });

  it("provides every string in all three languages", () => {
    for (const language of ["en", "rw", "fr"] as const) {
      const copy = ahsCopy[language];
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.label).toContain("{share}");
      expect(copy.label).toContain("{crop}");
      expect(copy.label).toContain("{season}");
      expect(copy.seasonNote).toContain("{season}");
      expect(copy.unavailable.length).toBeGreaterThan(0);
      expect(copy.transition.length).toBeGreaterThan(0);
      expect(copy.source.length).toBeGreaterThan(0);
      expect(copy.note.length).toBeGreaterThan(0);
      expect(copy.methodology.length).toBeGreaterThan(0);
    }
  });

  it("cites the RSAS methodology without attaching figures to it", () => {
    expect(RSAS_METHODOLOGY.survey).toContain("Seasonal Agriculture Survey");
    expect(RSAS_METHODOLOGY.archive).toContain("NISR");
  });

  it("builds a share line and an unavailable line", () => {
    expect(ahsShareLine("en", "Beans", "A", "Season A")).toBe("89.8% of farming households grew Beans in Season A.");
    expect(ahsShareLine("en", "Maize", "C", "Season C")).toContain("does not report");
  });
});
