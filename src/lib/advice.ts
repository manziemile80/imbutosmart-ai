import { z } from "zod";

import inputs from "@/lib/district-inputs.json";
import { DISTRICTS, SOILS } from "./api";
import type { FarmerLanguage } from "./farmer-language";

// Browser-safe contract for the advice page: the farmer's field, the plan the
// page can show without any model, and the digest the model is given so the
// written plan says the same thing as the page.

export const adviceInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value), "Choose a district."),
  soil: z.string().refine((value) => SOILS.includes(value), "Choose a soil type."),
  season: z.enum(["A", "B", "C"]).nullable(),
  language: z.enum(["en", "rw", "fr"]).default("en"),
  mode: z.enum(["plan", "simple"]).default("plan"),
});

export type AdviceMode = "plan" | "simple";

// What the survey says the farmers of a district use. Aggregates only.
export type DistrictInputProfile = {
  segments: number;
  usedShare: number;
  inorganic: Record<string, number>;
  organic: Record<string, number>;
  /** The rate farmers applied each input at, in kilograms per hectare. */
  rates: Record<string, number>;
  topCrop: string | null;
  irrigatedShare: number;
  erodedShare: number;
};

export const districtInputs = inputs as unknown as Record<string, DistrictInputProfile>;

// The names in the survey, explained in plain words. The survey writes them
// in English; the farmer sees them in their own language.
const inputNames: Record<string, { en: string; rw: string; fr: string }> = {
  DAP: { en: "DAP", rw: "DAP", fr: "DAP" },
  Urea: { en: "Urea", rw: "Urea", fr: "Urée" },
  "NPK 17-17-17": { en: "NPK 17-17-17", rw: "NPK 17-17-17", fr: "NPK 17-17-17" },
  Chaux: { en: "Lime", rw: "Ibunyanga", fr: "Chaux" },
  Manure: { en: "Manure", rw: "Ifumbire y'amatungo", fr: "Fumier" },
  Compost: { en: "Compost", rw: "Ifumbire y'ibimera", fr: "Compost" },
  "Green manure": { en: "Green manure", rw: "Ifumbire y'ibimera bigerwa", fr: "Engrais vert" },
  Biogas: { en: "Biogas slurry", rw: "Amashyamba ava kuri biogas", fr: "Lisier de biogaz" },
};

// The name of an input in the farmer's language.
export function inputName(name: string, language: FarmerLanguage): string {
  return inputNames[name]?.[language] ?? name;
}

// The names in the survey, explained in plain words.
const glossary: Record<string, { en: string; rw: string; fr: string }> = {
  DAP: {
    en: "A mineral fertiliser that gives the plant phosphorus and nitrogen.",
    rw: "Ifumbire mubisi itanga fosforu na nitrojeni ku mubira.",
    fr: "Un engrais minéral qui apporte du phosphore et de l’azote à la plante.",
  },
  Urea: {
    en: "A nitrogen fertiliser. It makes plants grow green and leafy.",
    rw: "Ifumbire mubisi rikora ko butabita bishingushya ibimera bigereye.",
    fr: "Un engrais azoté. Il fait pousser des plantes vertes et feuillues.",
  },
  "NPK 17-17-17": {
    en: "A balanced fertiliser with nitrogen, phosphorus and potassium.",
    rw: "Ifumbire mubisi rifite azote, fosforu na potasiye.",
    fr: "Un engrais complet avec azote, phosphore et potasse.",
  },
  Chaux: {
    en: "Lime. It is used on acid soils to make them less sour.",
    rw: "Ibunyanga: ikurikira ku butaka bw’umun acidity kurugabanya.",
    fr: "Chaux. Elle s’utilise sur les sols acides pour les rendre moins acides.",
  },
  Manure: {
    en: "Farmyard manure: animal waste, spread on the field before planting.",
    rw: "Ifumbire y’amatungo: ibisomero by’amatungo, bigishyikirizwa ku murima mbere yo guhinga.",
    fr: "Fumier : déjections animales, épandues sur le champ avant le semis.",
  },
  Compost: {
    en: "Compost: plant and kitchen waste left to rot into a rich soil improver.",
    rw: "Ifumbire y’ibimera: ibisukura n’ibikoresho byo mu gikoni bigatandukira, bigishimishije ubutaka.",
    fr: "Compost : déchets de plantes et de cuisine décomposés pour enrichir le sol.",
  },
  "Green manure": {
    en: "Green manure: plants grown on the field and dug in to feed the soil.",
    rw: "Ifumbire y’ibimera bigerwa: ibihingwa ku murima bikahingurwa mu butaka.",
    fr: "Engrais vert : plantes cultivées puis enfouies pour nourrir le sol.",
  },
  Biogas: {
    en: "Slurry from a biogas digester, used as a liquid manure.",
    rw: "Amashyamba ava ku gikoresho cya biogas, bikoreshwa nk’ifumbire.",
    fr: "Lisier de digesteur de biogaz, utilisé comme fumier liquide.",
  },
};

