import { describe, expect, it } from "vitest";
import {
  CROP_KNOWLEDGE,
  CROP_NAMES,
  districtZone,
  findCrop,
  knowledgeCropLabel,
} from "../lib/crop-knowledge";
import { bandFor, recommendOffline } from "../lib/recommendation-engine";
import {
  buildLocalExplanation,
  engineInput,
  groundedSentences,
  recommendationInputSchema,
} from "../lib/recommendation";
import { recommendationCopy } from "../lib/recommendation-copy";
import { listPending, markSynced, saveRecommendation, trimOld } from "../lib/recommendation-store";

const fullInput = {
  district: "Musanze",
  soil: "Volcanic",
  soilPh: 6,
  landSizeHa: 0.5,
  season: "A" as const,
  rainfallMm: 900,
  temperatureC: 17,
  waterAvailability: "rainfed" as const,
  experience: "some" as const,
  preferredCrop: null,
  language: "en" as const,
};

describe("crop knowledge base", () => {
  it("covers the requested crops with complete reference data", () => {
    const requested = [
      "Maize",
      "Beans",
      "Irish Potato",
      "Sweet Potato",
      "Cassava",
      "Sorghum",
      "Wheat",
      "Rice",
      "Tomato",
      "Onion",
      "Cabbage",
    ];
    for (const crop of requested) expect(CROP_NAMES).toContain(crop);
    expect(CROP_NAMES.length).toBeGreaterThanOrEqual(11);
    for (const entry of CROP_KNOWLEDGE) {
      expect(Object.keys(entry.soils)).toHaveLength(6);
      expect(Object.keys(entry.zones).sort()).toEqual(["highland", "lowland", "midland"]);
      expect(Object.keys(entry.seasons).sort()).toEqual(["A", "B", "C"]);
      expect(entry.ph[0]).toBeLessThan(entry.ph[1]);
      expect(entry.temp[0]).toBeLessThan(entry.temp[1]);
      expect(entry.rain[0]).toBeLessThan(entry.rain[1]);
      expect([1, 2, 3]).toContain(entry.waterNeed);
      expect(entry.growingPeriod.length).toBeGreaterThan(0);
    }
  });

  it("maps every Rwandan district to a broad growing zone", () => {
    expect(districtZone("Musanze")).toBe("highland");
    expect(districtZone("Kirehe")).toBe("lowland");
    expect(districtZone("Kamonyi")).toBe("midland");
    // Unknown names fall back to the most common zone instead of throwing.
    expect(districtZone("Not a district")).toBe("midland");
  });

  it("localizes crop labels without touching the French catalog", () => {
    expect(knowledgeCropLabel("Tomato", "rw")).toBe("Inyanya");
    expect(knowledgeCropLabel("Maize", "en")).toBe("Maize");
    expect(findCrop("Rice")?.waterNeed).toBe(3);
  });
});

describe("offline recommendation engine", () => {
  it("maps scores to the four documented bands", () => {
    expect(bandFor(100)).toBe("highly");
    expect(bandFor(80)).toBe("highly");
    expect(bandFor(79)).toBe("suitable");
    expect(bandFor(60)).toBe("suitable");
    expect(bandFor(59)).toBe("moderate");
    expect(bandFor(40)).toBe("moderate");
    expect(bandFor(39)).toBe("low");
    expect(bandFor(0)).toBe("low");
  });

  it("returns a scored primary crop and three alternatives", () => {
    const result = recommendOffline(fullInput);
    expect(result.primary.score).toBeGreaterThanOrEqual(0);
    expect(result.primary.score).toBeLessThanOrEqual(100);
    expect(result.primary.factors).toHaveLength(7);
    expect(result.alternatives).toHaveLength(3);
    expect(result.alternatives.every((a) => a.crop !== result.primary.crop)).toBe(true);
    expect(result.missingFactors).toHaveLength(0);
  });

  it("still recommends from partial information and reports what is missing", () => {
    const result = recommendOffline({ district: "Huye", soil: "Loam" });
    expect(result.primary.score).toBeGreaterThan(0);
    expect(result.suppliedFactors).toEqual(["soil", "location"]);
    expect(result.missingFactors).toEqual(["ph", "climate", "rainfall", "season", "water"]);
  });

  it("keeps a preferred crop primary without inflating its honest score", () => {
    const preferred = recommendOffline({ ...fullInput, preferredCrop: "Cassava" });
    expect(preferred.primary.crop).toBe("Cassava");
    expect(preferred.primary.score).toBeLessThan(100);
    expect(preferred.alternatives).toHaveLength(3);
    expect(preferred.alternatives.every((a) => a.crop !== "Cassava")).toBe(true);
  });

  it("rewards irrigation for water-hungry rice", () => {
    const base = { ...fullInput, soil: "Clay" as const, rainfallMm: 1200, temperatureC: 25 };
    const irrigated = recommendOffline({ ...base, waterAvailability: "irrigated" });
    const limited = recommendOffline({ ...base, waterAvailability: "limited" });
    const scoreOf = (r: ReturnType<typeof recommendOffline>) =>
      [...r.alternatives, r.primary].find((a) => a.crop === "Rice")?.score ?? 0;
    expect(scoreOf(irrigated)).toBeGreaterThan(scoreOf(limited));
  });
});

