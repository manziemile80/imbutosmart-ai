import { geoArea, type GeoPermissibleObjects } from "d3-geo";
import source from "@/lib/rwanda-districts.json";

// GeoJSON uses counterclockwise exterior rings; d3's spherical projection uses
// clockwise rings. Normalize each polygon to its small terrestrial interior.
export const districtGeometry = {
  ...source,
  features: source.features.map((feature) => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: geoArea(feature.geometry as unknown as GeoPermissibleObjects) > 2 * Math.PI
        ? feature.geometry.coordinates.map((ring) => [...ring].reverse())
        : feature.geometry.coordinates,
    },
  })),
};