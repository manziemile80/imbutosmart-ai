import { z } from "zod";
import { DISTRICTS, SOILS } from "./api";
import { findCrop } from "./crop-knowledge";
import { soilLabel, type FarmerLanguage } from "./farmer-language";
import type {
  CropScore,
  EngineResult,
  FactorScore,
  SuitabilityBand,
} from "./recommendation-engine";

// Shared contract between the offline engine, the online AI server function,
// the local store and the UI. Browser-safe: no server-only imports.

export const recommendationInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value), "Choose a district."),
  soil: z.string().refine((value) => SOILS.includes(value), "Choose a soil type."),
  // Every field below is optional: the engine redistributes the weights of
  // missing factors, so partial information still produces a recommendation.
  soilPh: z.number().finite().min(3).max(10).nullable().optional(),
  landSizeHa: z.number().finite().min(0).max(1000).nullable().optional(),
  season: z.enum(["A", "B", "C"]).nullable().optional(),
  rainfallMm: z.number().finite().min(0).max(5000).nullable().optional(),
  temperatureC: z.number().finite().min(-5).max(45).nullable().optional(),
  waterAvailability: z.enum(["rainfed", "irrigated", "limited"]).nullable().optional(),
  experience: z.enum(["new", "some", "experienced"]).nullable().optional(),
  preferredCrop: z.string().max(60).nullable().optional(),
  language: z.enum(["en", "rw", "fr"]).default("en"),
});

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;

// Payload for the sync endpoint: one locally saved record. The result is
// validated on its farmer-facing fields; anything else is left to the server.
export const recommendationSyncSchema = z.object({
  records: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        createdAt: z.number().int().nonnegative(),
        input: recommendationInputSchema,
        result: z.object({
          crop: z.string().min(1),
          score: z.number().int().min(0).max(100),
          source: z.enum(["online-ai", "local-engine"]),
        }),
      }),
    )
    .min(1)
    .max(200),
});

export type RecommendationSyncPayload = z.infer<typeof recommendationSyncSchema>;

export type AlternativeCrop = { crop: string; score: number; band: SuitabilityBand };

// The farmer-facing result, produced identically by both modes: scores and
// growing periods always come from the local knowledge base (never invented
// by the model); only the explanation strings may come from the AI, and the
// offline engine writes the same strings from templates when AI is absent.
export type RecommendationResult = {
  crop: string;
  score: number;
  band: SuitabilityBand;
  source: "online-ai" | "local-engine";
  reasons: string[];
  soilConditions: string;
  waterNeeds: string;
  growingPeriod: string;
  plantingSeason: string;
  considerations: string[];
  risks: string[];
  alternatives: AlternativeCrop[];
  suppliedFactors: string[];
  missingFactors: string[];
};

const WATER_TEXT: Record<1 | 2 | 3, { en: string; rw: string; fr: string }> = {
  1: {
    en: "Low water need. Rain-fed farming is usually enough.",
    rw: "Amazi make. Guhinga gishingiye ku mvura ni byo bihagije.",
    fr: "Faible besoin en eau. La pluie suffit généralement.",
  },
  2: {
    en: "Moderate water need. Steady rain or light watering helps.",
    rw: "Amazi ari hagati. Imvura ihoraho cyangwa kuhira gake birafasha.",
    fr: "Besoin modéré en eau. Pluie régulière ou arrosage léger.",
  },
  3: {
    en: "High water need. Regular watering or irrigation is important.",
    rw: "Amazi menshi. Kuhira buri gihe cyangwa kuhira mu nzira ni ngombwa.",
    fr: "Fort besoin en eau. L’arrosage régulier ou l’irrigation est important.",
  },
};

const SEASON_TEXT: Record<"en" | "rw" | "fr", string> = {
  en: "Plant with the first reliable rains of the season, and avoid planting after heavy rain has already passed.",
  rw: "Hingira ku mvura yizewe ya mbere y’igihembwe, kandi wirinde guhinga nyuma y’imvura nyinshi yarangiye.",
  fr: "Plantez avec les premières pluies fiables de la saison et évitez de planter après les fortes pluies.",
};

const RAINFED_NOTE: Record<"en" | "rw" | "fr", string> = {
  en: "You rely on rain: plant soon after rain arrives and keep soil moisture where possible.",
  rw: "Wishingikira ku mvura: hinga vuba nyuma y’imvura, kandi ugumane ubuhehere bw’ubutaka aho bishoboka.",
  fr: "Vous dépendez de la pluie : plantez vite après la pluie et gardez l’humidité du sol possible.",
};