describe("recommendation input contract", () => {
  it("accepts a minimal request and defaults the language", () => {
    const parsed = recommendationInputSchema.parse({ district: "Gasabo", soil: "Loam" });
    expect(parsed.language).toBe("en");
    expect(parsed.season).toBeUndefined();
  });

  it("rejects unknown districts and soils", () => {
    expect(
      recommendationInputSchema.safeParse({ district: "Atlantis", soil: "Loam" }).success,
    ).toBe(false);
    expect(
      recommendationInputSchema.safeParse({ district: "Gasabo", soil: "Moon dust" }).success,
    ).toBe(false);
  });

  it("validates the language code used for AI advice", () => {
    expect(
      recommendationInputSchema.safeParse({ district: "Gasabo", soil: "Loam", language: "rw" })
        .success,
    ).toBe(true);
    expect(
      recommendationInputSchema.safeParse({ district: "Gasabo", soil: "Loam", language: "de" })
        .success,
    ).toBe(false);
  });
});

describe("deterministic local explanation", () => {
  it("explains the engine's pick with supplied facts only", () => {
    const input = recommendationInputSchema.parse(fullInput);
    const result = buildLocalExplanation(recommendOffline(engineInput(input)), input, "en");
    expect(result.source).toBe("local-engine");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.soilConditions).toContain("pH");
    expect(result.waterNeeds.length).toBeGreaterThan(0);
    expect(result.alternatives).toHaveLength(3);
    expect(result.missingFactors).toHaveLength(0);
  });

  it("localizes the growing period and labels", () => {
    const input = recommendationInputSchema.parse({ ...fullInput, language: "rw" });
    const result = buildLocalExplanation(recommendOffline(engineInput(input)), input, "rw");
    expect(result.growingPeriod).not.toMatch(/days|months/);
    expect(result.soilConditions).not.toMatch(/Best soils/);
  });
});

describe("AI grounding guard", () => {
  it("keeps sentences that only repeat figures the farmer supplied", () => {
    const input = recommendationInputSchema.parse(fullInput);
    const kept = groundedSentences(
      ["Your 900 mm of rain suits maize.", "Expect 2.5 t/ha this season.", "Plant in Season A."],
      input,
    );
    expect(kept).toContain("Your 900 mm of rain suits maize.");
    expect(kept).toContain("Plant in Season A.");
    expect(kept.some((line) => line.includes("2.5"))).toBe(false);
  });

  it("drops every sentence when a figure was never supplied", () => {
    const input = recommendationInputSchema.parse({ district: "Gasabo", soil: "Loam" });
    expect(groundedSentences(["Yields reach 4 t/ha with 12% more profit."], input)).toHaveLength(0);
  });
});

describe("recommendation copy", () => {
  function keys(value: unknown): string[] {
    if (typeof value !== "object" || value === null) return [];
    return Object.entries(value).flatMap(([key, child]) => [
      key,
      ...keys(child).map((inner) => `${key}.${inner}`),
    ]);
  }

  it("is complete in every language", () => {
    const en = keys(recommendationCopy.en).sort();
    expect(keys(recommendationCopy.rw).sort()).toEqual(en);
    expect(keys(recommendationCopy.fr).sort()).toEqual(en);
  });

  it("states the required disclaimer and never promises a harvest", () => {
    expect(recommendationCopy.en.result.warning).toContain("estimates based on available data");
    for (const language of ["en", "rw", "fr"] as const) {
      expect(recommendationCopy[language].result.warning.length).toBeGreaterThan(20);
      expect(recommendationCopy[language].mode.offlineNote.length).toBeGreaterThan(10);
    }
  });
});

describe("offline storage queue", () => {
  it("saves locally, queues for sync, then marks synced", async () => {
    const input = recommendationInputSchema.parse(fullInput);
    const result = buildLocalExplanation(recommendOffline(engineInput(input)), input, "en");
    const before = (await listPending()).length;
    const record = await saveRecommendation(input, result, "pending");
    expect(record.syncState).toBe("pending");
    const pending = await listPending();
    expect(pending.length).toBe(before + 1);
    expect(pending.some((entry) => entry.id === record.id)).toBe(true);
    await markSynced([record.id]);
    const after = await listPending();
    expect(after.some((entry) => entry.id === record.id)).toBe(false);
    await trimOld();
  });
});
