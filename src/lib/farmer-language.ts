export type FarmerLanguage = "en" | "rw";

export const farmerCopy = {
  en: {
    farmer: "Farmer", agronomist: "Agronomist", language: "Language", advisory: "Farmer Advisory",
    title: "What should I plant this season?", intro: "Crop estimates use general growing conditions until a trained prediction server is connected. Enter your rainfall and temperature forecast; these values are not live weather.",
    district: "District", soil: "Soil type", rain: "Forecast rain (mm)", temp: "Forecast temp (°C)",
    analysing: "Analysing…", recommended: "Recommended crop", confidence: "Suitability estimate", yield: "Estimated yield", alternatives: "Other crops",
    invalid: "Enter rainfall from 0 to 5,000 mm and temperature from −5 to 45 °C.", failed: "The recommendation could not be updated. Please try again.",
    localNote: "General estimate, not a measured probability or guaranteed harvest. District-specific training data is not connected; changing district may give the same estimate.",
    assistant: "AI season assistant", seasons: "Seasons & rainfall", month: "Month", farming: "Farming season", typical: "Typical rainfall", ask: "Ask AI about", preparing: "Preparing advice…", advice: "AI advice",
    seasonNote: "This is the usual seasonal pattern, not measured rain or a forecast. Amounts vary by district and year.", aiUnavailable: "AI assistance is unavailable. The usual-season guide remains available.",
    meteo: "Meteo Rwanda climatology", calendar: "NISR season calendar", disclosure: "AI disclosure", disclosureText: "AI tools helped develop SowSmart. Crop estimates do not replace advice from a local agronomist.",
  },
  rw: {
    farmer: "Umuhinzi", agronomist: "Impuguke", language: "Ururimi", advisory: "Inama ku muhinzi",
    title: "Nahinga iki muri iki gihembwe?", intro: "Ibigereranyo by’ibihingwa bishingiye ku bumenyi rusange bw’ubuhinzi kugeza seriveri yatojwe ihujwe. Andika imvura n’ubushyuhe byitezwe; si amakuru y’ikirere y’ako kanya.",
    district: "Akarere", soil: "Ubwoko bw’ubutaka", rain: "Imvura yitezwe (mm)", temp: "Ubushyuhe bwitezwe (°C)",
    analysing: "Turasesengura…", recommended: "Igihingwa gisabwa", confidence: "Ikigereranyo cyo kuberanya", yield: "Umusaruro ugereranyijwe", alternatives: "Ibindi bihingwa",
    invalid: "Andika imvura kuva kuri 0 kugeza kuri 5.000 mm n’ubushyuhe kuva kuri −5 kugeza kuri 45 °C.", failed: "Inama ntiyashoboye kuvugururwa. Ongera ugerageze.",
    localNote: "Ibi ni ibigereranyo rusange, si amahirwe yapimwe cyangwa isezerano ry’umusaruro. Amakuru yo gutoza kuri buri karere ntarahuzwa; guhindura akarere bishobora gutanga ikigereranyo kimwe.",
    assistant: "Umufasha wa AI ku bihembwe", seasons: "Ibihembwe n’imvura", month: "Ukwezi", farming: "Igihembwe cy’ihinga", typical: "Imvura isanzwe", ask: "Baza AI kuri", preparing: "Turategura inama…", advice: "Inama za AI",
    seasonNote: "Ibi ni uko imvura isanzwe igwa mu bihembwe, si imvura yapimwe cyangwa iteganyagihe. Ingano ihinduka bitewe n’akarere n’umwaka.", aiUnavailable: "Umufasha wa AI ntabonetse. Amakuru asanzwe y’ibihembwe aracyaboneka.",
    meteo: "Ikirere cya Rwanda — Meteo Rwanda", calendar: "Kalendari y’ibihembwe — NISR", disclosure: "Ikoreshwa rya AI", disclosureText: "Ibikoresho bya AI byafashije gukora SowSmart. Ibigereranyo by’ibihingwa ntibisimbura inama z’impuguke mu buhinzi yo hafi yawe.",
  },
};

const crops: Record<string, string> = { "Irish Potato": "Ibirayi", Maize: "Ibigori", Beans: "Ibishyimbo", Cassava: "Imyumbati", Sorghum: "Amasaka", Rice: "Umuceri", Banana: "Ibitoki", "Sweet Potato": "Ibijumba", Wheat: "Ingano" };
const soils: Record<string, string> = { Volcanic: "Ubutaka bw’ibirunga", Clay: "Ubutaka bw’ibumba", Loam: "Ubutaka buvanze", Sandy: "Ubutaka bw’umucanga", Laterite: "Ubutaka butukura (laterite)", Humic: "Ubutaka bukungahaye ku bisigazwa by’ibimera" };
export const cropLabel = (crop: string, language: FarmerLanguage) => language === "rw" ? crops[crop] ?? crop : crop;
export const soilLabel = (soil: string, language: FarmerLanguage) => language === "rw" ? soils[soil] ?? soil : soil;
export const RW_MONTHS = ["Mutarama", "Gashyantare", "Werurwe", "Mata", "Gicurasi", "Kamena", "Nyakanga", "Kanama", "Nzeri", "Ukwakira", "Ugushyingo", "Ukuboza"];

export function localizedSeason(guide: { farming: string; period: string; name: string; local: string; rain: string; note: string }, language: FarmerLanguage) {
  if (language === "en") return guide;
  const names: Record<string, string> = { "Long rainy season": "Igihe cy’imvura ndende", "Short rainy season": "Igihe cy’imvura ngufi", "Short dry season": "Igihe cy’izuba kigufi", "Long dry season": "Igihe cy’izuba kirekire", "Transition toward short rains": "Igihe cyegereza Umuhindo" };
  const periods: Record<string, string> = { "September–February": "Nzeri–Gashyantare", "March–June": "Werurwe–Kamena", "July–September": "Nyakanga–Nzeri", "A starts; C ends": "A iratangira; C irarangira" };
  const rain: Record<string, string> = { "Wetter period": "Imvura ikunze kuba nyinshi", "Drier period": "Imvura ikunze kuba nke", "Drier / variable": "Imvura nke / ihindagurika", Variable: "Imvura ihindagurika" };
  const notes: Record<string, string> = {
    Itumba: "Werurwe–Gicurasi ni igihe imvura ikunze kugwa. Ingano ihinduka bitewe n’ahantu n’umwaka.",
    Umuhindo: "Ukwakira–Ukuboza ni igihe imvura ikunze kugwa; igihe itangirira n’ingano birahinduka.",
    "Toward Umuhindo": "Muri Nzeri, ibihembwe A na C birahurirana. Tegereza ko imvura yemezwa aho uri mbere yo guhinga wishingikirije ku mvura.",
    Urugaryi: "Ni igihe cy’imvura nke; imvura ishobora kugwa rimwe na rimwe.",
    Impeshyi: "Akenshi ni igihe cy’izuba; guhinga wishingikirije ku mvura birashobora guteza igihombo udafite amazi ahagije.",
  };
  return { ...guide, farming: guide.farming === "Seasons A & C" ? "Ibihembwe A na C" : guide.farming.replace("Season", "Igihembwe"), period: periods[guide.period] ?? guide.period, name: names[guide.name] ?? guide.name, local: guide.local === "Toward Umuhindo" ? "Hegereje Umuhindo" : guide.local, rain: rain[guide.rain] ?? guide.rain, note: notes[guide.local] ?? guide.note };
}