import { describe, expect, it } from "vitest";

import { buildPlanSummary } from "@/lib/plan-summary";
import { districtInputs } from "@/lib/advice";

const profile = districtInputs["Musanze"] ?? null;

describe("plan summary", () => {
  it("lists the crops, the inputs and the insurance line", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [{ crop: "Maize", score: 86 }],
      profile,
      climate: { rainMm: 953, tempC: 17.4 },
      language: "en",
    });

    expect(summary.crops[0]).toEqual({ crop: "Maize", score: 86 });
    expect(summary.inputs.length).toBeGreaterThan(0);
    expect(summary.inputs[0]?.share).toBeGreaterThan(0);
    expect(summary.insurance).toContain("Insurance");
    expect(summary.insuranceNote).toContain("licensed insurer");
  });

  it("quotes the rate farmers applied the input at", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [],
      profile,
      climate: null,
      language: "en",
    });

    const withRate = summary.inputs.find((input) => input.rateKgPerHa);
    expect(withRate?.rateKgPerHa).toBeGreaterThan(0);
  });

  it("adds advice only from what the district record holds", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [],
      profile,
      climate: null,
      language: "en",
    });

    // Musanze: little irrigation, a quarter of the fields eroded.
    expect(summary.advice.join(" ")).toContain("irrigate");
    expect(summary.advice.join(" ")).toContain("erosion");
    expect(summary.advice.join(" ")).toContain("soil test");
  });

  it("speaks the farmer's language", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [],
      profile,
      climate: null,
      language: "rw",
    });

    expect(summary.insurance).toContain("Ubwishingizi");
    expect(summary.advice[0]).toMatch(/Hingira|hinga/);
  });
});
