export type FarmerLanguage = "en" | "rw" | "fr";

import { MONTHS } from "./season-guide";

export const farmerCopy = {
  en: {
    farmer: "Farmer",
    agronomist: "Agronomist",
    advicePage: "Advice",
    guidancePage: "Guidance",
    language: "Language",
    advisory: "Farmer Advisory",
    field: "Your field",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    title: "What should I plant this season?",
    intro:
      "Crop estimates use general growing conditions until a trained prediction server is connected. Enter your rainfall and temperature forecast; these values are not live weather.",
    district: "District",
    soil: "Soil type",
    rain: "Rain for the season (mm)",
    temp: "Usual temperature (°C)",
    analysing: "Analysing…",
    recommended: "Recommended crop",
    confidence: "Suitability estimate",
    yield: "Estimated yield",
    alternatives: "Other crops",
    invalid: "Enter rainfall from 0 to 5,000 mm and temperature from −5 to 45 °C.",
    failed: "The recommendation could not be updated. Please try again.",
    localNote:
      "General estimate, not a measured probability or guaranteed harvest. District-specific training data is not connected; changing district may give the same estimate.",
    assistant: "AI season assistant",
    seasons: "Seasons & rainfall",
    month: "Month",
    farming: "Farming season",
    typical: "Typical rainfall",
    ask: "Ask AI about",
    preparing: "Preparing advice…",
    advice: "AI advice",
    seasonNote:
      "This is the usual seasonal pattern, not measured rain or a forecast. Amounts vary by district and year.",
    aiUnavailable: "AI assistance is unavailable. The usual-season guide remains available.",
    weatherTitle: "District weather",
    climateTypical: "Typical for {district} ({period}): {season}, {rain} mm rain, {temp} °C",
    forecastOutlook: "Next {days} days ({source}): {rain} mm expected, {min}–{max} °C",
    rainLikely: "rain likely {from}–{to}",
    weatherUnavailable:
      "The district weather is not available right now, so enter your own figures.",
    weatherAuto:
      "Rain and temperature come from {district}'s {period} climate record, for the season you chose. Edit either figure to use your own.",
    useDistrictFigures: "Use the district's figures again",
    observations: "based on {n} farm observations",
    meteo: "Meteo Rwanda climatology",
    calendar: "NISR season calendar",
    disclosure: "AI disclosure",
    disclosureText:
      "AI tools helped develop ImbutoSmart AI. Crop estimates do not replace advice from a local agronomist.",
  },
  fr: {
    farmer: "Agriculteur",
    agronomist: "Agronome",
    advicePage: "Conseils",
    guidancePage: "Orientation",
    language: "Langue",
    advisory: "Conseils agricoles",
    field: "Votre champ",
    switchToDark: "Passer en mode sombre",
    switchToLight: "Passer en mode clair",
    title: "Que planter cette saison ?",
    intro:
      "Les estimations reposent sur les conditions générales de culture tant qu’un modèle entraîné n’est pas connecté. Saisissez les prévisions de pluie et de température ; ce ne sont pas des observations en temps réel.",
    district: "District",
    soil: "Type de sol",
    rain: "Pluie de la saison (mm)",
    temp: "Température habituelle (°C)",
    analysing: "Analyse en cours…",
    recommended: "Culture recommandée",
    confidence: "Aptitude estimée",
    yield: "Rendement estimé",
    alternatives: "Autres cultures",
    invalid: "Saisissez une pluie de 0 à 5 000 mm et une température de −5 à 45 °C.",
    failed: "La recommandation n’a pas pu être actualisée. Veuillez réessayer.",
    localNote:
      "Estimation générale, pas une probabilité mesurée ni une récolte garantie. Les données d’entraînement par district ne sont pas connectées ; changer de district peut donner la même estimation.",
    assistant: "Assistant IA des saisons",
    seasons: "Saisons et pluies",
    month: "Mois",
    farming: "Saison agricole",
    typical: "Pluviométrie habituelle",
    ask: "Demander à l’IA pour",
    preparing: "Préparation des conseils…",
    advice: "Conseils de l’IA",
    seasonNote:
      "Il s’agit du cycle saisonnier habituel, pas de pluies mesurées ni de prévisions. Les quantités varient selon le district et l’année.",
    aiUnavailable:
      "L’assistance IA est indisponible. Le guide des saisons habituelles reste disponible.",
    weatherTitle: "Météo du district",
    climateTypical: "Habituel pour {district} ({period}) : {season}, {rain} mm de pluie, {temp} °C",
    forecastOutlook: "{days} prochains jours ({source}) : {rain} mm attendus, {min}–{max} °C",
    rainLikely: "pluie probable de {from} à {to}",
    weatherUnavailable:
      "La météo du district n’est pas disponible pour le moment ; saisissez vos propres valeurs.",
    weatherAuto:
      "La pluie et la température proviennent des relevés climatiques de {district} ({period}), pour la saison choisie. Modifiez l’une des valeurs pour utiliser les vôtres.",
    useDistrictFigures: "Reprendre les chiffres du district",
    observations: "d’après {n} observations d’exploitations",
    meteo: "Climatologie — Meteo Rwanda",
    calendar: "Calendrier des saisons — NISR",
    disclosure: "Utilisation de l’IA",
    disclosureText:
      "Des outils d’IA ont contribué au développement d’ImbutoSmart AI. Les estimations agricoles ne remplacent pas les conseils d’un agronome local.",
  },
  rw: {
    farmer: "Umuhinzi",
    agronomist: "Impuguke",
    advicePage: "Inama",
    guidancePage: "Ubuyobozi",
    language: "Ururimi",
    advisory: "Inama ku muhinzi",
    field: "Umurima wawe",
    switchToDark: "Hindura kuri murongo umuhondo",
    switchToLight: "Hindura kuri murongo umuhite",
    title: "Nahinga iki muri iki gihembwe?",
    intro:
      "Ibigereranyo by’ibihingwa bishingiye ku bumenyi rusange bw’ubuhinzi kugeza seriveri yatojwe ihujwe. Andika imvura n’ubushyuhe byitezwe; si amakuru y’ikirere y’ako kanya.",
    district: "Akarere",
    soil: "Ubwoko bw’ubutaka",
    rain: "Imvura y’igihembwe (mm)",
    temp: "Ubushyuhe busanzwe (°C)",
    analysing: "Turasesengura…",
    recommended: "Igihingwa gisabwa",
    confidence: "Ikigereranyo cyo kuberanya",
    yield: "Umusaruro ugereranyijwe",
    alternatives: "Ibindi bihingwa",
    invalid:
      "Andika imvura kuva kuri 0 kugeza kuri 5.000 mm n’ubushyuhe kuva kuri −5 kugeza kuri 45 °C.",
    failed: "Inama ntiyashoboye kuvugururwa. Ongera ugerageze.",
    localNote:
      "Ibi ni ibigereranyo rusange, si amahirwe yapimwe cyangwa isezerano ry’umusaruro. Amakuru yo gutoza kuri buri karere ntarahuzwa; guhindura akarere bishobora gutanga ikigereranyo kimwe.",
    assistant: "Umufasha wa AI ku bihembwe",
    seasons: "Ibihembwe n’imvura",
    month: "Ukwezi",
    farming: "Igihembwe cy’ihinga",
    typical: "Imvura isanzwe",
    ask: "Baza AI kuri",
    preparing: "Turategura inama…",
    advice: "Inama za AI",
    seasonNote:
      "Ibi ni uko imvura isanzwe igwa mu bihembwe, si imvura yapimwe cyangwa iteganyagihe. Ingano ihinduka bitewe n’akarere n’umwaka.",
    aiUnavailable: "Umufasha wa AI ntabonetse. Amakuru asanzwe y’ibihembwe aracyaboneka.",
    weatherTitle: "Ikirere c'akarere",
    climateTypical:
      "Bisanzwe muri {district} ({period}): {season}, imvura {rain} mm, ubushyuhe {temp} °C",
    forecastOutlook: "Iminsi {days} ({source}): {rain} mm biteganyijwe, {min}–{max} °C",
    rainLikely: "imvura igaragara ku {from}–{to}",
    weatherUnavailable: "Ikirere c'akarere ntikaboneka ubu, andika ibiranganyo byawe.",
    weatherAuto:
      "Imvura n'ubushyuhe biva mu nyandiko y'ikirere y'akarere ka {district} ({period}), ku gihembwe wahisemo. Hindura kimwe muri byo niba ufite ibyawe.",
    useDistrictFigures: "Ongera ukoreshe imibare y'akarere",
    observations: "bishingiye ku miryango {n} y'abimurimuriro",
    meteo: "Ikirere cya Rwanda — Meteo Rwanda",
    calendar: "Kalendari y’ibihembwe — NISR",
    disclosure: "Ikoreshwa rya AI",
    disclosureText:
      "Ibikoresho bya AI byafashije gukora ImbutoSmart AI. Ibigereranyo by’ibihingwa ntibisimbura inama z’impuguke mu buhinzi yo hafi yawe.",
  },
};

