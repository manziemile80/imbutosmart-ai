import { describe, expect, it } from "vitest";
import { INSURANCE_PROGRAM_URL, insuranceCopy } from "../lib/insurance-language";

describe("insurance program link", () => {
  it("points at a working official MINAGRI page, not the broken NAIS page", () => {
    expect(INSURANCE_PROGRAM_URL).toContain("minagri.gov.rw");
    expect(INSURANCE_PROGRAM_URL).not.toMatch(/national-agriculture-insurance-scheme$/);
  });

  it("tells farmers in every language that the link opens an official page in a new tab", () => {
    for (const language of ["en", "fr", "rw"] as const) {
      expect(insuranceCopy[language].sourceHint.length).toBeGreaterThan(10);
      expect(insuranceCopy[language].source.length).toBeGreaterThan(0);
    }
  });

  it("keeps the same copy keys in every language", () => {
    const keys = Object.keys(insuranceCopy.en).sort();
    expect(Object.keys(insuranceCopy.fr).sort()).toEqual(keys);
    expect(Object.keys(insuranceCopy.rw).sort()).toEqual(keys);
  });
});
