import { describe, expect, it } from "vitest";

import {
  buildAdviceDigest,
  buildAdvicePrompt,
  districtInputs,
  explainInput,
  inputName,
} from "@/lib/advice";

describe("advice", () => {
  it("has the survey profile of every district", () => {
    expect(Object.keys(districtInputs)).toHaveLength(30);
    const musanze = districtInputs["Musanze"];
    expect(musanze?.usedShare).toBeGreaterThan(0.5);
    expect(musanze?.inorganic["DAP"]).toBeGreaterThan(0);
    expect(musanze?.organic["Manure"]).toBeGreaterThan(0);
  });

  it("explains the input names in plain words", () => {
    expect(explainInput("DAP", "en")).toContain("phosphorus");
    expect(explainInput("Manure", "fr")).toContain("Fumier");
    expect(explainInput("Urea", "rw")).toBeTruthy();
    expect(explainInput("Something else", "en")).toBeNull();
  });

  it("names the inputs the way the farmer's language does", () => {
    // In Kinyarwanda manure is "ifumbire", not the English word.
    expect(inputName("Manure", "rw")).toBe("Ifumbire y'amatungo");
    expect(inputName("Compost", "rw")).toContain("Ifumbire");
    expect(inputName("Green manure", "rw")).toContain("Ifumbire");
    expect(inputName("Manure", "fr")).toBe("Fumier");
    expect(inputName("DAP", "rw")).toBe("DAP");
    // A name the survey uses that has no translation is left as it is.
    expect(inputName("Omax", "rw")).toBe("Omax");
  });

  it("explains manure as fertiliser in Kinyarwanda", () => {
    expect(explainInput("Manure", "rw")).toContain("Ifumbire y’amatungo");
  });

  it("writes the digest from the facts of the page", () => {
    const digest = buildAdviceDigest({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [
        { crop: "Maize", score: 86, band: "highly", growingPeriod: "90–120 days", soilFit: 0.9 },
      ],
      inputs: districtInputs["Musanze"] ?? null,
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
    });
    expect(digest).toContain("district Musanze, soil Volcanic");
    expect(digest).toContain("Maize 86");
    expect(digest).toContain("NPK 17-17-17");
    expect(digest).toContain("953 mm rain");
    expect(digest).toContain("Slight rain");
  });

  it("tells the model to use the facts and nothing else", () => {
    const prompt = buildAdvicePrompt("DIGEST", "rw", "plan");
    expect(prompt).toContain("Kinyarwanda");
    expect(prompt).toContain("Never state a number that is not there");
    expect(prompt).toContain("DIGEST");

    const simple = buildAdvicePrompt("DIGEST", "en", "simple");
    expect(simple).toContain("very short sentences");
  });
});