const crops: Record<string, string> = {
  "Irish Potato": "Ibirayi",
  Maize: "Ibigori",
  Beans: "Ibishyimbo",
  Cassava: "Imyumbati",
  Sorghum: "Amasaka",
  Rice: "Umuceri",
  Banana: "Ibitoki",
  "Sweet Potato": "Ibijumba",
  Wheat: "Ingano",
};
const soils: Record<string, string> = {
  Volcanic: "Ubutaka bw’ibirunga",
  Clay: "Ubutaka bw’ibumba",
  Loam: "Ubutaka buvanze",
  Sandy: "Ubutaka bw’umucanga",
  Laterite: "Ubutaka butukura (laterite)",
  Humic: "Ubutaka bukungahaye ku bisigazwa by’ibimera",
};
const frenchCrops: Record<string, string> = {
  "Irish Potato": "Pomme de terre",
  Maize: "Maïs",
  Beans: "Haricots",
  Cassava: "Manioc",
  Sorghum: "Sorgho",
  Rice: "Riz",
  Banana: "Banane",
  "Sweet Potato": "Patate douce",
  Wheat: "Blé",
};
const frenchSoils: Record<string, string> = {
  Volcanic: "Sol volcanique",
  Clay: "Sol argileux",
  Loam: "Sol limoneux",
  Sandy: "Sol sableux",
  Laterite: "Sol latéritique",
  Humic: "Sol humifère",
};
export const cropLabel = (crop: string, language: FarmerLanguage) =>
  language === "rw"
    ? (crops[crop] ?? crop)
    : language === "fr"
      ? (frenchCrops[crop] ?? crop)
      : crop;
