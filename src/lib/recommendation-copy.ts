import type { SuitabilityBand } from "./recommendation-engine";

// Browser-safe farmer-facing copy for the hybrid crop recommender. One
// catalog, three languages, shared by the online AI path and the offline
// engine so both modes speak to the farmer identically.

export type RecommendationLanguage = "en" | "rw" | "fr";

type ModeCopy = {
  online: string;
  offline: string;
  onlineNote: string;
  offlineNote: string;
};

type FormCopy = {
  heading: string;
  intro: string;
  context: string;
  soilPh: string;
  phHint: string;
  landSize: string;
  landHint: string;
  season: string;
  seasonAny: string;
  seasonA: string;
  seasonB: string;
  seasonC: string;
  water: string;
  waterUnknown: string;
  experience: string;
  experienceUnknown: string;
  preference: string;
  noPreference: string;
  rainfed: string;
  irrigated: string;
  limited: string;
  expNew: string;
  expSome: string;
  expExperienced: string;
  submit: string;
};

type ResultCopy = {
  recommended: string;
  score: string;
  band: Record<SuitabilityBand, string>;
  why: string;
  soilConditions: string;
  waterNeeds: string;
  growingPeriod: string;
  plantingSeason: string;
  considerations: string;
  risks: string;
  alternatives: string;
  warning: string;
  offlineBadge: string;
  onlineBadge: string;
  loading: string;
  failed: string;
  savedLocal: string;
  pendingSync: string;
  synced: string;
  noData: string;
};

export type RecommendationCopy = {
  mode: ModeCopy;
  form: FormCopy;
  result: ResultCopy;
};

const en: RecommendationCopy = {
  mode: {
    online: "Online",
    offline: "Offline",
    onlineNote: "Online Mode: Recommendations use current available data.",
    offlineNote: "Offline Mode: Recommendations are based on locally stored agricultural data.",
  },
  form: {
    heading: "Crop recommendation",
    intro:
      "Add what you know about your field. Every detail is optional — the recommendation uses whatever you provide.",
    context: "Using the district, soil, rain and temperature from the form above:",
    soilPh: "Soil pH (if known)",
    phHint: "For example 6.5",
    landSize: "Land size (hectares)",
    landHint: "For example 0.5",
    season: "Planting season",
    seasonAny: "Not sure",
    seasonA: "Season A",
    seasonB: "Season B",
    seasonC: "Season C",
    water: "Water on the farm",
    waterUnknown: "Not sure",
    experience: "Farming experience",
    experienceUnknown: "Not sure",
    preference: "Crop you prefer (optional)",
    noPreference: "No preference",
    rainfed: "Rain-fed (depends on rain)",
    irrigated: "Irrigated (water available)",
    limited: "Limited water",
    expNew: "New to farming",
    expSome: "Some experience",
    expExperienced: "Experienced",
    submit: "Recommend crops",
  },
  result: {
    recommended: "Recommended crop",
    score: "Suitability score",
    band: {
      highly: "Highly Suitable",
      suitable: "Suitable",
      moderate: "Moderately Suitable",
      low: "Low Suitability",
    },
    why: "Why this crop is recommended",
    soilConditions: "Required soil conditions",
    waterNeeds: "Water requirements",
    growingPeriod: "Expected growing period",
    plantingSeason: "Recommended planting season",
    considerations: "Important farming considerations",
    risks: "Potential risks",
    alternatives: "Alternative crops",
    warning:
      "These recommendations are estimates based on available data and should be confirmed with local agricultural experts when possible.",
    offlineBadge: "From local agricultural data",
    onlineBadge: "Using current available data",
    loading: "Preparing your recommendation…",
    failed: "The recommendation could not be prepared. Please try again.",
    savedLocal: "Saved on this device.",
    pendingSync: "Waiting to sync when online.",
    synced: "Synced with the server.",
    noData: "Enter at least your district and soil to get a recommendation.",
  },
};

