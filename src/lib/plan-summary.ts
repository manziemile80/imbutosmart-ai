import { z } from "zod";

import type { FarmerLanguage } from "./farmer-language";
import { seasonName, soilLabel } from "./farmer-language";
import { knowledgeCropLabel } from "./crop-knowledge";
import { inputName, type DistrictInputProfile } from "./advice";
import { DISTRICTS, SOILS } from "./api";

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
    noInputs: string;
    noCrops: string;
    field: string;
    share: string;
    shared: string;
    copied: string;
    shareFailed: string;
    shareFooter: string;
    nameLabel: string;
    namePlaceholder: string;
    nameInvalid: string;
    emailTitle: string;
    emailIntro: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailSend: string;
    emailSending: string;
    emailHint: string;
    emailReady: string;
    emailSent: string;
    emailInvalid: string;
    toastSent: string;
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
    noInputs: "No input figures have been supplied for this district yet.",
    noCrops: "No crops have been estimated for this field yet.",
    field: "Your field",
    share: "Share all of this",
    shared: "Summary shared",
    copied: "Summary copied",
    shareFailed: "Sharing is not available here, so the summary stays on this page.",
    shareFooter:
      "Shared from ImbutoSmart AI. Figures come from the NISR survey and the district's climate record.",
    nameLabel: "Your name",
    namePlaceholder: "e.g. Aline",
    nameInvalid: "Enter your name, then try again.",
    emailTitle: "Send this summary to your email",
    emailIntro: "The whole summary arrives as an email you can keep.",
    emailLabel: "Your email address",
    emailPlaceholder: "you@example.com",
    emailSend: "Send the summary",
    emailSending: "Sending the summary…",
    emailHint: "Your name and address are used only for this summary, and stay in this browser.",
    emailReady:
      "We could not send it from the app, so your mail app was opened for {email} with the summary ready to send. If nothing opened, use Share all of this.",
    emailSent:
      "Summary sent to {email}. Look in your inbox in a few minutes, and in the spam folder if it is not there.",
    emailInvalid: "Check the email address, then try again.",
    toastSent: "Summary sent successfully to {email}",
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
    noInputs: "Nta mafishi y’ifumbire abatariwa kuri karere aka.",
    noCrops: "Nta bihingwa byagereranyijwe kuri uyu murima.",
    field: "Umurima wawe",
    share: "Sangiza ibi byose",
    shared: "Incamake yasangijwe",
    copied: "Incamake yakoporowe",
    shareFailed: "Gusangiza ntibishoboka hano, bityo incamake iguma kuri iyi paji.",
    shareFooter:
      "Byasangijwe biva kuri ImbutoSmart AI. Imibare iva mu bushakashatsi bwa NISR n'inyandiko z'ikirere z'akarere.",
    nameLabel: "Amazina yawe",
    namePlaceholder: "urugero: Aline",
    nameInvalid: "Andika amazina yawe, hanyuma ugerageze.",
    emailTitle: "Ohereza iyi ncamake kuri imeyili yawe",
    emailIntro: "Incamake yose igera nk'imeyili ushobora kugumana.",
    emailLabel: "Aderesi ya imeyili yawe",
    emailPlaceholder: "wowe@urugero.com",
    emailSend: "Ohereza incamake",
    emailSending: "Kohereza incamake…",
    emailHint:
      "Amazina n'aderesi yawe bikoreshwa gusa muri iyi ncamake, kandi biguma kuri iyi gikoresho.",
    emailReady:
      "Ntitwashoboye kuyohereza mu buryo bwa porogaramu, bityo porogaramu yawe ya imeyili yafunguriwe {email} n'incamake yiteguye koherezwa. Niba nta kintu cyafunguwe, koresha “Sangiza ibi byose”.",
    emailSent:
      "Incamake yoherejwe kuri {email}. Reba mu imeyili yawe mu minota mike, no mu bubiko bw'ubutumwa butifuzwa niba utayisanganywe.",
    emailInvalid: "Reba aderesi ya imeyili, hanyuma ugerageze.",
    toastSent: "Incamake yoherejwe neza kuri {email}",
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
    noInputs: "Aucun chiffre d'intrant n'a encore été fourni pour ce district.",
    noCrops: "Aucune culture n'a encore été estimée pour ce champ.",
    field: "Votre champ",
    share: "Partager tout ceci",
    shared: "Récapitulatif partagé",
    copied: "Récapitulatif copié",
    shareFailed: "Le partage n'est pas disponible ici ; le récapitulatif reste sur cette page.",
    shareFooter:
      "Partagé depuis ImbutoSmart AI. Les chiffres viennent de l'enquête NISR et des relevés climatiques du district.",
    nameLabel: "Votre nom",
    namePlaceholder: "ex. Aline",
    nameInvalid: "Saisissez votre nom, puis réessayez.",
    emailTitle: "Envoyer ce récapitulatif à votre e-mail",
    emailIntro: "Le récapitulatif complet arrive dans un e-mail que vous pouvez garder.",
    emailLabel: "Votre adresse e-mail",
    emailPlaceholder: "vous@exemple.com",
    emailSend: "Envoyer le récapitulatif",
    emailSending: "Envoi du récapitulatif…",
    emailHint:
      "Votre nom et votre adresse servent uniquement à ce récapitulatif, et restent sur cet appareil.",
    emailReady:
      "L'application n'a pas pu l'envoyer : votre application e-mail est ouverte pour {email} avec le récapitulatif prêt à envoyer. Si rien ne s'est ouvert, utilisez « Partager tout ceci ».",
    emailSent:
      "Récapitulatif envoyé à {email}. Regardez votre boîte de réception dans quelques minutes, et les courriers indésirables s'il n'apparaît pas.",
    emailInvalid: "Vérifiez l'adresse e-mail, puis réessayez.",
    toastSent: "Récapitulatif envoyé avec succès à {email}",
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

