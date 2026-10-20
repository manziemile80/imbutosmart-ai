import { DISTRICTS } from "./api";
import { cropLabel, type FarmerLanguage } from "./farmer-language";

// Browser-safe local crop knowledge base for the hybrid recommender.
//
// Each crop record holds the general agronomic requirements used by the offline
// suitability engine: soil fit, pH range, temperature range, rainfall range,
// season fit, water need, agro-ecological zone fit, and growing period. The
// ranges are typical requirements for Rwandan conditions, the same general
// agronomy the built-in estimator already uses — they are not measured yields,
// guarantees, or district-specific advice.
//
// To add a crop: append one record below (every field is required except
// labels) and it automatically appears in the offline engine, the preference
// picker and the online AI reference. To specialise a district, extend
// DISTRICT_ZONES or add a districtOverrides entry — never fork the engine.

export type AgroZone = "highland" | "midland" | "lowland";
export type WaterNeed = 1 | 2 | 3; // 1 = low, 2 = moderate, 3 = high (e.g. standing water)
export type SeasonKey = "A" | "B" | "C";

export type CropKnowledge = {
  crop: string;
  soils: Record<string, number>; // app soil type -> 0..1 fit
  ph: [number, number]; // optimal pH range
  temp: [number, number]; // optimal temperature range, °C
  rain: [number, number]; // optimal seasonal rainfall range, mm
  seasons: Record<SeasonKey, number>; // 0..1 fit per agricultural season
  waterNeed: WaterNeed;
  zones: Record<AgroZone, number>; // 0..1 fit per broad agro-ecological zone
  growingPeriod: string; // human-readable, e.g. "90–120 days"
};

export const CROP_KNOWLEDGE: CropKnowledge[] = [
  {
    crop: "Maize",
    soils: { Loam: 1, Volcanic: 0.9, Humic: 0.85, Clay: 0.8, Laterite: 0.6, Sandy: 0.55 },
    ph: [5.5, 7.5],
    temp: [18, 27],
    rain: [400, 800],
    seasons: { A: 1, B: 0.9, C: 0.5 },
    waterNeed: 2,
    zones: { highland: 0.6, midland: 1, lowland: 0.8 },
    growingPeriod: "90–120 days",
  },
  {
    crop: "Beans",
    soils: { Loam: 1, Volcanic: 0.9, Humic: 0.9, Clay: 0.7, Sandy: 0.65, Laterite: 0.6 },
    ph: [6, 7.5],
    temp: [16, 26],
    rain: [300, 600],
    seasons: { A: 1, B: 0.9, C: 0.6 },
    waterNeed: 2,
    zones: { highland: 0.9, midland: 1, lowland: 0.7 },
    growingPeriod: "60–90 days",
  },
  {
    crop: "Irish Potato",
    soils: { Volcanic: 1, Loam: 0.9, Humic: 0.85, Clay: 0.6, Sandy: 0.6, Laterite: 0.5 },
    ph: [5, 6.5],
    temp: [14, 21],
    rain: [350, 700],
    seasons: { A: 1, B: 0.5, C: 0.4 },
    waterNeed: 2,
    zones: { highland: 1, midland: 0.6, lowland: 0.2 },
    growingPeriod: "90–120 days",
  },
  {
    crop: "Sweet Potato",
    soils: { Sandy: 1, Loam: 0.95, Laterite: 0.85, Volcanic: 0.8, Humic: 0.8, Clay: 0.55 },
    ph: [5.5, 7],
    temp: [18, 28],
    rain: [350, 900],
    seasons: { A: 0.8, B: 1, C: 0.6 },
    waterNeed: 1,
    zones: { highland: 0.6, midland: 0.9, lowland: 1 },
    growingPeriod: "90–150 days",
  },
  {
    crop: "Cassava",
    soils: { Sandy: 1, Laterite: 0.95, Loam: 0.9, Clay: 0.6, Humic: 0.7, Volcanic: 0.6 },
    ph: [5, 6.5],
    temp: [20, 30],
    rain: [500, 1500],
    seasons: { A: 0.7, B: 1, C: 0.5 },
    waterNeed: 1,
    zones: { highland: 0.3, midland: 0.8, lowland: 1 },
    growingPeriod: "8–12 months",
  },
  {
    crop: "Sorghum",
    soils: { Clay: 1, Loam: 0.9, Sandy: 0.8, Laterite: 0.8, Volcanic: 0.7, Humic: 0.7 },
    ph: [5.5, 8],
    temp: [20, 30],
    rain: [250, 600],
    seasons: { A: 0.8, B: 1, C: 0.6 },
    waterNeed: 1,
    zones: { highland: 0.5, midland: 0.9, lowland: 1 },
    growingPeriod: "100–120 days",
  },
  {
    crop: "Wheat",
    soils: { Volcanic: 1, Loam: 0.9, Humic: 0.85, Clay: 0.7, Sandy: 0.5, Laterite: 0.5 },
    ph: [6, 7.5],
    temp: [12, 20],
    rain: [350, 650],
    seasons: { A: 1, B: 0.4, C: 0.3 },
    waterNeed: 2,
    zones: { highland: 1, midland: 0.5, lowland: 0.1 },
    growingPeriod: "120–150 days",
  },
  {
    crop: "Rice",
    soils: { Clay: 1, Humic: 0.9, Loam: 0.7, Volcanic: 0.4, Sandy: 0.3, Laterite: 0.4 },
    ph: [5.5, 7],
    temp: [20, 30],
    rain: [800, 1800],
    seasons: { A: 1, B: 1, C: 0.5 },
    waterNeed: 3,
    zones: { highland: 0.4, midland: 0.8, lowland: 1 },
    growingPeriod: "120–180 days",
  },
  {
    crop: "Banana",
    soils: { Loam: 1, Humic: 0.95, Volcanic: 0.85, Clay: 0.75, Laterite: 0.6, Sandy: 0.5 },
    ph: [6, 7.5],
    temp: [18, 28],
    rain: [600, 1500],
    seasons: { A: 1, B: 1, C: 0.6 },
    waterNeed: 3,
    zones: { highland: 0.8, midland: 1, lowland: 0.7 },
    growingPeriod: "9–12 months to first harvest",
  },
  {
    crop: "Tomato",
    soils: { Loam: 1, Volcanic: 0.9, Humic: 0.9, Laterite: 0.6, Sandy: 0.6, Clay: 0.55 },
    ph: [6, 7],
    temp: [18, 27],
    rain: [400, 800],
    seasons: { A: 0.9, B: 0.9, C: 0.6 },
    waterNeed: 3,
    zones: { highland: 0.8, midland: 1, lowland: 0.7 },
    growingPeriod: "90–120 days",
  },
  {
    crop: "Onion",
    soils: { Loam: 1, Humic: 0.9, Sandy: 0.85, Volcanic: 0.85, Clay: 0.6, Laterite: 0.6 },
    ph: [6, 7],
    temp: [15, 25],
    rain: [350, 650],
    seasons: { A: 1, B: 0.8, C: 0.6 },
    waterNeed: 3,
    zones: { highland: 0.9, midland: 1, lowland: 0.6 },
    growingPeriod: "90–150 days",
  },
  {
    crop: "Cabbage",
    soils: { Loam: 1, Humic: 0.9, Volcanic: 0.9, Clay: 0.7, Sandy: 0.55, Laterite: 0.55 },
    ph: [6, 7.5],
    temp: [13, 22],
    rain: [350, 700],
    seasons: { A: 1, B: 0.7, C: 0.5 },
    waterNeed: 2,
    zones: { highland: 1, midland: 0.8, lowland: 0.3 },
    growingPeriod: "60–100 days",
  },
];

