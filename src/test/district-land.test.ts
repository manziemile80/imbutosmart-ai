import { describe, expect, it } from "vitest";
import { landShare, parseDistrictLand } from "@/lib/district-land";

const header = "district,crops_ha,pasture_ha,fallow_ha\n";
describe("district land figures", () => {
  it("calculates each of the three land shares from supplied hectares", () => {
    const rows = parseDistrictLand(header + "Ngoma,60,30,10");
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (!row) throw new Error("Missing imported row");
    expect(landShare(row, "crops_ha")).toBe(0.6);
    expect(landShare(row, "pasture_ha")).toBe(0.3);
    expect(landShare(row, "fallow_ha")).toBe(0.1);
  });
  it("does not fabricate missing district rows", () => {
    expect(parseDistrictLand(header + "Ngoma,60,30,10").find((r) => r.district === "Musanze")).toBeUndefined();
  });
  it("leaves zero-total shares unavailable", () => {
    expect(landShare({ district: "Ngoma", crops_ha: 0, pasture_ha: 0, fallow_ha: 0 }, "crops_ha")).toBeNull();
  });
  it("rejects missing area values rather than turning them into zero", () => {
    expect(() => parseDistrictLand(header + "Ngoma,60,,10")).toThrow("nonnegative");
  });
  it("rejects negative areas", () => {
    expect(() => parseDistrictLand(header + "Ngoma,60,-1,10")).toThrow("nonnegative");
  });
  it("rejects duplicate districts", () => {
    expect(() => parseDistrictLand(header + "Ngoma,60,30,10\nngoma,1,2,3")).toThrow("duplicate");
  });
});