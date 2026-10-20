import { CROP_KNOWLEDGE, districtZone, type CropKnowledge } from "./crop-knowledge";

// Offline crop recommendation engine: a pure, browser-safe suitability
// scorer over the local knowledge base. It never claims a crop will grow —
// every score is described as suitability based on the information supplied.
//
// Suitability Score = soil + climate + rainfall + season + water + location,
// as weighted shares of the 0–100 total. Factors the farmer did not supply are
// excluded and their weight is redistributed across the factors that remain,
// so a recommendation still comes back from partial information.

export type RecommendationInput = {
  district?: string;
  soil?: string;
  soilPh?: number | null;
  landSize?: number | null;
  season?: string;
  rainfallMm?: number | null;
  temperatureC?: number | null;
  waterAvailability?: "rainfed" | "irrigated" | "limited" | null;
  experience?: "new" | "some" | "experienced" | null;
  preferredCrop?: string | null;
};

export type SuitabilityBand = "highly" | "suitable" | "moderate" | "low";

export type FactorScore = {
  id: "soil" | "ph" | "climate" | "rainfall" | "season" | "water" | "location";
  score: number; // 0..100 contribution weight actually earned
  weight: number; // 0..100 weight this factor carried when supplied
  supplied: boolean;
};

export type CropScore = {
  crop: string;
  score: number; // 0..100 overall suitability
  band: SuitabilityBand;
  factors: FactorScore[];
  growingPeriod: string;
};

export type EngineResult = {
  primary: CropScore;
  alternatives: CropScore[];
  suppliedFactors: string[];
  missingFactors: string[];
};

// Factor weights (sum to 100 when every factor is supplied).
const WEIGHTS = {
  soil: 25,
  climate: 15,
  rainfall: 15,
  season: 15,
  water: 15,
  location: 10,
  ph: 5,
} as const;

export function bandFor(score: number): SuitabilityBand {
  if (score >= 80) return "highly";
  if (score >= 60) return "suitable";
  if (score >= 40) return "moderate";
  return "low";
}

// Linear fit: 1 inside the preferred range, falling to 0 at the stated
// tolerance beyond either edge. Used for pH, temperature and rainfall.
function rangeFit(value: number, [low, high]: [number, number], tolerance: number): number {
  if (value >= low && value <= high) return 1;
  const edge = value < low ? low - value : value - high;
  return Math.max(0, 1 - edge / tolerance);
}

// Water availability fits a crop's need: irrigated meets any need, rainfed
// suits moderate/low needs, limited water only suits crops marked low-need.
function waterFit(need: 1 | 2 | 3, availability: RecommendationInput["waterAvailability"]): number {
  if (!availability) return 0;
  if (availability === "irrigated") return 1;
  const supply = availability === "rainfed" ? 2 : 1;
  return Math.max(0, 1 - Math.abs(need - supply) * 0.5);
}

function scoreCrop(entry: CropKnowledge, input: RecommendationInput): CropScore {
  const factors: FactorScore[] = [];
  const push = (id: FactorScore["id"], supplied: boolean, fit: number) => {
    factors.push({
      id,
      supplied,
      weight: WEIGHTS[id],
      score: supplied ? Math.round(fit * WEIGHTS[id]) : 0,
    });
  };

  const soil = input.soil?.trim();
  push("soil", Boolean(soil), soil ? (entry.soils[soil] ?? 0.2) : 0);

  const ph = input.soilPh;
  push(
    "ph",
    ph != null && Number.isFinite(ph),
    ph != null && Number.isFinite(ph) ? rangeFit(ph, entry.ph, 1.5) : 0,
  );

  const temp = input.temperatureC;
  push(
    "climate",
    temp != null && Number.isFinite(temp),
    temp != null && Number.isFinite(temp) ? rangeFit(temp, entry.temp, 8) : 0,
  );

  const rain = input.rainfallMm;
  push(
    "rainfall",
    rain != null && Number.isFinite(rain),
    rain != null && Number.isFinite(rain) ? rangeFit(rain, entry.rain, 400) : 0,
  );

  const season = input.season?.trim().toUpperCase();
  const seasonFit =
    season === "A" || season === "B" || season === "C" ? entry.seasons[season] : undefined;
  push("season", seasonFit != null, seasonFit ?? 0);

  push(
    "water",
    Boolean(input.waterAvailability),
    input.waterAvailability ? waterFit(entry.waterNeed, input.waterAvailability) : 0,
  );

  const district = input.district?.trim();
  push("location", Boolean(district), district ? entry.zones[districtZone(district)] : 0);

  const supplied = factors.filter((f) => f.supplied);
  const totalWeight = supplied.reduce((sum, f) => sum + f.weight, 0);
  const earned = supplied.reduce((sum, f) => sum + f.score, 0);
  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  return {
    crop: entry.crop,
    score,
    band: bandFor(score),
    factors,
    growingPeriod: entry.growingPeriod,
  };
}

export function recommendOffline(input: RecommendationInput): EngineResult {
  const scored = CROP_KNOWLEDGE.map((entry) => scoreCrop(entry, input)).sort(
    (a, b) => b.score - a.score || a.crop.localeCompare(b.crop),
  );

  // A preferred crop is always shown as the primary result (when it exists),
  // but keeps its honest computed score — the farmer's choice is not inflated.
  const preferred = input.preferredCrop?.trim();
  const best = scored[0];
  if (!best) {
    // CROP_KNOWLEDGE is never empty, so this is unreachable in practice.
    throw new Error("No crops in the knowledge base.");
  }
  const primary = (preferred ? scored.find((c) => c.crop === preferred) : undefined) ?? best;
  const rest = scored.filter((c) => c.crop !== primary.crop);

  const suppliedFactors = primary.factors.filter((f) => f.supplied).map((f) => f.id);
  const missingFactors = primary.factors.filter((f) => !f.supplied).map((f) => f.id);

  return {
    primary,
    alternatives: rest.slice(0, 3),
    suppliedFactors,
    missingFactors,
  };
}