export const soilLabel = (soil: string, language: FarmerLanguage) =>
  language === "rw"
    ? (soils[soil] ?? soil)
    : language === "fr"
      ? (frenchSoils[soil] ?? soil)
      : soil;
export const RW_MONTHS = [
  "Mutarama",
  "Gashyantare",
  "Werurwe",
  "Mata",
  "Gicurasi",
  "Kamena",
  "Nyakanga",
  "Kanama",
  "Nzeri",
  "Ukwakira",
  "Ugushyingo",
  "Ukuboza",
];
export const FR_MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// The agricultural season in the farmer's language, for the district weather.
export function seasonName(language: FarmerLanguage, season: "A" | "B" | "C"): string {
  if (language === "rw") return `Igihembwe ${season}`;
  if (language === "fr") return `Saison ${season}`;
  return `Season ${season}`;
}

// A forecast day, e.g. "23 Oct", in the farmer's language. The date comes from
// the forecast in Kigali time, so it is written out rather than formatted from
// the device's clock.
export function forecastDayLabel(date: string, language: FarmerLanguage): string {
  const months = language === "rw" ? RW_MONTHS : language === "fr" ? FR_MONTHS : MONTHS;
  const month = months[Number(date.slice(5, 7)) - 1];
  const day = Number(date.slice(8, 10));
  return month ? `${day} ${month}` : String(day);
}