// The whole summary as plain text, for the share sheet or the clipboard. It
// carries every part the farmer sees in the notification panel, so a shared
// plan is never a shortened version of what the app showed.
export function buildPlanShareText(input: {
  summary: PlanSummary;
  district: string;
  soil: string;
  season: "A" | "B" | "C" | null;
  language: FarmerLanguage;
}): string {
  const t = summaryCopy[input.language];
  const lines: string[] = [`${t.title} — ${input.district}`, ""];

  lines.push(
    `${t.field}: ${[
      input.district,
      soilLabel(input.soil, input.language),
      input.season ? seasonName(input.language, input.season) : null,
    ]
      .filter(Boolean)
      .join(" · ")}`,
    "",
  );

  lines.push(t.crops);
  if (input.summary.crops.length === 0) {
    lines.push(t.noCrops);
  } else {
    for (const crop of input.summary.crops) {
      lines.push(`• ${knowledgeCropLabel(crop.crop, input.language)} — ${crop.score}%`);
    }
  }
  lines.push("");

  lines.push(t.inputs);
  if (input.summary.inputs.length === 0) {
    lines.push(t.noInputs);
  } else {
    for (const item of input.summary.inputs) {
      const share = Math.round(item.share * 100);
      lines.push(`• ${item.name} — ${t.usedBy.replace("{n}", String(share))}`);
      if (item.rateKgPerHa) {
        lines.push(`  ${t.rate.replace("{n}", String(Math.round(item.rateKgPerHa)))}`);
      }
    }
  }
  lines.push("");

  lines.push(t.insurance);
  lines.push(input.summary.insuranceNote, "");

  lines.push(t.advice);
  for (const line of input.summary.advice) lines.push(`• ${line}`);
  lines.push("", t.shareFooter);

  return lines.join("\n");
}

// The farmer's name goes in the greeting of the emailed summary. It is a name,
// not free text: no digits or line breaks, so it cannot alter the message.
const PLAN_NAME_MAX = 80;
const PLAN_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;

export function isValidPlanName(value: string): boolean {
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= PLAN_NAME_MAX && PLAN_NAME_PATTERN.test(name);
}

