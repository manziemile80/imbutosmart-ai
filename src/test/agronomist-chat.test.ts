import { describe, expect, it } from "vitest";

import {
  buildAgronomistDigest,
  buildAgronomistSystemPrompt,
  type AgronomistDigestInput,
} from "@/lib/agronomist-chat";

const input: AgronomistDigestInput = {
  district: "Musanze",
  season: "A",
  nisr: {
    totalLandMha: 2.376,
    agriculturalLandMha: 1.414,
    agriculturalShare: 59,
    land: [{ name: "Seasonal crops", value: 1.022 }],
    inputs: [{ name: "Improved seeds", small: 19.4, large: 65 }],
    practices: [{ name: "Irrigation", value: 13.1 }],
  },
  model: {
    rows: 51225,
    districts: 30,
    crops: 12,
    seasons: 3,
    testAccuracy: 0.876,
    testAuc: 0.936,
    testR2: 0.814,
    testMae: 1.5,
    byCrop: [{ crop: "Maize", actual: 1.83, predicted: 1.9, n: 6865 }],
  },
  climate: { period: "2001-2020", rainMm: 953, tempC: 17.4 },
  outlook: [
    {
      day: "2026-10-23",
      rainMm: 12,
      tempMinC: 14,
      tempMaxC: 24,
      rainWindow: "13:00-17:00",
      sky: "Slight rain",
    },
  ],
};

describe("agronomist digest", () => {
  it("carries the figures the page is showing", () => {
    const digest = buildAgronomistDigest(input);
    expect(digest).toContain("2.376 M ha");
    expect(digest).toContain("1.414 M ha");
    expect(digest).toContain("Improved seeds 19.4 / 65");
    expect(digest).toContain("51225 crop observations");
    expect(digest).toContain("classifier AUC 0.936");
    expect(digest).toContain("Maize 1.83 (n=6865)");
    expect(digest).toContain("953 mm rain");
    expect(digest).toContain("17.4 °C");
    expect(digest).toContain("2026-10-23 12 mm, 14–24 °C, Slight rain, rain likely 13:00-17:00");
  });

  it("says when a figure is missing instead of leaving a gap", () => {
    const digest = buildAgronomistDigest({ ...input, model: null, climate: null });
    expect(digest).toContain("Musanze climate: not available");
    expect(digest).not.toContain("classifier AUC");
  });

  it("tells the model to use the figures and nothing else", () => {
    const prompt = buildAgronomistSystemPrompt("DIGEST");
    expect(prompt).toContain("Use only the figures in the data");
    expect(prompt).toContain("Never state a number that is not there");
    expect(prompt).toContain("no markdown");
    expect(prompt).toContain("DIGEST");
  });
});