export function localizedSeason(
  guide: {
    farming: string;
    period: string;
    name: string;
    local: string;
    rain: string;
    note: string;
  },
  language: FarmerLanguage,
) {
  if (language === "en") return guide;
  if (language === "fr") {
    const names: Record<string, string> = {
      "Long rainy season": "Grande saison des pluies",
      "Short rainy season": "Petite saison des pluies",
      "Short dry season": "Petite saison sèche",
      "Long dry season": "Grande saison sèche",
      "Transition toward short rains": "Transition vers la petite saison des pluies",
    };
    const periods: Record<string, string> = {
      "September–February": "Septembre–février",
      "March–June": "Mars–juin",
      "July–September": "Juillet–septembre",
      "A starts; C ends": "Début de A ; fin de C",
    };
    const rain: Record<string, string> = {
      "Wetter period": "Période plus pluvieuse",
      "Drier period": "Période plus sèche",
      "Drier / variable": "Plus sec / variable",
      Variable: "Variable",
    };
    const notes: Record<string, string> = {
      Itumba:
        "Mars–mai est habituellement une période pluvieuse. Les pluies varient considérablement selon le lieu et l’année.",
      Umuhindo:
        "Octobre–décembre est habituellement une période pluvieuse ; le début des pluies et les quantités varient selon le lieu.",
      "Toward Umuhindo":
        "En septembre, les saisons agricoles A et C se chevauchent. Attendez la confirmation locale des pluies avant de planter sans irrigation.",
      Urugaryi: "Une période plus sèche ; des pluies occasionnelles restent possibles.",
      Impeshyi:
        "Habituellement une période sèche ; planter sans irrigation est risqué sans une source d’eau fiable.",
    };
    return {
      ...guide,
      farming:
        guide.farming === "Seasons A & C"
          ? "Saisons A et C"
          : guide.farming.replace("Season", "Saison"),
      period: periods[guide.period] ?? guide.period,
      name: names[guide.name] ?? guide.name,
      local: guide.local === "Toward Umuhindo" ? "Vers Umuhindo" : guide.local,
      rain: rain[guide.rain] ?? guide.rain,
      note: notes[guide.local] ?? guide.note,
    };
  }
  const names: Record<string, string> = {
    "Long rainy season": "Igihe cy’imvura ndende",
    "Short rainy season": "Igihe cy’imvura ngufi",
    "Short dry season": "Igihe cy’izuba kigufi",
    "Long dry season": "Igihe cy’izuba kirekire",
    "Transition toward short rains": "Igihe cyegereza Umuhindo",
  };
  const periods: Record<string, string> = {
    "September–February": "Nzeri–Gashyantare",
    "March–June": "Werurwe–Kamena",
    "July–September": "Nyakanga–Nzeri",
    "A starts; C ends": "A iratangira; C irarangira",
  };
  const rain: Record<string, string> = {
    "Wetter period": "Imvura ikunze kuba nyinshi",
    "Drier period": "Imvura ikunze kuba nke",
    "Drier / variable": "Imvura nke / ihindagurika",
    Variable: "Imvura ihindagurika",
  };
  const notes: Record<string, string> = {
    Itumba:
      "Werurwe–Gicurasi ni igihe imvura ikunze kugwa. Ingano ihinduka bitewe n’ahantu n’umwaka.",
    Umuhindo:
      "Ukwakira–Ukuboza ni igihe imvura ikunze kugwa; igihe itangirira n’ingano birahinduka.",
    "Toward Umuhindo":
      "Muri Nzeri, ibihembwe A na C birahurirana. Tegereza ko imvura yemezwa aho uri mbere yo guhinga wishingikirije ku mvura.",
    Urugaryi: "Ni igihe cy’imvura nke; imvura ishobora kugwa rimwe na rimwe.",
    Impeshyi:
      "Akenshi ni igihe cy’izuba; guhinga wishingikirije ku mvura birashobora guteza igihombo udafite amazi ahagije.",
  };
  return {
    ...guide,
    farming:
      guide.farming === "Seasons A & C"
        ? "Ibihembwe A na C"
        : guide.farming.replace("Season", "Igihembwe"),
    period: periods[guide.period] ?? guide.period,
    name: names[guide.name] ?? guide.name,
    local: guide.local === "Toward Umuhindo" ? "Hegereje Umuhindo" : guide.local,
    rain: rain[guide.rain] ?? guide.rain,
    note: notes[guide.local] ?? guide.note,
  };
}

// Deterministic explanation of the usual-season reference, used when the AI answer states a measurement the guide never contains. It stays inside the reference data, so it can never invent a figure either.
export function seasonReferenceSummary(
  guide: {
    farming: string;
    period: string;
    name: string;
    local: string;
    rain: string;
    note: string;
  },
  language: FarmerLanguage,
): string {
  const local = localizedSeason(guide, language);
  const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);
  if (language === "fr") {
    const article = local.farming.startsWith("Saisons") ? "aux " : "la ";
    return `Ce mois appartient à ${article}${lowerFirst(local.farming)} (${local.period}). La saison climatique est la ${lowerFirst(local.name)} (${local.local}) : ${lowerFirst(local.rain)}. ${local.note} Vérifiez Meteo Rwanda et un agronome local avant de planter.`;
  }
  if (language === "rw") {
    return `Uyu munsi ukaba mu ${local.farming} (${local.period}). Igihe cy’ikirere ni ${local.name} (${local.local}) : ${lowerFirst(local.rain)}. ${local.note} Reba Meteo Rwanda n’impuguke yo hafi mbere yo guhinga.`;
  }
  return `This month falls in ${local.farming} (${local.period}). The climatic season is the ${local.name} (${local.local}): ${lowerFirst(local.rain)}. ${local.note} Check Meteo Rwanda and a local agronomist before planting.`;
}
