import { describe, expect, it } from "vitest";

import { groundToDigest } from "@/lib/grounding";

const digest = [
  "Farmer's field: district Musanze, soil Volcanic, planting season A.",
  "Crops that suit this field: Maize 86 (highly), soil fit 0.9, growing period 90-120 days.",
  "What farmers in Musanze used: 90% used any fertiliser. NPK 17-17-17 35%, DAP 22%.",
  "Musanze climate (2001-2020 record): 953 mm rain and 17.4 °C mean temperature.",
].join("\n");

describe("grounding", () => {
  it("keeps the lines that only quote the digest", () => {
    const answer = [
      "1. Plant Maize: it suits your volcanic soil in season A.",
      "2. Ask an agronomist for a soil test before you sow.",
    ].join("\n");
    expect(groundToDigest(answer, digest)).toContain("Plant Maize");
    expect(groundToDigest(answer, digest)).toContain("soil test");
  });

  it("drops a rate the model invented", () => {
    const answer = [
      "1. Apply 100 kg/ha DAP before sowing.",
      "2. Ask an agronomist for a soil test before you sow.",
    ].join("\n");
    const grounded = groundToDigest(answer, digest);
    expect(grounded).not.toContain("100 kg/ha");
    expect(grounded).toContain("soil test");
  });

  it("keeps a figure that is in the digest", () => {
    const answer = "Maize scored 86 here, and the season usually brings 953 mm of rain.";
    expect(groundToDigest(answer, digest)).toContain("86");
    expect(groundToDigest(answer, digest)).toContain("953");
  });

  it("leaves an empty answer empty", () => {
    expect(groundToDigest("", digest)).toBe("");
  });
});