// A plain explanation of an input name, when there is one.
export function explainInput(name: string, language: FarmerLanguage): string | null {
  const entry = glossary[name.trim()] ?? glossary[name.trim().toLowerCase()];
  if (!entry) return null;
  return entry[language];
}

export const adviceCopy: Record<
  FarmerLanguage,
  {
    eyebrow: string;
    title: string;
    lede: string;
    planTitle: string;
    cropsTitle: string;
    inputsTitle: string;
    whenTitle: string;
    writtenPlan: string;
    writingPlan: string;
    assistanceTitle: string;
    assistanceIntro: string;
    listen: string;
    stop: string;
    simple: string;
    simpleTitle: string;
    glossaryTitle: string;
    noInputs: string;
    disclaimer: string;
    errors: Record<"unconfigured" | "failed" | "empty", string>;
  }
> = {
  en: {
    eyebrow: "Farming advice",
    title: "Advice you can follow",
    lede: "The plan follows the field you set on the Farmer page. It shows which crops suit that place, which inputs the farmers around you use, and when to act. Nothing here is invented: the figures come from the survey and the weather service.",
    planTitle: "Your plan",
    cropsTitle: "Crops to plant here",
    inputsTitle: "Inputs used in your district",
    whenTitle: "When to act",
    writtenPlan: "Your written plan",
    writingPlan: "Writing your plan…",
    assistanceTitle: "Assistance",
    assistanceIntro:
      "Read the plan aloud, or have it in simpler words. The names of the inputs are explained below.",
    listen: "Read the plan aloud",
    stop: "Stop",
    simple: "In simple words",
    simpleTitle: "The same plan in simple words",
    glossaryTitle: "What the names mean",
    noInputs: "No input figures have been supplied for this district yet.",
    disclaimer:
      "This plan is general guidance from the survey and the weather service. It is not a soil test or a prescription: confirm with an agronomist and Meteo Rwanda before you buy or apply anything.",
    errors: {
      unconfigured: "The written plan needs the AI service. The facts on this page stay available.",
      failed: "The written plan could not be made just now. Please try again.",
      empty: "The assistant returned no plan. Please try again.",
    },
  },
  rw: {
    eyebrow: "Inama ku buhinzi",
    title: "Inama ushobora gukurikiza",
    lede: "Gahunda ikurikiza umurima wagennye ku rupapuro rw’Umuhinzi. Uyu urubuga rugaragaza ibihingwa bikwiye ako gihembwe, ifumbire abahinzi bakoresha hafi yawe, n’igihe cyo gukora. Nta kigizeho umuziki: amafishi ava mu survey na seriveri y’ikirere.",
    planTitle: "Gahunda yawe",
    cropsTitle: "Ibihingwa wibishobora guhinga hano",
    inputsTitle: "Ifumbire zikoreshwa mu karere kawe",
    whenTitle: "Igihe cyo gukora",
    writtenPlan: "Gahunda yawe y’ubwandishi",
    writingPlan: "Turasyandika gahunda…",
    assistanceTitle: "Ubufasha",
    assistanceIntro: "Soma gahunda ijwi, cyangwa uyigeze mu nsi. Amaze y’ifumbire asobanurwa hasi.",
    listen: "Soma gahunda ijwi",
    stop: "Hagarika",
    simple: "Mu nsi",
    simpleTitle: "Gahunda imwe mu nsi",
    glossaryTitle: "Ibintu bisobanura amazina",
    noInputs: "Nta mafishi y’ifumbire abatariwa kuri karere aka.",
    disclaimer:
      "Uyu mwandishi ni inama rusange iva mu survey na seriveri y’ikirere. Si igisobanuro cy’ubutaka: emeza n’impuguke na Meteo Rwanda mbere yo kugura cyangwa gushyiramo ikintu.",
    errors: {
      unconfigured:
        "Gahunda y’ubwandishi ifite gukenera seriveri ya AI. Am facts ari ku ruge ruwome ari gahenduye.",
      failed: "Gahunda y’ubwandishi ntitabonekaga. Ongera ugerageze.",
      empty: "Umufasha nta gahunda yatanze. Ongera ugerageze.",
    },
  },
  fr: {
    eyebrow: "Conseils agricoles",
    title: "Des conseils à suivre",
    lede: "Le plan suit le champ défini sur la page Agriculteur. La page indique les cultures adaptées à ce lieu, les intrants utilisés par les farmers voisins et le moment d’agir. Rien n’est inventé : les chiffres viennent de l’enquête et du service météo.",
    planTitle: "Votre plan",
    cropsTitle: "Cultures à choisir ici",
    inputsTitle: "Intrants utilisés dans votre district",
    whenTitle: "Quand agir",
    writtenPlan: "Votre plan écrit",
    writingPlan: "Rédaction de votre plan…",
    assistanceTitle: "Assistance",
    assistanceIntro:
      "Faites lire le plan à voix haute, ou demandez une version plus simple. Les noms des intrants sont expliqués ci-dessous.",
    listen: "Lire le plan à voix haute",
    stop: "Arrêter",
    simple: "En mots simples",
    simpleTitle: "Le même plan en mots simples",
    glossaryTitle: "Ce que signifient les noms",
    noInputs: "Aucun chiffre d’intrant n’a encore été fourni pour ce district.",
    disclaimer:
      "Ce plan est un conseil général tiré de l’enquête et du service météo. Ce n’est ni une analyse de sol ni une prescription : confirmez avec un agronome et Meteo Rwanda avant d’acheter ou d’appliquer quoi que ce soit.",
    errors: {
      unconfigured:
        "Le plan écrit a besoin du service IA. Les faits de cette page restent disponibles.",
      failed: "Le plan écrit n’a pas pu être fait pour le moment. Veuillez réessayer.",
      empty: "L’assistant n’a renvoyé aucun plan. Veuillez réessayer.",
    },
  },
};