// Broad agro-ecological zones. Districts map to a zone here — one editable
// config, not scattered assumptions. Districts not listed are treated as
// midland, so a new district never breaks a recommendation. Replace these
// groupings with official NISR/MINAGRI zonation when available.
export const DISTRICT_ZONES: Record<string, AgroZone> = {
  Burera: "highland",
  Gakenke: "highland",
  Gicumbi: "highland",
  Musanze: "highland",
  Nyabihu: "highland",
  Rulindo: "highland",
  Nyamagabe: "highland",
  Nyaruguru: "highland",
  Karongi: "highland",
  Nyamasheke: "highland",
  Rusizi: "highland",
  Rutsiro: "highland",
  Huye: "midland",
  Muhanga: "midland",
  Nyanza: "midland",
  Ngororero: "midland",
  Kamonyi: "midland",
  Gasabo: "midland",
  Kicukiro: "midland",
  Nyarugenge: "midland",
  Rubavu: "midland",
  Ruhango: "midland",
  Bugesera: "lowland",
  Gatsibo: "lowland",
  Kayonza: "lowland",
  Kirehe: "lowland",
  Ngoma: "lowland",
  Nyagatare: "lowland",
  Rwamagana: "lowland",
};

export function districtZone(district: string): AgroZone {
  return DISTRICT_ZONES[district] ?? "midland";
}

// Display names for crops beyond the core app crop list (tomato, onion,
// cabbage...). Falls back to the shared farmer-language catalog for the rest,
// so both sources stay in sync without duplication.
const EXTRA_CROP_LABELS: Record<string, Record<FarmerLanguage, string>> = {
  Tomato: { en: "Tomato", rw: "Inyanya", fr: "Tomate" },
  Onion: { en: "Onion", rw: "Igitunguru", fr: "Oignon" },
  Cabbage: { en: "Cabbage", rw: "Amakungwa", fr: "Chou" },
};

export function knowledgeCropLabel(crop: string, language: FarmerLanguage): string {
  return EXTRA_CROP_LABELS[crop]?.[language] ?? cropLabel(crop, language);
}

export const CROP_NAMES = CROP_KNOWLEDGE.map((entry) => entry.crop);

export function findCrop(crop: string): CropKnowledge | undefined {
  return CROP_KNOWLEDGE.find((entry) => entry.crop === crop);
}

// Compact reference for the online AI: same data, farmer language neutral.
export function cropReferenceForPrompt(): string {
  return CROP_KNOWLEDGE.map(
    (c) =>
      `${c.crop}: soils=${bestSoils(c)}; pH ${c.ph[0]}-${c.ph[1]}; temp ${c.temp[0]}-${c.temp[1]}C; rain ${c.rain[0]}-${c.rain[1]}mm; seasons A/B/C fit ${c.seasons.A}/${c.seasons.B}/${c.seasons.C}; waterNeed ${c.waterNeed}/3; zones highland/midland/lowland ${c.zones.highland}/${c.zones.midland}/${c.zones.lowland}; growing period ${c.growingPeriod}`,
  ).join("\n");
}

function bestSoils(c: CropKnowledge): string {
  return (
    Object.entries(c.soils)
      .filter(([, fit]) => fit >= 0.8)
      .map(([name]) => name)
      .join("+") || "adaptable"
  );
}

export { DISTRICTS };