// Human-readable factor names for the risk sentences, per language.
const FACTOR_LABEL: Record<FactorScore["id"], Record<"en" | "rw" | "fr", string>> = {
  soil: { en: "soil type", rw: "ubutaka", fr: "type de sol" },
  ph: { en: "soil pH", rw: "pH y’ubutaka", fr: "pH du sol" },
  climate: { en: "temperature", rw: "ubushyuhe", fr: "température" },
  rainfall: { en: "rainfall", rw: "imvura", fr: "pluie" },
  season: { en: "planting season", rw: "igihe cyo guhinga", fr: "saison de plantation" },
  water: { en: "water availability", rw: "amazi", fr: "eau disponible" },
  location: { en: "your district", rw: "akarere kawe", fr: "votre district" },
};

// Growing periods live in the knowledge base in English ("90–120 days") and
// are re-worded here, keeping the numbers exactly as published.
const PERIOD_WORDS: Record<
  "en" | "rw" | "fr",
  { days: string; months: string; firstHarvest: string }
> = {
  en: { days: "days", months: "months", firstHarvest: "to first harvest" },
  rw: { days: "iminsi", months: "amezi", firstHarvest: "kugeza ku isarura rya mbere" },
  fr: { days: "jours", months: "mois", firstHarvest: "jusqu’à la première récolte" },
};

export function localizePeriod(period: string, language: "en" | "rw" | "fr"): string {
  const words = PERIOD_WORDS[language];
  return period
    .replace("to first harvest", words.firstHarvest)
    .replace("days", words.days)
    .replace("months", words.months);
}

// Deterministic offline explanation. Sentences come from templates keyed by
// the factor outcomes, so the farmer sees the same honest wording with or
// without an internet connection.
export function buildLocalExplanation(
  engineResult: EngineResult,
  input: RecommendationInput,
  language: "en" | "rw" | "fr",
): RecommendationResult {
  const primary: CropScore = engineResult.primary;
  const crop = primary.crop;
  const knowledge = findCrop(crop);
  const lang = language === "rw" ? "rw" : language === "fr" ? "fr" : "en";
  const good = (id: FactorScore["id"]) => {
    const f = primary.factors.find((x) => x.id === id);
    return Boolean(f && f.supplied && f.weight > 0 && f.score / f.weight >= 0.7);
  };

  const reasons: string[] = [];
  if (good("soil")) {
    reasons.push(
      lang === "rw"
        ? `Ubutaka bwa ${input.soil} bukwiriye neza ${crop}.`
        : lang === "fr"
          ? `Votre sol ${input.soil} convient bien à ${crop}.`
          : `Your ${input.soil.toLowerCase()} soil is a good match for ${crop}.`,
    );
  }
  if (good("season") && input.season) {
    reasons.push(
      lang === "rw"
        ? `${crop} gihingwa cyane mu gihembwe ${input.season}.`
        : lang === "fr"
          ? `${crop} se plante bien en saison ${input.season}.`
          : `${crop} is commonly planted in Season ${input.season}.`,
    );
  }
  if (good("rainfall") && input.rainfallMm != null) {
    reasons.push(
      lang === "rw"
        ? `Imvura wanditse (${input.rainfallMm} mm) ihuye n’ibyo ${crop} gikeneye.`
        : lang === "fr"
          ? `La pluie que vous avez saisie (${input.rainfallMm} mm) correspond aux besoins de ${crop}.`
          : `The rainfall you entered (${input.rainfallMm} mm) matches what ${crop} needs.`,
    );
  }
  if (good("water") && input.waterAvailability) {
    reasons.push(
      lang === "rw"
        ? `Amazi ufite (${input.waterAvailability}) ahagije kuri ${crop}.`
        : lang === "fr"
          ? `Votre eau (${input.waterAvailability}) suffit pour ${crop}.`
          : `Your water availability (${input.waterAvailability}) is sufficient for ${crop}.`,
    );
  }
  if (good("location") && input.district) {
    reasons.push(
      lang === "rw"
        ? `${input.district} ni ahantu ${crop} gihingwa cyane.`
        : lang === "fr"
          ? `${input.district} se trouve dans une zone où ${crop} est souvent cultivé.`
          : `${input.district} lies in an area where ${crop} is commonly grown.`,
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      lang === "rw"
        ? `${crop} ni cyo cyahawe urwego rwo hejuru ku makuru watanze.`
        : lang === "fr"
          ? `${crop} a le meilleur score parmi les informations que vous avez fournies.`
          : `${crop} scored highest on the information you provided.`,
    );
  }

  const missing: string[] = [];
  if (input.soilPh == null) missing.push("pH");
  if (input.rainfallMm == null)
    missing.push(lang === "rw" ? "imvura" : lang === "fr" ? "pluie" : "rainfall");
  if (input.temperatureC == null)
    missing.push(lang === "rw" ? "ubushyuhe" : lang === "fr" ? "température" : "temperature");
  if (input.waterAvailability == null)
    missing.push(lang === "rw" ? "amazi" : lang === "fr" ? "eau" : "water");
  if (input.season == null)
    missing.push(lang === "rw" ? "igihe" : lang === "fr" ? "saison" : "season");

  const considerations: string[] = [];
  if (input.waterAvailability === "rainfed" || input.waterAvailability === "limited") {
    considerations.push(RAINFED_NOTE[lang]);
  }
  considerations.push(SEASON_TEXT[lang]);
  if (input.experience === "new") {
    considerations.push(
      lang === "rw"
        ? "Igihingwa gishya: baza impuguke y’ubuhinzi yo hafi yawe mbere yo guhinga igihingwa utarigeze guhinga."
        : lang === "fr"
          ? "Culture nouvelle : demandez l’avis d’un expert local avant d’essayer une nouvelle culture."
          : "New crop: ask a local agricultural expert before trying a crop you have not grown before.",
    );
  }

  const risks: string[] = [];
  for (const f of primary.factors) {
    if (f.supplied && f.weight > 0 && f.score / f.weight < 0.5) {
      risks.push(
        lang === "rw"
          ? `Ikintu cyo mu murima (${FACTOR_LABEL[f.id][lang]}) ntigihuye neza n’ibyo ${crop} gikeneye.`
          : lang === "fr"
            ? `La ${FACTOR_LABEL[f.id][lang]} ne correspond pas bien aux besoins de ${crop}.`
            : `Your ${FACTOR_LABEL[f.id][lang]} does not match what ${crop} prefers.`,
      );
    }
  }
  if (missing.length > 0) {
    risks.push(
      lang === "rw"
        ? `Amakuru atariho (${missing.join(", ")}) ashobora guhindura iki gisubizo.`
        : lang === "fr"
          ? `Certaines informations manquent (${missing.join(", ")}), ce qui peut changer ce résultat.`
          : `Some information is missing (${missing.join(", ")}), which could change this result.`,
    );
  }

  const phText = knowledge ? `pH ${knowledge.ph[0]}–${knowledge.ph[1]}` : "";
  const soilNames = knowledge
    ? Object.entries(knowledge.soils)
        .filter(([, fit]) => fit >= 0.8)
        .map(([name]) => soilLabel(name, lang))
        .join(", ")
    : soilLabel(input.soil, lang);

  return {
    crop,
    score: primary.score,
    band: primary.band,
    source: "local-engine",
    reasons,
    soilConditions:
      (lang === "rw"
        ? `Ubutaka bukwiriye: ${soilNames}. `
        : lang === "fr"
          ? `Sols favorables : ${soilNames}. `
          : `Best soils: ${soilNames}. `) + phText,
    waterNeeds: knowledge ? WATER_TEXT[knowledge.waterNeed][lang] : "",
    growingPeriod: knowledge ? localizePeriod(knowledge.growingPeriod, lang) : "",
    plantingSeason:
      (input.season
        ? lang === "rw"
          ? `Igihembwe wanditse: ${input.season}. `
          : lang === "fr"
            ? `Votre saison : ${input.season}. `
            : `Your season: ${input.season}. `
        : "") + SEASON_TEXT[lang],
    considerations,
    risks,
    alternatives: engineResult.alternatives.map((a) => ({
      crop: a.crop,
      score: a.score,
      band: a.band,
    })),
    suppliedFactors: engineResult.suppliedFactors,
    missingFactors: engineResult.missingFactors,
  };
}