export function planGreeting(name: string | undefined, language: FarmerLanguage): string {
  const trimmed = name?.trim().replace(/\s+/g, " ");
  if (!trimmed || !isValidPlanName(trimmed)) return "";
  return language === "rw"
    ? `Muraho ${trimmed},`
    : language === "fr"
      ? `Bonjour ${trimmed},`
      : `Hello ${trimmed},`;
}

// The fields the server needs to rebuild the same summary and address it to
// the farmer. The browser sends the field, never a ready-made message.
export const planEmailInputSchema = z.object({
  name: z.string().trim().max(PLAN_NAME_MAX).refine(isValidPlanName, "Enter your name."),
  email: z.string().trim().max(254).refine(isValidPlanEmail, "Enter a complete email address."),
  district: z.string().refine((value) => DISTRICTS.includes(value), "Choose a district."),
  soil: z.string().refine((value) => SOILS.includes(value), "Choose a soil type."),
  season: z.enum(["A", "B", "C"]).nullable(),
  language: z.enum(["en", "rw", "fr"]).default("en"),
});

export type PlanEmailInput = z.infer<typeof planEmailInputSchema>;

// The farmer's address only addresses the message: it opens the mail app on
// the farmer's own device when the app cannot send mail itself, and it is kept
// on the device so the next summary is ready without retyping.
const PLAN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPlanEmail(value: string): boolean {
  const email = value.trim();
  return email.length > 0 && email.length <= 254 && PLAN_EMAIL_PATTERN.test(email);
}

// A ready-to-send message holding the same sections as the notification panel,
// addressed to the farmer. The body is the share text, so an emailed summary is
// never a shortened version of what the app showed.
export function buildPlanEmail(input: {
  summary: PlanSummary;
  district: string;
  soil: string;
  season: "A" | "B" | "C" | null;
  language: FarmerLanguage;
  to: string;
  name?: string;
}): { to: string; subject: string; body: string; href: string } {
  const t = summaryCopy[input.language];
  const to = input.to.trim();
  const subject = `${t.title} — ${input.district}`;
  // The greeting makes the message the farmer's own; the rest is unchanged.
  const body = [planGreeting(input.name, input.language), buildPlanShareText(input)]
    .filter(Boolean)
    .join("\n\n");
  // An address keeps its "@" readable in the draft; everything else is escaped
  // so a line break or a "&" in the summary cannot break the message.
  const recipient = encodeURIComponent(to).replaceAll("%40", "@");
  const href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { to, subject, body, href };
}

// The address the farmer used on this device last time, kept in this browser
// only. The next summary is addressed for them without retyping it, and the
// address never leaves the device except as the recipient of their own mail.
export const PLAN_EMAIL_STORAGE_KEY = "imbutosmart-email";

export function readStoredPlanEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PLAN_EMAIL_STORAGE_KEY);
    return stored && isValidPlanEmail(stored) ? stored.trim() : null;
  } catch {
    // A browser that blocks storage still asks for the address once.
    return null;
  }
}

export function storePlanEmail(value: string) {
  if (typeof window === "undefined") return;
  const email = value.trim();
  if (!isValidPlanEmail(email)) return;
  try {
    window.localStorage.setItem(PLAN_EMAIL_STORAGE_KEY, email);
  } catch {
    // Nothing to do: this summary is still sent.
  }
}

// The same courtesy for the farmer's name, so the next summary is addressed
// without retyping it. It never leaves this browser except in their own email.
export const PLAN_NAME_STORAGE_KEY = "imbutosmart-name";

export function readStoredPlanName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PLAN_NAME_STORAGE_KEY);
    return stored && isValidPlanName(stored) ? stored.trim() : null;
  } catch {
    // A browser that blocks storage still asks for the name once.
    return null;
  }
}

export function storePlanName(value: string) {
  if (typeof window === "undefined") return;
  const name = value.trim().replace(/\s+/g, " ");
  if (!isValidPlanName(name)) return;
  try {
    window.localStorage.setItem(PLAN_NAME_STORAGE_KEY, name);
  } catch {
    // Nothing to do: this summary is still sent.
  }
}
