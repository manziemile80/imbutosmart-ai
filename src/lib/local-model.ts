import type { Prediction } from "./api";

// Built-in estimator used when the Python prediction server is not connected.
// Crop needs are general agronomic ranges for Rwanda; yields are typical t/ha.
type Crop = { crop: string; rain: [number, number]; temp: [number, number]; yield: number; soils: Record<string, number> };

const CROPS: Crop[] = [
  { crop: "Irish Potato", rain: [350, 700], temp: [14, 21], yield: 12, soils: { Volcanic: 1, Loam: 0.9, Humic: 0.85, Clay: 0.6, Sandy: 0.6, Laterite: 0.5 } },
  { crop: "Maize", rain: [400, 800], temp: [18, 27], yield: 2.5, soils: { Loam: 1, Volcanic: 0.9, Clay: 0.8, Humic: 0.85, Laterite: 0.6, Sandy: 0.55 } },
  { crop: "Beans", rain: [300, 600], temp: [16, 26], yield: 1.0, soils: { Loam: 1, Volcanic: 0.9, Humic: 0.9, Clay: 0.7, Sandy: 0.65, Laterite: 0.6 } },
  { crop: "Cassava", rain: [500, 1500], temp: [20, 30], yield: 14, soils: { Sandy: 1, Laterite: 0.95, Loam: 0.9, Clay: 0.6, Humic: 0.7, Volcanic: 0.6 } },
  { crop: "Sorghum", rain: [250, 600], temp: [20, 30], yield: 1.4, soils: { Clay: 1, Loam: 0.9, Sandy: 0.8, Laterite: 0.8, Volcanic: 0.7, Humic: 0.7 } },
  { crop: "Rice", rain: [800, 1800], temp: [20, 30], yield: 5, soils: { Clay: 1, Humic: 0.9, Loam: 0.7, Volcanic: 0.4, Sandy: 0.3, Laterite: 0.4 } },
  { crop: "Banana", rain: [600, 1500], temp: [18, 28], yield: 15, soils: { Loam: 1, Humic: 0.95, Volcanic: 0.85, Clay: 0.75, Laterite: 0.6, Sandy: 0.5 } },
  { crop: "Sweet Potato", rain: [350, 900], temp: [18, 28], yield: 7, soils: { Sandy: 1, Loam: 0.95, Laterite: 0.85, Volcanic: 0.8, Humic: 0.8, Clay: 0.55 } },
  { crop: "Wheat", rain: [350, 650], temp: [12, 20], yield: 2, soils: { Volcanic: 1, Loam: 0.9, Humic: 0.85, Clay: 0.7, Sandy: 0.5, Laterite: 0.5 } },
];

function fit(v: number, [lo, hi]: [number, number]) {
  if (v >= lo && v <= hi) return 1;
  const width = hi - lo;
  const dist = v < lo ? lo - v : v - hi;
  return Math.max(0, 1 - dist / (width * 0.6));
}

export function scoreCrops(input: { soil_type: string; forecast_rain_mm: number; forecast_temp_c: number }) {
  return CROPS.map((c) => {
    const soil = c.soils[input.soil_type] ?? 0.6;
    const p = Math.min(0.97, 0.15 + 0.85 * fit(input.forecast_rain_mm, c.rain) * fit(input.forecast_temp_c, c.temp) * soil);
    const y = c.yield * (0.4 + 0.6 * p);
    return { crop: c.crop, success_probability: p, expected_yield_t_ha: y, rel: p * (y / c.yield) };
  }).sort((a, b) => b.success_probability - a.success_probability || b.rel - a.rel);
}

export function localPredict(input: { soil_type: string; forecast_rain_mm: number; forecast_temp_c: number }): Prediction {
  const ranked = scoreCrops(input).map(({ rel: _r, ...r }) => r);
  const best = ranked[0];
  return {
    recommended_crop: best.crop,
    confidence: best.success_probability,
    expected_yield_t_ha: best.expected_yield_t_ha,
    alternatives: ranked.slice(1, 4),
  };
}

// NISR Seasonal Agricultural Survey, 2026 Season B (from the uploaded report).
export const NISR_2026B = {
  land: [
    { name: "Seasonal crops", value: 1.022 },
    { name: "Permanent crops", value: 0.526 },
    { name: "Permanent pasture", value: 0.083 },
  ],
  totalLand: 2.376,
  agriLand: 1.414,
  inputs: [
    { name: "Improved seeds", all: 20.9, small: 19.4, large: 65 },
    { name: "Organic fertilizer", all: 81.3, small: 81.7, large: 71.3 },
    { name: "Inorganic fertilizer", all: 57.5, small: 56.7, large: 80.2 },
    { name: "Pesticides", all: 39.1, small: 37.7, large: 80 },
  ],
  practices: [
    { name: "Agroforestry", value: 58 },
    { name: "Irrigation", value: 13.1 },
    { name: "Mechanisation", value: 1.8 },
  ],
};
