import { cropLabel, type FarmerLanguage } from "./farmer-language";

// Browser-safe NISR crop reference data.
//
// Source: National Institute of Statistics of Rwanda (NISR), Agricultural
// Household Survey (AHS) 2024 report, August 2025. Table 16 reports the share of
// agricultural households growing each staple crop, by agricultural season, for
// the 2023/2024 year. The survey covered 600 villages across 30 districts.
// https://www.statistics.gov.rw
//
// These are national survey observations, NOT measured field yields,
// probabilities, or district figures. The report publishes no district
// breakdown, so nothing here is per district. Where the report publishes "na"
// for a season the value stays null so the UI can say it is unavailable rather
// than infer it from another season.

export type AhsSeason = "A" | "B" | "C";

export const AHS_SOURCE = {
  title: "Agricultural Household Survey (AHS) 2024",
  publisher: "National Institute of Statistics of Rwanda (NISR)",
  published: "August 2025",
  url: "https://www.statistics.gov.rw",
  citation: "NISR, Agricultural Household Survey (AHS) 2024, Table 16",
} as const;

// Table 16 as published. null = "na" in the report.
type AhsRow = { label: string; A: number | null; B: number | null; C: number | null };

const TABLE_16: Record<string, AhsRow> = {
  "Irish Potato": { label: "Irish potatoes", A: 20.3, B: 20.3, C: null },
  Maize: { label: "Maize", A: 80.8, B: 42.4, C: null },
  Beans: { label: "Beans", A: 89.8, B: 83.3, C: 19.3 },
  Cassava: { label: "Cassava", A: 52.8, B: 49.6, C: null },
  Sorghum: { label: "Sorghum", A: 25.9, B: 25.9, C: null },
  Rice: { label: "Paddy rice", A: 2.3, B: 2.3, C: null },
  Banana: { label: "Banana", A: 70.6, B: 73.9, C: null },
  "Sweet Potato": { label: "Sweet potatoes", A: 45.9, B: 55.4, C: null },
  Wheat: { label: "Wheat", A: 2.3, B: 2.3, C: null },
};

// The crops Table 16 covers, in the app's crop-name convention.
export const AHS_CROPS = Object.keys(TABLE_16);

export function ahsCropShare(crop: string, season: AhsSeason): number | null {
  return TABLE_16[crop]?.[season] ?? null;
}

// Every crop the report publishes for a season, most-grown first.
export function ahsSeasonRanking(season: AhsSeason): { crop: string; share: number }[] {
  return AHS_CROPS.map((crop) => ({ crop, share: ahsCropShare(crop, season) }))
    .filter((row): row is { crop: string; share: number } => row.share !== null)
    .sort((a, b) => b.share - a.share);
}

// Maps a calendar month to the agricultural season the survey reports it under.
// September is the transition between Season C and Season A, so it maps to null
// and the UI says the survey reports the two seasons separately.
export function monthToAhsSeason(month: number): AhsSeason | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (month === 9) return null;
  if (month >= 10 || month <= 2) return "A";
  if (month <= 6) return "B";
  return "C";
}

export const ahsCopy: Record<FarmerLanguage, {
  title: string;
  seasonNote: string;
  source: string;
  label: string;
  unavailable: string;
  transition: string;
  note: string;
}> = {
  en: {
    title: "What farming households grew",
    seasonNote: "Share of farming households nationally who grew each crop in {season}, per the national survey.",
    source: "Source",
    label: "{share}% of farming households grew {crop} in {season}.",
    unavailable: "The survey does not report this crop for {season}.",
    transition: "September is the transition between Season C and Season A. The survey reports crop prevalence separately for each.",
    note: "This shows how widespread the crop was among farming households nationally — not a yield, a probability, or a guarantee for your field.",
  },
  rw: {
    title: "Ibyo abaturage b'ubuhinzi bahingye",
    seasonNote: "Umubare w'abaturage b'ubuhinzi b'igihugu bahingye buriya igihingwa muri {season}, bitewe n'ibarurisho ry'igihugu.",
    source: "Inkomoko",
    label: "{share}% y'abaturage b'ubuhinzi bahingye {crop} muri {season}.",
    unavailable: "Ibarurisho ridashyira ruriya igihingwa muri {season}.",
    transition: "Mutaganda ni gahunda yihuta ry'igihembwe C n'igihembwe A. Ibarurisho rigura kimwe n'igindi.",
    note: "ni uko igihingwa cyayizanye cyane mu buhinzi bw'igihugu — si ibicuruzwa, si ibizera, cyangwa isezerano ry'umurima wawe.",
  },
  fr: {
    title: "Ce que les ménages agricoles ont cultivé",
    seasonNote: "Part des ménages agricoles au niveau national ayant cultivé chaque culture pendant {season}, selon l'enquête nationale.",
    source: "Source",
    label: "{share}% des ménages agricoles ont cultivé {crop} pendant {season}.",
    unavailable: "L'enquête ne rapporte pas cette culture pour {season}.",
    transition: "Septembre est la transition entre la saison C et la saison A. L'enquête rapporte la prévalence de chaque culture séparément.",
    note: "Cela indique à quelle échelle cette culture était répandue chez les ménages agricoles au niveau national — ce n'est ni un rendement, ni une probabilité, ni une garantie pour votre champ.",
  },
};

export function ahsShareLine(language: FarmerLanguage, crop: string, season: AhsSeason, seasonLabel: string): string {
  const share = ahsCropShare(crop, season);
  const template = share === null ? ahsCopy[language].unavailable : ahsCopy[language].label;
  return template
    .replace("{share}", share === null ? "" : String(share))
    .replace("{crop}", cropLabel(crop, language))
    .replace("{season}", seasonLabel);
}
