import { describe, expect, it } from "vitest";
import { toggleCoverage } from "@/lib/insurance-coverage";

describe("farmer coverage preferences", () => {
  it("allows multiple coverage types without replacing a previous choice", () => {
    const selected = toggleCoverage(toggleCoverage([], "excess-rain"), "drought");
    expect(selected).toEqual(["excess-rain", "drought"]);
  });
  it("deselects a coverage type without removing the other choices", () => {
    expect(toggleCoverage(["flood", "drought"], "flood")).toEqual(["drought"]);
  });
});