// The facts the plan is written from.
export type AdviceDigestInput = {
  district: string;
  soil: string;
  season: "A" | "B" | "C" | null;
  crops: { crop: string; score: number; band: string; growingPeriod: string; soilFit: number }[];
  inputs: DistrictInputProfile | null;
  climate: { period: string; rainMm: number; tempC: number } | null;
  outlook: {
    day: string;
    rainMm: number;
    tempMinC: number;
    tempMaxC: number;
    rainWindow: string | null;
    sky: string | null;
  }[];
};

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildAdviceDigest(input: AdviceDigestInput): string {
  const lines: string[] = [];

  lines.push(
    `Farmer's field: district ${input.district}, soil ${input.soil}` +
      (input.season ? `, planting season ${input.season}.` : "."),
  );

  lines.push(
    `Crops that suit this field (from the app's agronomic knowledge base, with the suitability score out of 100): ` +
      input.crops
        .map(
          (crop) =>
            `${crop.crop} ${crop.score} (${crop.band}), soil fit ${round(crop.soilFit, 2)}, growing period ${crop.growingPeriod}`,
        )
        .join("; ") +
      ".",
  );

  if (input.inputs) {
    const mineral = Object.entries(input.inputs.inorganic)
      .slice(0, 3)
      .map(([name, share]) => `${name} ${Math.round(share * 100)}%`)
      .join(", ");
    const organic = Object.entries(input.inputs.organic)
      .slice(0, 3)
      .map(([name, share]) => `${name} ${Math.round(share * 100)}%`)
      .join(", ");
    lines.push(
      `What farmers in ${input.district} used in the 2025 survey (${input.inputs.segments} segments): ` +
        `${Math.round(input.inputs.usedShare * 100)}% used any fertiliser. ` +
        (mineral ? `Mineral fertilisers: ${mineral}. ` : "") +
        (organic ? `Organic: ${organic}. ` : "") +
        (input.inputs.topCrop
          ? `The crop most often fertilised was ${input.inputs.topCrop}. `
          : "") +
        `${Math.round(input.inputs.irrigatedShare * 100)}% irrigated; ` +
        `${Math.round(input.inputs.erodedShare * 100)}% reported moderate or severe soil erosion.`,
    );
  } else {
    lines.push(`No input figures are available for ${input.district}.`);
  }

  if (input.climate) {
    lines.push(
      `${input.district} climate (${input.climate.period} record): ${round(input.climate.rainMm, 0)} mm rain and ${round(input.climate.tempC, 1)} °C mean temperature for the season.`,
    );
  }

  if (input.outlook.length > 0) {
    lines.push(
      `Forecast for ${input.district} (Open-Meteo): ` +
        input.outlook
          .map(
            (day) =>
              `${day.day} ${round(day.rainMm, 0)} mm, ${round(day.tempMinC, 0)}–${round(day.tempMaxC, 0)} °C` +
              (day.sky ? `, ${day.sky}` : "") +
              (day.rainWindow ? `, rain likely ${day.rainWindow}` : ""),
          )
          .join("; ") +
        ".",
    );
  }

  return lines.join("\n");
}