// Keeps only AI sentences whose numbers were actually supplied by the farmer.
// The model may mention the rain or temperature the farmer typed; any other
// figure (yields, prices, probabilities) was invented, so that sentence is
// dropped and the deterministic template replaces it when nothing survives.
export function groundedSentences(sentences: string[], input: RecommendationInput): string[] {
  const allowed = new Set<string>();
  for (const value of [input.rainfallMm, input.temperatureC, input.soilPh, input.landSizeHa]) {
    if (value != null) {
      allowed.add(String(value));
      allowed.add(String(value).replace(".", ","));
    }
  }
  return sentences.filter((sentence) => {
    const numbers = sentence.match(/\d+(?:[.,]\d+)?/g) ?? [];
    return numbers.every((number) => allowed.has(number));
  });
}

// Compact engine input: the online AI path reuses the same local engine for
// the score it reports, so numbers never come from the model.
export function engineInput(input: RecommendationInput) {
  // Optional factors are only included when supplied, so the engine treats
  // them as missing (and redistributes their weight) rather than as zero.
  return {
    district: input.district,
    soil: input.soil,
    ...(input.soilPh != null ? { soilPh: input.soilPh } : {}),
    ...(input.season ? { season: input.season } : {}),
    ...(input.rainfallMm != null ? { rainfallMm: input.rainfallMm } : {}),
    ...(input.temperatureC != null ? { temperatureC: input.temperatureC } : {}),
    ...(input.waterAvailability ? { waterAvailability: input.waterAvailability } : {}),
    ...(input.preferredCrop ? { preferredCrop: input.preferredCrop } : {}),
  };
}
