import type { FarmerLanguage } from "./farmer-language";

export const COVERAGE_TYPES = ["excess-rain", "flood", "drought", "hail", "wind", "pests-disease"] as const;
export type CoverageType = typeof COVERAGE_TYPES[number];

export function toggleCoverage(selected: CoverageType[], type: CoverageType): CoverageType[] {
  return selected.includes(type) ? selected.filter((item) => item !== type) : [...selected, type];
}

type CoverageCopy = {
  title: string; note: string; selected: string; empty: string; clear: string;
  choices: Record<CoverageType, { label: string; detail: string }>;
};

export const coverageCopy: Record<FarmerLanguage, CoverageCopy> = {
  en: {
    title: "Choose your crop protection",
    note: "Coverage to ask an insurer about—not confirmed available plans. Your choices are not an application or a purchase.",
    selected: "Your coverage preferences", empty: "No coverage selected", clear: "Clear choices",
    choices: {
      "excess-rain": { label: "Excess rainfall & waterlogging", detail: "Ask about crop damage from prolonged rain or saturated soil, including exclusions and rainfall triggers." },
      flood: { label: "Flood damage", detail: "Confirm whether river flooding and surface-water flooding are covered for your field." },
      drought: { label: "Drought", detail: "Check how insufficient rainfall is defined, the covered period and any index payment threshold." },
      hail: { label: "Hail damage", detail: "Ask whether direct hail damage to your crop is included and how losses are assessed." },
      wind: { label: "Storm & strong wind", detail: "Check coverage for wind damage to crops; farm buildings may require a separate policy." },
      "pests-disease": { label: "Pests & crop disease", detail: "These losses may be excluded. Ask whether specific pests or diseases can be covered and what prevention is required." },
    },
  },
  fr: {
    title: "Choisissez la protection de vos cultures",
    note: "Garanties à demander à un assureur, pas des contrats dont la disponibilité est confirmée. Vos choix ne constituent ni une souscription ni un achat.",
    selected: "Vos préférences de couverture", empty: "Aucune garantie sélectionnée", clear: "Effacer les choix",
    choices: {
      "excess-rain": { label: "Excès de pluie et engorgement", detail: "Demandez les garanties pour les pluies prolongées ou les sols saturés, les exclusions et les seuils de pluie." },
      flood: { label: "Dégâts d’inondation", detail: "Confirmez la couverture des débordements de cours d’eau et des inondations par ruissellement sur votre parcelle." },
      drought: { label: "Sécheresse", detail: "Vérifiez la définition du manque de pluie, la période couverte et le seuil de paiement indiciel éventuel." },
      hail: { label: "Dégâts de grêle", detail: "Demandez si les dégâts directs de grêle sur votre culture sont couverts et comment ils sont évalués." },
      wind: { label: "Tempêtes et vents forts", detail: "Vérifiez la couverture des dégâts du vent sur les cultures ; les bâtiments peuvent nécessiter un contrat distinct." },
      "pests-disease": { label: "Ravageurs et maladies", detail: "Ces pertes peuvent être exclues. Demandez quels ravageurs ou maladies sont assurables et quelle prévention est exigée." },
    },
  },
  rw: {
    title: "Hitamo ibyangiza ibihingwa wifuza kwishingira",
    note: "Ibi ni ibyo kubaza ikigo cy’ubwishingizi, si amasezerano yemejwe ko ahari. Guhitamo si ugusaba cyangwa kugura ubwishingizi.",
    selected: "Ibyo wifuza kwishingira", empty: "Nta bwishingizi wahisemo", clear: "Kuraho ibyo wahisemo",
    choices: {
      "excess-rain": { label: "Imvura nyinshi n’amazi areka", detail: "Baza ku byangizwa n’imvura imara igihe cyangwa ubutaka bwuzuye amazi, ibitemewe n’ibipimo by’imvura." },
      flood: { label: "Ibyangizwa n’umwuzure", detail: "Menya niba umwuzure w’imigezi n’amazi atemba hejuru y’ubutaka mu murima wawe bishingirwa." },
      drought: { label: "Amapfa", detail: "Reba uko kubura imvura bisobanurwa, igihe gishingirwa n’igipimo gituma wishyurwa niba gihari." },
      hail: { label: "Ibyangizwa n’urubura", detail: "Baza niba ibihingwa byangijwe n’urubura bishingirwa n’uko igihombo gisuzumwa." },
      wind: { label: "Inkubi n’umuyaga mwinshi", detail: "Reba niba ibihingwa byangijwe n’umuyaga bishingirwa; inyubako z’umurima zishobora gukenera andi masezerano." },
      "pests-disease": { label: "Udukoko n’indwara z’ibihingwa", detail: "Ibi bishobora kutishingirwa. Baza udukoko cyangwa indwara zishobora kwishingirwa n’ingamba zo kubikumira zisabwa." },
    },
  },
};