export function buildAdvicePrompt(
  digest: string,
  language: FarmerLanguage,
  mode: AdviceMode,
): string {
  const languageName = language === "rw" ? "Kinyarwanda" : language === "fr" ? "French" : "English";
  const base = [
    `You are the farming adviser of ImbutoSmart AI, writing for smallholder farmers in Rwanda.`,
    `Write the whole answer in ${languageName}.`,
    `The data below is the whole of what you know. Follow these rules:`,
    `- Use only the facts in the data. Never state a number that is not there, and never invent a price, a quantity of fertiliser or a yield.`,
    `- Never give an application rate, a spacing, a depth, a price or a quantity: the data holds none of them. Name the input and let the farmer follow the label or an agronomist.`,
    `- Give a plan the farmer can follow: what to plant, what to do to the soil, what to apply and when.`,
    `- Write plain text: no markdown, no bold, no tables. Use short numbered steps, because the answer is read as it is written.`,
    `- Keep it under 180 words, in short numbered steps, with plain sentences.`,
    `- Do not sell anything, do not promise a result, and do not recommend a product that is not named in the data.`,
    `- If a step depends on a soil test, a visit from an agronomist or the Meteo Rwanda forecast, say so.`,
  ];
  if (mode === "simple") {
    base.push(
      `- This is the simple version: very short sentences, no technical words, and no figures other than the ones in the data.`,
      `- Explain each step as if the reader has never heard the words before.`,
    );
  }
  base.push("", "Data:", digest);
  return base.join("\n");
}
