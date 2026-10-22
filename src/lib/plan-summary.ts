import type { FarmerLanguage } from "./farmer-language";
import { inputName, type DistrictInputProfile } from "./advice";

// Browser-safe summary of a farmer's plan: what to plant, what farmers around
// them apply, what to ask an insurer about, and what else to do. Every number
// comes from the survey, the knowledge base or the climate record.

export type PlanSummary = {
  crops: { crop: string; score: number }[];
  inputs: { name: string; share: number; rateKgPerHa: number | null }[];
  insurance: string;
  insuranceNote: string;
  advice: string[];
};

export const summaryCopy: Record<
  FarmerLanguage,
  {
    title: string;
    intro: string;
    crops: string;
    inputs: string;
    usedBy: string;
    rate: string;
    organic: string;
    insurance: string;
    insuranceNote: string;
    advice: string;
    notify: string;
    notified: string;
    notifyBlocked: string;
    noInputs: string;
  }
> = {
  en: {
    title: "Your summary",
    intro: "Everything you need to act on, for the field you chose.",
    crops: "Crops for your field",
    inputs: "Inputs farmers here use",
    usedBy: "used by {n}% of the farmers here",
    rate: "about {n} kg per hectare, as applied here in 2025",
    organic: "organic",
    insurance: "Insurance to ask about",
    insuranceNote:
      "Excess-rain and flood cover is the one to ask a licensed insurer about. Whether you need it, and what it pays, depend on the policy — not on this app.",
    advice: "Also worth doing",
    notify: "Send me this summary",
    notified: "Summary sent",
    notifyBlocked: "Your browser is blocking notifications, so the summary stays here.",
    noInputs: "No input figures have been supplied for this district yet.",
  },
  rw: {
    title: "Incamake yawe",
    intro: "Byose ukeneye kugirira kugiramo, ku murima wahisemo.",
    crops: "Ibihingwa by’umurima wawe",
    inputs: "Ifumbire abahinzi b'aka karere bakoresha",
    usedBy: "abakoresha {n}% by’abahinzi",
    rate: "kuri {n} kg ku/hektari, nk’ibabakoresha hano mu 2025",
    organic: "y’umubiri",
    insurance: "Ubwishingizi bw'imvura nyinshi n'umwuzure",
    insuranceNote:
      "Ubwishingizi bw’imvura nyinshi n’umwuzure ni bwinyabazwe wabagoyeza. Nimba ukeneye cyangwa icyakubitirwa, byerekana n’amasezerano y’ikigo, si kuri iyi porogaramu.",
    advice: "Ibindi byakora",
    notify: "Ohereza inyandiko",
    notified: "Inyandiko yoherejwe",
    notifyBlocked: "Umufurashisha wawe urabibuza ubutumwa, bityo inyandiko igahenda hano.",
    noInputs: "Nta mafishi y’ifumbire abatariwa kuri karere aka.",
  },
  fr: {
    title: "Votre récapitulatif",
    intro: "Tout ce qu'il vous faut pour agir, pour le champ que vous avez choisi.",
    crops: "Cultures pour votre champ",
    inputs: "Intrants utilisés ici",
    usedBy: "utilisés par {n}% des agriculteurs du district",
    rate: "environ {n} kg par hectare, comme appliqué ici en 2025",
    organic: "organique",
    insurance: "Assurance à demander",
    insuranceNote:
      "La couverture excès de pluie et inondation est celle à demander à un assureur agréé. Le besoin et l'indemnisation dépendent du contrat, pas de cette application.",
    advice: "À faire aussi",
    notify: "M'envoyer ce récapitulatif",
    notified: "Récapitulatif envoyé",
    notifyBlocked: "Votre navigateur bloque les notifications : le récapitulatif reste ici.",
    noInputs: "Aucun chiffre d'intrant n'a encore été fourni pour ce district.",
  },
};

export function buildPlanSummary(input: {
  district: string;
  soil: string;
  season: "A" | "B" | "C" | null;
  crops: { crop: string; score: number }[];
  profile: DistrictInputProfile | null;
  climate: { rainMm: number; tempC: number } | null;
  language: FarmerLanguage;
}): PlanSummary {
  const t = summaryCopy[input.language];
  const profile = input.profile;

  const inputs: PlanSummary["inputs"] = [
    ...Object.entries(profile?.inorganic ?? {})
      .slice(0, 3)
      .map(([name, share]) => ({ name, share, rateKgPerHa: profile?.rates?.[name] ?? null })),
    ...Object.entries(profile?.organic ?? {})
      .slice(0, 2)
      .map(([name, share]) => ({ name, share, rateKgPerHa: null })),
  ];

  const advice: string[] = [];
  advice.push(
    input.language === "rw"
      ? "Hingira ku ntambwe y’imvura yizewe y’igihe, wirinde guhinga nyuma y’imvura nyinshi yarangiye."
      : input.language === "fr"
        ? "Plantez avec les premières pluies fiables de la saison et évitez de planter après les fortes pluies."
        : "Plant with the first reliable rains of the season, and avoid planting after heavy rain has passed.",
  );
  if (profile && profile.irrigatedShare < 0.2) {
    advice.push(
      input.language === "rw"
        ? `Abahinzi b’aka karere ni ${Math.round(profile.irrigatedShare * 100)}% gusa bahuza amazi; igihembwe gisanzwe gikwiye imvura.`
        : input.language === "fr"
          ? `Seuls ${Math.round(profile.irrigatedShare * 100)}% des agriculteurs du district irriguent : la saison dépend surtout de la pluie.`
          : `Only ${Math.round(profile.irrigatedShare * 100)}% of the farmers here irrigate, so the season leans on the rain.`,
    );
  }
  if (profile && profile.erodedShare > 0.15) {
    advice.push(
      input.language === "rw"
        ? `${Math.round(profile.erodedShare * 100)}% by’umurima hano binyereka isuri: ubutaka burashobora gukubikwa ibimera cyangwa imiganda.`
        : input.language === "fr"
          ? `${Math.round(profile.erodedShare * 100)}% des champs du district signalent de l'érosion : gardez le sol couvert.`
          : `${Math.round(profile.erodedShare * 100)}% of the fields here report soil erosion: keep the soil covered.`,
    );
  }
  advice.push(
    input.language === "rw"
      ? "Gukora igipimusho ry’ubutaka ni icyo wumenya niba ubutaka bw’akazi gushimishije."
      : input.language === "fr"
        ? "Une analyse de sol est ce qui vous dit ce qui manque à votre champ."
        : "A soil test is what tells you what your field is short of.",
  );

  return {
    crops: input.crops,
    inputs: inputs.map((item) => ({ ...item, name: inputName(item.name, input.language) })),
    insurance: t.insurance,
    insuranceNote: t.insuranceNote,
    advice,
  };
}