const rw: RecommendationCopy = {
  mode: {
    online: "Kuri interineti",
    offline: "Nta interineti",
    onlineNote: "Uburyo bwa interineti: inama zishingikirije ku makuru aboneka ubu.",
    offlineNote:
      "Uburyo bwo nta interineti: inama zishingikirije ku makuru y’ubuhinzi abitswe kuri iyi mudasobwa.",
  },
  form: {
    heading: "Inama ku gihingwa",
    intro:
      "Ongeraho ibyo wamenye ku murima wawe. Buri kintu si ngombwa — inama ikoresha ibyo utanze.",
    context: "Bishingiye ku karere, ubutaka, imvura n’ubushyuhe biri hejuru:",
    soilPh: "pH y’ubutaka (niba uyizi)",
    phHint: "Urugero 6.5",
    landSize: "Ubuso bw’umurima (hekitare)",
    landHint: "Urugero 0.5",
    season: "Igihe cyo guhinga",
    seasonAny: "Sinzi neza",
    seasonA: "Igihembwe A",
    seasonB: "Igihembwe B",
    seasonC: "Igihembwe C",
    water: "Amazi ku murima",
    waterUnknown: "Sinzi neza",
    experience: "Ubuhanga bwo guhinga",
    experienceUnknown: "Sinzi neza",
    preference: "Igihingwa ushaka (si ngombwa)",
    noPreference: "Nta gihingwa cyihariye",
    rainfed: "Gishingiye ku mvura",
    irrigated: "Gihirwa amazi",
    limited: "Amazi make",
    expNew: "Nshya mu buhinzi",
    expSome: "Nfite ubuhanga buke",
    expExperienced: "Nfite uburambe",
    submit: "Tanga inama ku gihingwa",
  },
  result: {
    recommended: "Igihingwa cyatoranijwe",
    score: "Urwego rw’uko gikwiye",
    band: {
      highly: "Bikwiye cyane",
      suitable: "Bikwiye",
      moderate: "Bikwiye gusa",
      low: "Ntibikwiye",
    },
    why: "Impamvu igihingwa cyatoranijwe",
    soilConditions: "Ubutaka bukenewe",
    waterNeeds: "Amazi akenewe",
    growingPeriod: "Igihe igihingwa gikura",
    plantingSeason: "Igihe cyiza cyo guhinga",
    considerations: "Ibyo ukeneye kumenya ku buhinzi",
    risks: "Ibyo bishobora kubaho",
    alternatives: "Ibindi bihingwa ushobora guhinga",
    warning:
      "Aya ni amakuru y’igereranyo ashingiye ku makuru aboneka, kandi agomba kwemezwa n’impuguke y’ubuhinzi yo hafi yawe.",
    offlineBadge: "Bishingiye ku makuru y’ubuhinzi abitswe hano",
    onlineBadge: "Hakoreshwa amakuru aboneka ubu",
    loading: "Inama irategurwa…",
    failed: "Inama ntiyashobotse gutegurwa. Ongera ugerageze.",
    savedLocal: "Byabitswe kuri iyi mudasobwa.",
    pendingSync: "Birindira koherezwa igihe interineti izaba ibonetse.",
    synced: "Byoherejwe kuri seriveri.",
    noData: "Andika akarere n’ubutaka mbere yo kubona inama.",
  },
};

const fr: RecommendationCopy = {
  mode: {
    online: "En ligne",
    offline: "Hors ligne",
    onlineNote:
      "Mode en ligne : les recommandations utilisent les données actuellement disponibles.",
    offlineNote:
      "Mode hors ligne : les recommandations sont basées sur des données agricoles stockées localement.",
  },
  form: {
    heading: "Recommandation de culture",
    intro:
      "Ajoutez ce que vous savez de votre champ. Chaque détail est facultatif — la recommandation utilise les informations fournies.",
    context:
      "À partir du district, du sol, de la pluie et de la température du formulaire ci-dessus :",
    soilPh: "pH du sol (si connu)",
    phHint: "Par exemple 6,5",
    landSize: "Superficie (hectares)",
    landHint: "Par exemple 0,5",
    season: "Saison de plantation",
    seasonAny: "Je ne sais pas",
    seasonA: "Saison A",
    seasonB: "Saison B",
    seasonC: "Saison C",
    water: "Eau sur la ferme",
    waterUnknown: "Je ne sais pas",
    experience: "Expérience agricole",
    experienceUnknown: "Je ne sais pas",
    preference: "Culture que vous préférez (facultatif)",
    noPreference: "Aucune préférence",
    rainfed: "Pluvial (dépend de la pluie)",
    irrigated: "Irrigué (eau disponible)",
    limited: "Eau limitée",
    expNew: "Débutant",
    expSome: "Quelques expériences",
    expExperienced: "Expérimenté",
    submit: "Recommander des cultures",
  },
  result: {
    recommended: "Culture recommandée",
    score: "Score d’adéquation",
    band: {
      highly: "Très adapté",
      suitable: "Adapté",
      moderate: "Moyennement adapté",
      low: "Peu adapté",
    },
    why: "Pourquoi cette culture est recommandée",
    soilConditions: "Conditions de sol requises",
    waterNeeds: "Besoins en eau",
    growingPeriod: "Durée de culture prévue",
    plantingSeason: "Saison de plantation recommandée",
    considerations: "Points importants de l’agriculture",
    risks: "Risques potentiels",
    alternatives: "Cultures alternatives",
    warning:
      "Ces recommandations sont des estimations basées sur les données disponibles et doivent être confirmées avec des experts agricoles locaux si possible.",
    offlineBadge: "À partir des données agricoles locales",
    onlineBadge: "Utilise les données actuellement disponibles",
    loading: "Préparation de votre recommandation…",
    failed: "La recommandation n’a pas pu être préparée. Veuillez réessayer.",
    savedLocal: "Enregistré sur cet appareil.",
    pendingSync: "En attente de synchronisation une fois en ligne.",
    synced: "Synchronisé avec le serveur.",
    noData: "Saisissez au moins votre district et votre sol pour obtenir une recommandation.",
  },
};

export const recommendationCopy: Record<RecommendationLanguage, RecommendationCopy> = {
  en,
  rw,
  fr,
};
