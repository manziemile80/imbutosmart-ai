import { describe, expect, it } from "vitest";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { districtGeometry } from "@/lib/district-geometry";
import { DISTRICTS } from "@/lib/api";

describe("Rwanda district geometry", () => {
  it("contains all 30 named districts", () => {
    expect(districtGeometry.features.map((f) => f.properties.shapeName).sort()).toEqual([...DISTRICTS].sort());
  });
  it("projects local district polygons instead of the complement of the globe", () => {
    const geometry = districtGeometry as unknown as GeoPermissibleObjects;
    const path = geoPath(geoMercator().fitExtent([[20, 20], [580, 470]], geometry));
    const first = districtGeometry.features[0];
    if (!first) throw new Error("No boundaries");
    const [[x0, y0], [x1, y1]] = path.bounds(first as unknown as GeoPermissibleObjects);
    expect(x1 - x0).toBeGreaterThan(10);
    expect(x1 - x0).toBeLessThan(250);
    expect(y1 - y0).toBeGreaterThan(10);
    expect(y1 - y0).toBeLessThan(250);
  });
});