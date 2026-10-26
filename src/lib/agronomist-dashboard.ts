import { z } from "zod";

import { DISTRICTS, SOILS } from "./api";
import type { FarmerLanguage } from "./farmer-language";
import { isAgronomistEmail } from "./agronomist-accounts";
import {
  AGRONOMIST_SOURCES,
  INSURANCE_SOURCE_URL,
  MESSAGE_CATEGORIES,
  MESSAGE_CHANNELS,
  type InputCategory,
  type MessageCategory,
  type MessageChannel,
  type RiskAction,
  type RiskKind,
} from "./agronomist-reference";
import type { DistrictWeather } from "./weather";

// Shared, browser-safe contract for the agronomist dashboard: the records an
// agronomist can manage, their validation, the multilingual shell copy and the
// pure helpers the page uses. Server functions import the same schemas, so the
// browser and the server agree on what a valid record is.

export const DASHBOARD_TABS = [
  "overview",
  "inputs",
  "agronomists",
  "farmers",
  "recommendations",
  "soil",
  "weather",
  "pests",
  "insurance",
  "communication",
  "knowledge",
  "reports",
  "offline",
] as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export const RECORD_KINDS = [
  "product",
  "contact",
  "farmer",
  "recommendation",
  "pest",
  "message",
  "followUp",
  "insurance",
] as const;

export type RecordKind = (typeof RECORD_KINDS)[number];

// Every stored field is a JSON scalar. Keeping the envelope to serializable
// values lets the same record cross the server-function boundary and be cached
// in local storage without a cast that the type checker cannot verify.
export type RecordData = Record<string, string | number | boolean | null>;

const text = (max = 300) => z.string().trim().max(max);
const optionalText = (max = 300) => z.string().trim().max(max).default("");
const optionalNumber = (max = 10_000_000) =>
  z.number().finite().min(0).max(max).nullable().optional().default(null);
const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date as YYYY-MM-DD.")
  .nullable()
  .optional()
  .default(null);
const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Enter a valid email.",
  )
  .default("");
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^https?:\/\//i.test(value), "Use an http(s) link.")
  .default("");
const district = z
  .string()
  .trim()
  .refine((value) => DISTRICTS.includes(value), "Choose a district.");
const season = z.enum(["A", "B", "C"]);
const seasonOrNone = z.enum(["A", "B", "C"]).nullable();

// ---------------------------------------------------------------- products

export const productSchema = z
  .object({
    category: z.enum(["manure", "fertilizer"]),
    name: text(120).min(1, "Name the product."),
    uses: text(800).default(""),
    benefits: text(800).default(""),
    suitableCrops: text(400).default(""),
    applicationGuidance: text(1_200).default(""),
    availableQuantity: optionalNumber(),
    quantityUnit: z.enum(["kg", "bag", "tonne"]).nullable().optional().default(null),
    supplier: text(200).default(""),
    priceRwf: optionalNumber(),
    priceUnit: z.enum(["kg", "bag"]).nullable().optional().default(null),
    bagSizeKg: optionalNumber(10_000),
    location: text(300).default(""),
    source: text(500).default(""),
    sourceUrl: optionalUrl,
    verified: z.boolean().default(false),
    priceUpdatedAt: optionalDate,
  })
  .refine(
    (value) =>
      value.priceRwf == null ||
      (value.source.trim().length > 0 &&
        value.priceUpdatedAt != null &&
        value.supplier.trim().length > 0),
    {
      message: "A price needs the supplier, a source and the date it was checked.",
      path: ["source"],
    },
  );

export type ProductData = z.infer<typeof productSchema>;

// ---------------------------------------------------------------- contacts

export const contactSchema = z.object({
  fullName: text(160).min(1, "Enter the agronomist's name."),
  photoUrl: optionalUrl,
  qualifications: text(400).default(""),
  specialization: text(240).default(""),
  phone: text(60).default(""),
  email: optionalEmail,
  district,
  sector: text(120).default(""),
  workplace: text(240).default(""),
  availability: text(240).default(""),
  verified: z.boolean().default(false),
});

export type ContactData = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------- farmers

export const farmerSchema = z.object({
  fullName: text(160).min(1, "Enter the farmer's name."),
  phone: text(60).default(""),
  district,
  sector: text(120).default(""),
  soil: z
    .string()
    .trim()
    .refine((value) => SOILS.includes(value), "Choose a soil type."),
  landSizeHa: optionalNumber(10_000),
  crops: text(400).default(""),
  season: seasonOrNone.default(null),
  challenges: text(1_200).default(""),
  previousRecommendation: text(1_200).default(""),
});

export type FarmerData = z.infer<typeof farmerSchema>;

// ------------------------------------------------------ recommendations

export const recommendationSchema = z.object({
  farmerName: text(160).default(""),
  district,
  soil: z
    .string()
    .trim()
    .refine((value) => SOILS.includes(value), "Choose a soil type."),
  season: seasonOrNone.default(null),
  crop: text(120).min(1, "Enter the recommended crop."),
  confidence: z.number().int().min(0).max(100),
  expectedYieldTHa: optionalNumber(100),
  benefits: text(1_200).default(""),
  risks: text(1_200).default(""),
  status: z.enum(["pending", "approved", "modified", "rejected"]).default("pending"),
  decisionNote: text(1_200).default(""),
  source: z.enum(["model", "local-engine", "agronomist"]).default("local-engine"),
  sourceNote: text(400).default(""),
});

export type RecommendationData = z.infer<typeof recommendationSchema>;

// ---------------------------------------------------------------- pests

export const pestReportSchema = z.object({
  crop: text(120).min(1, "Enter the crop."),
  farmerName: text(160).default(""),
  district,
  symptoms: text(1_200).min(1, "Describe what was seen."),
  possibleCause: text(1_200).default(""),
  prevention: text(1_200).default(""),
  recommendation: text(1_200).default(""),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  referredTo: text(240).default(""),
  status: z.enum(["open", "treated", "referred", "closed"]).default("open"),
  reportedAt: optionalDate,
});

export type PestReportData = z.infer<typeof pestReportSchema>;

// ------------------------------------------------------------- messages

export const messageSchema = z.object({
  farmerName: text(160).min(1, "Choose or name the farmer."),
  recipient: text(200).default(""),
  channel: z.enum(["whatsapp", "sms", "email", "call", "in-person"]),
  language: z.enum(["en", "rw", "fr"]),
  category: z.enum(["recommendation", "reminder", "weather", "input", "follow-up"]),
  subject: text(240).min(1, "Add a subject."),
  body: text(4_000).min(1, "Write the message."),
  status: z.enum(["draft", "prepared", "sent"]).default("draft"),
  sentAt: optionalDate,
});

export type MessageData = z.infer<typeof messageSchema>;

// ----------------------------------------------------------- follow-ups

export const followUpSchema = z.object({
  farmerName: text(160).min(1, "Enter the farmer's name."),
  visitDate: optionalDate,
  cropProgress: text(1_200).default(""),
  feedback: text(1_200).default(""),
  notes: text(1_200).default(""),
  nextAction: text(1_200).default(""),
  status: z.enum(["planned", "done", "needs-visit"]).default("planned"),
});

export type FollowUpData = z.infer<typeof followUpSchema>;

// ------------------------------------------------------------- insurance

export const insuranceSchema = z.object({
  provider: text(200).min(1, "Enter the insurer or programme."),
  productName: text(200).min(1, "Enter the product name."),
  coverage: text(1_200).default(""),
  eligibility: text(1_200).default(""),
  premiumNote: text(1_200).default(""),
  exclusions: text(1_200).default(""),
  claimProcedure: text(1_200).default(""),
  providerContact: text(300).default(""),
  sourceUrl: optionalUrl,
  verified: z.boolean().default(false),
});

export type InsuranceData = z.infer<typeof insuranceSchema>;

export const RECORD_SCHEMAS: Record<RecordKind, z.ZodTypeAny> = {
  product: productSchema,
  contact: contactSchema,
  farmer: farmerSchema,
  recommendation: recommendationSchema,
  pest: pestReportSchema,
  message: messageSchema,
  followUp: followUpSchema,
  insurance: insuranceSchema,
};

export function isRecordKind(value: string): value is RecordKind {
  return (RECORD_KINDS as readonly string[]).includes(value);
}

export function parseRecordData(kind: RecordKind, data: unknown) {
  return RECORD_SCHEMAS[kind].safeParse(data);
}

// --------------------------------------------------------------- envelopes

export type AgronomistRecord = {
  id: string;
  kind: RecordKind;
  data: RecordData;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StorageState = "loading" | "ready" | "device" | "unconfigured" | "error";

export type RecordList = {
  storage: StorageState;
  records: AgronomistRecord[];
  message?: string;
};

// A record kept in the browser has no server to issue an id, so it gets a
// prefixed id that can never be mistaken for a database row. When a shared
// database is configured later, these records stay on the device instead of
// being sent as updates to a row the server does not hold.
export const DEVICE_RECORD_PREFIX = "device-";

export function isDeviceRecordId(id: string): boolean {
  return id.startsWith(DEVICE_RECORD_PREFIX);
}

export function newDeviceRecordId(): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${DEVICE_RECORD_PREFIX}${random}`;
}

export type RecordAuthor = { id: string | null; name: string | null };

/**
 * Build a record that lives in this browser. The same schema validates it as a
 * stored record, and an edit keeps the original author and creation time, so
 * the page still says who wrote the record and when.
 */
export function deviceRecord(
  kind: RecordKind,
  data: unknown,
  author: RecordAuthor,
  existing?: AgronomistRecord | null,
): AgronomistRecord | null {
  const parsed = parseRecordData(kind, data);
  if (!parsed.success) return null;
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? newDeviceRecordId(),
    kind,
    data: parsed.data as RecordData,
    createdBy: existing?.createdBy ?? author.id,
    createdByName: existing?.createdByName ?? author.name,
    updatedBy: author.id,
    updatedByName: author.name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export type SaveResult = {
  ok: boolean;
  record?: AgronomistRecord;
  error?: "auth" | "invalid" | "unconfigured" | "failed";
  message?: string;
  /** True when the browser kept the change for the next connection. */
  queued?: boolean;
};

export const RECORD_LABEL: Record<RecordKind, { one: string; many: string }> = {
  product: { one: "Input product", many: "Input products" },
  contact: { one: "Agronomist", many: "Agronomists" },
  farmer: { one: "Farmer", many: "Farmers" },
  recommendation: { one: "Recommendation", many: "Recommendations" },
  pest: { one: "Pest report", many: "Pest reports" },
  message: { one: "Message", many: "Messages" },
  followUp: { one: "Follow-up", many: "Follow-ups" },
  insurance: { one: "Insurance product", many: "Insurance products" },
};

// ------------------------------------------------------------------- copy

type DashboardCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  fieldNote: string;
  changeField: string;
  tabs: Record<DashboardTab, string>;
  auth: {
    title: string;
    signedOut: string;
    email: string;
    password: string;
    signIn: string;
    signingIn: string;
    signOut: string;
    signedInAs: string;
    notAgronomist: string;
    unavailable: string;
    roleHint: string;
    readOnly: string;
    demoTitle: string;
    demoBody: string;
    demoFill: string;
    demoUnavailable: string;
    deviceSession: string;
  };
  storage: Record<StorageState, string>;
  /** A short label for a status pill; the sentence above is for the callout. */
  storageShort: Record<StorageState, string>;
  common: {
    add: string;
    edit: string;
    delete: string;
    save: string;
    saving: string;
    cancel: string;
    search: string;
    all: string;
    none: string;
    notRecorded: string;
    source: string;
    updated: string;
    by: string;
    verified: string;
    unverified: string;
    download: string;
    refresh: string;
    clear: string;
    required: string;
    deleteConfirm: string;
    noRecords: string;
    readOnlyNotice: string;
  };
};

export const dashboardCopy: Record<FarmerLanguage, DashboardCopy> = {
  en: {
    eyebrow: "Agronomist Dashboard",
    title: "Rwanda agriculture — advisory workspace",
    lede: "One place for the field, the farmer, the input and the decision. Figures come from the published survey, the model report and the weather service; anything an agronomist records is stored with who changed it and when.",
    fieldNote: "The district, soil and season follow the field set on the Farmer page.",
    changeField: "Change the field",
    tabs: {
      overview: "Overview",
      inputs: "Manure & fertiliser",
      agronomists: "Agronomists",
      farmers: "Farmers",
      recommendations: "Crop advice",
      soil: "Soil & nutrients",
      weather: "Weather risk",
      pests: "Pests & disease",
      insurance: "Insurance",
      communication: "Messages",
      knowledge: "Knowledge",
      reports: "Reports",
      offline: "Offline & data",
    },
    auth: {
      title: "Agronomist access",
      signedOut: "Sign in to manage farmer records, prices and recommendations.",
      email: "Email",
      password: "Password",
      signIn: "Sign in",
      signingIn: "Signing in…",
      signOut: "Sign out",
      signedInAs: "Signed in as",
      notAgronomist:
        "This account is signed in but does not have the agronomist role. An administrator must grant it before records can be changed.",
      unavailable:
        "Cloud sign-in is not configured on this deployment. The shared reviewer account can still sign in on this device, and the published figures and reference catalogue stay available.",
      roleHint:
        "Only accounts with the agronomist role can add, edit or delete records. The server checks the role on every change.",
      readOnly: "Read-only",
      demoTitle: "Shared reviewer account",
      demoBody:
        "This account exists so the dashboard can be shown without an invitation. It is not for a farmer's private records, and anyone reading this page can use it.",
      demoFill: "Fill the form",
      demoUnavailable:
        "This deployment has email sign-in turned off, so the shared account cannot sign in here. An administrator enables Email under Authentication → Sign In / Providers.",
      deviceSession:
        "Signed in on this device with the shared reviewer account. The session lives in this browser, so records stay here and are not shared with other devices.",
    },
    storage: {
      loading: "Loading records…",
      ready:
        "Records are stored in the shared database, so every device signed in with this account sees the same list.",
      device:
        "Records are saved in this browser on this device. No shared database is in use here, so these records stay on this device and are not shared with other devices.",
      unconfigured:
        "The shared records table is not available on this deployment. Published figures and the reference catalogue still work; changes are stored on this device instead.",
      error:
        "The records database could not be reached. Published figures and the reference catalogue are still shown, and a copy of the records is kept on this device.",
    },
    storageShort: {
      loading: "Loading",
      ready: "Shared database",
      device: "Saved on this device",
      unconfigured: "Stored on this device",
      error: "Database unreachable",
    },
    common: {
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      search: "Search",
      all: "All",
      none: "None",
      notRecorded: "Not recorded",
      source: "Source",
      updated: "Updated",
      by: "by",
      verified: "Verified",
      unverified: "Unverified",
      download: "Download",
      refresh: "Refresh",
      clear: "Clear",
      required: "Required",
      deleteConfirm: "Delete this record? This cannot be undone.",
      noRecords: "No records yet.",
      readOnlyNotice: "Sign in with an agronomist account to add or change records.",
    },
  },
  fr: {
    eyebrow: "Tableau de bord de l’agronome",
    title: "Agriculture au Rwanda — espace de conseil",
    lede: "Un seul endroit pour le champ, l’agriculteur, l’intrant et la décision. Les chiffres viennent de l’enquête publiée, du rapport du modèle et du service météo ; ce qu’un agronome enregistre garde l’auteur et la date.",
    fieldNote: "Le district, le sol et la saison suivent le champ défini sur la page Agriculteur.",
    changeField: "Modifier le champ",
    tabs: {
      overview: "Vue d’ensemble",
      inputs: "Fumier et engrais",
      agronomists: "Agronomes",
      farmers: "Agriculteurs",
      recommendations: "Conseil de culture",
      soil: "Sol et nutriments",
      weather: "Risque météo",
      pests: "Ravageurs et maladies",
      insurance: "Assurance",
      communication: "Messages",
      knowledge: "Connaissances",
      reports: "Rapports",
      offline: "Hors ligne et données",
    },
    auth: {
      title: "Accès agronome",
      signedOut: "Connectez-vous pour gérer les dossiers, les prix et les recommandations.",
      email: "E-mail",
      password: "Mot de passe",
      signIn: "Se connecter",
      signingIn: "Connexion…",
      signOut: "Se déconnecter",
      signedInAs: "Connecté en tant que",
      notAgronomist:
        "Ce compte est connecté mais n’a pas le rôle d’agronome. Un administrateur doit l’accorder avant toute modification.",
      unavailable:
        "La connexion cloud n’est pas configurée sur ce déploiement. Le compte de démonstration partagé peut tout de même se connecter sur cet appareil, et les chiffres publiés et le catalogue de référence restent disponibles.",
      roleHint:
        "Seuls les comptes ayant le rôle d’agronome peuvent ajouter, modifier ou supprimer. Le serveur vérifie le rôle à chaque changement.",
      readOnly: "Lecture seule",
      demoTitle: "Compte de démonstration partagé",
      demoBody:
        "Ce compte existe pour montrer le tableau de bord sans invitation. Il ne sert pas à conserver les dossiers privés d’un agriculteur, et toute personne qui lit cette page peut l’utiliser.",
      demoFill: "Remplir le formulaire",
      demoUnavailable:
        "La connexion par e-mail est désactivée sur ce déploiement, le compte partagé ne peut donc pas se connecter ici. Un administrateur active Email dans Authentification → Connexion / Fournisseurs.",
      deviceSession:
        "Connecté sur cet appareil avec le compte de démonstration partagé. La session reste dans ce navigateur : les dossiers sont gardés ici et ne sont pas partagés avec d’autres appareils.",
    },
    storage: {
      loading: "Chargement des dossiers…",
      ready:
        "Les dossiers sont enregistrés dans la base partagée : chaque appareil connecté voit la même liste.",
      device:
        "Les dossiers sont enregistrés dans ce navigateur, sur cet appareil. Aucune base partagée n’est utilisée ici : les dossiers restent sur cet appareil.",
      unconfigured:
        "La table partagée des dossiers n’est pas disponible sur ce déploiement. Les chiffres publiés et le catalogue de référence restent disponibles ; les modifications sont enregistrées sur cet appareil.",
      error:
        "La base de dossiers est inaccessible. Les chiffres publiés et le catalogue de référence restent affichés, et une copie des dossiers est gardée sur cet appareil.",
    },
    storageShort: {
      loading: "Chargement",
      ready: "Base partagée",
      device: "Enregistré sur cet appareil",
      unconfigured: "Sur cet appareil",
      error: "Base inaccessible",
    },
    common: {
      add: "Ajouter",
      edit: "Modifier",
      delete: "Supprimer",
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancel: "Annuler",
      search: "Rechercher",
      all: "Tous",
      none: "Aucun",
      notRecorded: "Non renseigné",
      source: "Source",
      updated: "Mis à jour",
      by: "par",
      verified: "Vérifié",
      unverified: "Non vérifié",
      download: "Télécharger",
      refresh: "Actualiser",
      clear: "Effacer",
      required: "Obligatoire",
      deleteConfirm: "Supprimer ce dossier ? Cette action est irréversible.",
      noRecords: "Aucun dossier pour l’instant.",
      readOnlyNotice: "Connectez-vous avec un compte agronome pour modifier les dossiers.",
    },
  },
  rw: {
    eyebrow: "Imbonerahamwe y’impuguke",
    title: "Ubuhinzi mu Rwanda — aho inama zikorera",
    lede: "Ahantu hamwe ku murima, umuhinzi, ifumbire n’icyemezo. Imibare iva mu ibarurisho ryasohotse, raporo y’icyitegererezo n’ubugenzuzi bw’ikirere; ibyo impuguke yandika bigumana uwabihinduye n’itariki.",
    fieldNote: "Akarere, ubutaka n’igihembwe bikurikiza umurima wagenwe ku rupapuro rw’Umuhinzi.",
    changeField: "Hindura umurima",
    tabs: {
      overview: "Incamake",
      inputs: "Ifumbire",
      agronomists: "Impuguke",
      farmers: "Abahinzi",
      recommendations: "Inama ku bihingwa",
      soil: "Ubutaka n’intungamubiri",
      weather: "Ibyago by’ikirere",
      pests: "Udukoko n’indwara",
      insurance: "Ubwishingizi",
      communication: "Ubutumwa",
      knowledge: "Ubumenyi",
      reports: "Raporo",
      offline: "Nta murandasi n’amakuru",
    },
    auth: {
      title: "Uruhushya rw’impuguke",
      signedOut: "Injira kugira ngo ucunge amadosiye, ibiciro n’inama.",
      email: "Imeyili",
      password: "Ijambo ry’ibanga",
      signIn: "Injira",
      signingIn: "Turacyinjira…",
      signOut: "Sohoka",
      signedInAs: "Winjiye nka",
      notAgronomist:
        "Iyi konti yinjiye ariko nta ruhushya rw’impuguke ifite. Umuyobozi agomba kuyiha uruhushya mbere yo guhindura amadosiye.",
      unavailable:
        "Kwinjira mu bicumbi ntibyateganyijwe kuri iyi serivisi. Konti y’urugero isangiwe ishobora kwinjira kuri iyi mudasobwa, kandi ibipimo byasohotse n’urutonde rw’ubushakashatsi biraboneka.",
      roleHint:
        "Konti zifite uruhushya rw’impuguke gusa zishobora kongera, guhindura cyangwa gusiba. Seriveri igenzura uruhushya buri gihe.",
      readOnly: "Gusoma gusa",
      demoTitle: "Konti y’urugero isangiwe",
      demoBody:
        "Iyi konti iriho kugira ngo ikibaho kigaragazwe nta butumire. Ntabwo ari iyo kubika amadosiye bwite y’umuhinzi, kandi umuntu wese usoma iyi paji ashobora kuyikoresha.",
      demoFill: "Uzuza ifishi",
      demoUnavailable:
        "Kwinjira n’imeyili ntibyashyizweho kuri iyi serivisi, bityo iyi konti ntishobora kwinjira hano. Umuyobozi abishyira mu bikorwa muri Authentication → Sign In / Providers.",
      deviceSession:
        "Winjiye kuri iyi mudasobwa ukoresheje konti y’urugero isangiwe. Iyi serivisi iguma muri iyi mushakisha, bityo amadosiye aguma hano kandi ntasangizwa n’izindi mudasobwa.",
    },
    storage: {
      loading: "Turashakisha amadosiye…",
      ready:
        "Amadosiye abitswe mu bubiko busangiwe, bityo buri mudasobwa winjiye ibona urutonde rumwe.",
      device:
        "Amadosiye abikwa muri iyi mushakisha kuri iyi mudasobwa. Nta bubiko busangiwe bukoreshwa hano, bityo amadosiye aguma kuri iyi mudasobwa.",
      unconfigured:
        "Imbonerahamwe isangiwe y’amadosiye ntaboneka kuri iyi serivisi. Ibipimo byasohotse n’urutonde rw’ubushakashatsi biraboneka; guhindura bibikwa kuri iyi mudasobwa.",
      error:
        "Ububiko bw’amadosiye ntibwabonetse. Ibipimo byasohotse n’urutonde rw’ubushakashatsi biracyagaragarira, kandi kopi y’amadosiye igumishwa kuri iyi mudasobwa.",
    },
    storageShort: {
      loading: "Biracyashakishwa",
      ready: "Ububiko busangiwe",
      device: "Byabitswe kuri iyi mudasobwa",
      unconfigured: "Kuri iyi mudasobwa",
      error: "Ububiko ntibwabonetse",
    },
    common: {
      add: "Ongeraho",
      edit: "Hindura",
      delete: "Siba",
      save: "Bika",
      saving: "Turabika…",
      cancel: "Hagarika",
      search: "Shakisha",
      all: "Byose",
      none: "Nta na kimwe",
      notRecorded: "Ntibyanditswe",
      source: "Inkomoko",
      updated: "Byavuguruwe",
      by: "na",
      verified: "Byemejwe",
      unverified: "Ntibyemejwe",
      download: "Kura",
      refresh: "Ongera ushakishe",
      clear: "Siba",
      required: "Bisabwa",
      deleteConfirm: "Gusiba iyi dosiye? Ntibishobora gusubizwa.",
      noRecords: "Nta dosiye ihari.",
      readOnlyNotice: "Injira nka impuguke kugira ngo uhindure amadosiye.",
    },
  },
};

// ------------------------------------------------------------ auth helpers

export type AuthClaims = {
  sub?: string;
  email?: string;
  app_metadata?: { role?: string };
  user_metadata?: { full_name?: string };
};

// app_metadata is trusted because the account holder cannot edit it;
// user_metadata is never trusted. The shared reviewer address in
// agronomist-accounts.ts is the one exception, and the database lists the same
// address, so the app and the policies agree on who may write.
export function isAgronomistClaims(claims: AuthClaims | null | undefined): boolean {
  if (claims?.app_metadata?.role === "agronomist") return true;
  return isAgronomistEmail(claims?.email);
}

// ------------------------------------------------------------- formatting

export function formatRwf(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return dashboardCopy.en.common.notRecorded;
  return `RWF ${new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatQuantity(
  value: number | null | undefined,
  unit: string | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) return dashboardCopy.en.common.notRecorded;
  return `${new Intl.NumberFormat("en-RW", { maximumFractionDigits: 2 }).format(value)}${
    unit ? ` ${unit}` : ""
  }`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return dashboardCopy.en.common.notRecorded;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return dashboardCopy.en.common.notRecorded;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function recordTitle(kind: RecordKind, data: RecordData): string {
  switch (kind) {
    case "product":
      return String(data["name"] ?? "Input product");
    case "contact":
      return String(data["fullName"] ?? "Agronomist");
    case "farmer":
      return String(data["fullName"] ?? "Farmer");
    case "recommendation":
      return String(data["crop"] ?? "Recommendation");
    case "pest":
      return String(data["crop"] ?? "Pest report");
    case "message":
      return String(data["subject"] ?? "Message");
    case "followUp":
      return String(data["farmerName"] ?? "Follow-up");
    case "insurance":
      return String(data["productName"] ?? "Insurance product");
  }
}

// --------------------------------------------------------------- filters

export function filterRecords<T extends { data: RecordData }>(records: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return records;
  return records.filter((record) =>
    Object.values(record.data).some(
      (value) => typeof value === "string" && value.toLowerCase().includes(needle),
    ),
  );
}

export function contactSpecializations(records: AgronomistRecord[]): string[] {
  const values = records
    .filter((record) => record.kind === "contact")
    .map((record) => String(record.data["specialization"] ?? "").trim())
    .filter(Boolean);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function filterContacts(
  records: AgronomistRecord[],
  query: string,
  district: string,
  specialization: string,
): AgronomistRecord[] {
  const needle = query.trim().toLowerCase();
  return records.filter((record) => {
    if (record.kind !== "contact") return false;
    const data = record.data;
    if (district && data["district"] !== district) return false;
    if (specialization && data["specialization"] !== specialization) return false;
    if (!needle) return true;
    return ["fullName", "specialization", "district", "sector", "workplace"].some((key) =>
      String(data[key] ?? "")
        .toLowerCase()
        .includes(needle),
    );
  });
}

// ------------------------------------------------------- record visibility

// Reference records carry no farmer's private information, so the database lets
// a visitor read them before signing in. Farmer-linked records are only shown
// to a signed-in agronomist, even when an earlier visit left a copy of them on
// this device.
export const PUBLIC_RECORD_KINDS = ["product", "contact", "insurance"] as const;

export function visibleRecords(
  records: AgronomistRecord[],
  isAgronomist: boolean,
): AgronomistRecord[] {
  if (isAgronomist) return records;
  return records.filter((record) =>
    (PUBLIC_RECORD_KINDS as readonly string[]).includes(record.kind),
  );
}

// ------------------------------------------------ a farmer's linked history

// The dashboard has no separate field id, so a recommendation, pest report,
// message or follow-up is linked to a farmer by the name typed on both records.
// The match ignores case and extra spaces; the page says so, so nobody assumes
// two different people with the same name were merged.
export const FARMER_LINKED_KINDS = ["recommendation", "pest", "message", "followUp"] as const;

function normalizedName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function relatedRecordsForFarmer(
  records: AgronomistRecord[],
  farmerName: string,
): AgronomistRecord[] {
  const name = normalizedName(farmerName);
  if (!name) return [];
  return records.filter(
    (record) =>
      (FARMER_LINKED_KINDS as readonly string[]).includes(record.kind) &&
      normalizedName(record.data["farmerName"]) === name,
  );
}

// --------------------------------------------------------------- overview

export type OverviewCounts = {
  farmers: number;
  agronomists: number;
  recommendations: number;
  pendingRecommendations: number;
  openPestReports: number;
  highSeverityPests: number;
  messages: number;
  followUps: number;
  products: number;
  insuranceProducts: number;
  pendingRequests: number;
};

// A zero is only a fact when the store was actually read. If the table is
// missing or unreachable, showing "0 records" claims that nothing is stored;
// the dashboard shows that the figure is not known instead. A device store is a
// real read, so its empty list is a real zero.
export function recordsWereCounted(storage: StorageState, loaded: number): boolean {
  return storage === "ready" || storage === "device" || loaded > 0;
}

export function overviewCounts(records: AgronomistRecord[]): OverviewCounts {
  const ofKind = (kind: RecordKind) => records.filter((record) => record.kind === kind);
  const recommendations = ofKind("recommendation");
  const pests = ofKind("pest");
  const pendingRecommendations = recommendations.filter(
    (record) => record.data["status"] === "pending",
  ).length;
  const openPestReports = pests.filter((record) => record.data["status"] === "open").length;
  const highSeverityPests = pests.filter(
    (record) => record.data["status"] === "open" && record.data["severity"] === "high",
  ).length;
  return {
    farmers: ofKind("farmer").length,
    agronomists: ofKind("contact").length,
    recommendations: recommendations.length,
    pendingRecommendations,
    openPestReports,
    highSeverityPests,
    messages: ofKind("message").length,
    followUps: ofKind("followUp").length,
    products: ofKind("product").length,
    insuranceProducts: ofKind("insurance").length,
    pendingRequests: pendingRecommendations + openPestReports,
  };
}

// ------------------------------------------------------------ weather risk

export type ClimateRisk = {
  kind: RiskKind;
  title: string;
  detail: string;
  source: string;
  options: RiskAction[];
};

// Forecast signals are thresholds on the published forecast, not a risk score.
// The day and amount are named, so the agronomist can check them against the
// source before acting.
export function forecastRisks(
  weather: DistrictWeather | null,
  erodedShare: number | null,
): ClimateRisk[] {
  if (!weather?.forecast || weather.forecast.days.length === 0) return [];
  const days = weather.forecast.days;
  const source = `${weather.forecast.source} forecast issued ${formatDateTime(weather.forecast.issuedAt)}`;
  const risks: ClimateRisk[] = [];

  const heavy = days.filter((day) => day.rainMm >= 30);
  if (heavy.length > 0) {
    risks.push({
      kind: "heavy-rain",
      title: "Heavy rain signal in the forecast",
      detail: `The forecast shows 30 mm or more on ${heavy
        .map((day) => day.date)
        .join(
          ", ",
        )}. Check drainage and protect young plants. This is a forecast threshold, not a measured total.`,
      source,
      options: [],
    });
  }

  const firstFive = days.slice(0, 5);
  const fiveDayRain = firstFive.reduce((total, day) => total + day.rainMm, 0);
  if (firstFive.length === 5 && fiveDayRain <= 2) {
    risks.push({
      kind: "dry-week",
      title: "Dry week signal in the forecast",
      detail: `The next five days total ${Math.round(fiveDayRain)} mm in the forecast. Check soil moisture before planting or watering; this is not a drought declaration.`,
      source,
      options: [],
    });
  }

  const hottest = days.reduce((max, day) => Math.max(max, day.tempMaxC), -Infinity);
  if (Number.isFinite(hottest) && hottest >= 32) {
    const hotDays = days.filter((day) => day.tempMaxC >= 32);
    risks.push({
      kind: "heat",
      title: "Hot days in the forecast",
      detail: `Maximum temperature reaches ${Math.round(hottest)} °C on ${hotDays
        .map((day) => day.date)
        .join(", ")}. Water early or late and watch young plants.`,
      source,
      options: [],
    });
  }

  if (heavy.length > 0 && erodedShare != null && erodedShare >= 0.1) {
    risks.push({
      kind: "erosion",
      title: "Erosion risk on this district's fields",
      detail: `${Math.round(erodedShare * 100)}% of surveyed segments in this district were recorded as eroded. Combine that with the heavy-rain signal and check bunds, trenches and soil cover.`,
      source: `${source}; NISR district input profile`,
      options: [],
    });
  }
  return risks;
}

// ------------------------------------------------------------- report CSV

export function buildActivityCsv(records: AgronomistRecord[]): string {
  const header = ["Module", "Record", "Status", "District", "Updated", "Updated by", "Details"];
  const lines = records.map((record) => {
    const data = record.data;
    const details = Object.entries(data)
      .filter(([, value]) => value !== "" && value != null && typeof value !== "object")
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join("; ");
    return [
      RECORD_LABEL[record.kind].one,
      recordTitle(record.kind, data),
      String(data["status"] ?? ""),
      String(data["district"] ?? ""),
      record.updatedAt,
      record.updatedByName ?? record.updatedBy ?? "",
      details,
    ];
  });
  return [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

// ---------------------------------------------------------- message links

export function whatsappLink(phone: string, body: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  // WhatsApp needs a country code. A Rwandan local number written as 078… or
  // 78… is sent as 25078…; an already international number is left as it is.
  const normalized =
    digits.startsWith("0") && digits.length === 10
      ? `250${digits.slice(1)}`
      : digits.length === 9
        ? `250${digits}`
        : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(body)}`;
}

export function mailtoLink(email: string, subject: string, body: string): string | null {
  if (!email) return null;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function smsLink(phone: string, body: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length < 8) return null;
  return `sms:${digits}?body=${encodeURIComponent(body)}`;
}

export function telLink(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.length >= 8 ? `tel:${digits}` : null;
}

// ------------------------------------------------------------- constants

export const MESSAGE_CATEGORY_LABELS: Record<MessageCategory, string> = {
  recommendation: "Crop recommendation",
  reminder: "Planting reminder",
  weather: "Weather alert",
  input: "Manure and fertiliser",
  "follow-up": "Follow-up",
};

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  call: "Phone call",
  "in-person": "In person",
};

export const INPUT_CATEGORY_LABELS: Record<InputCategory, string> = {
  manure: "Manure",
  fertilizer: "Fertiliser",
};

export const INSURANCE_OFFICIAL_URL = INSURANCE_SOURCE_URL;
export const SOURCE_LINKS = AGRONOMIST_SOURCES;

// The migration the records tables need. It ships with the repository, so the
// page can point a deployment owner at it without the app holding an admin key.
export const DASHBOARD_MIGRATION_URL =
  "https://github.com/manziemile80/imbutosmart-ai/blob/main/supabase/migrations/20261026000000_agronomist_dashboard.sql";

export {
  MESSAGE_CATEGORIES,
  MESSAGE_CHANNELS,
  type MessageCategory,
  type MessageChannel,
  type RiskAction,
  type RiskKind,
};

export const SEASON_LABEL: Record<"A" | "B" | "C", string> = {
  A: "Season A",
  B: "Season B",
  C: "Season C",
};

export const SEASON_CHOICES = (["A", "B", "C"] as const).map((value) => ({
  value,
  label: SEASON_LABEL[value],
}));

export const DISTRICT_CHOICES = DISTRICTS.map((value) => ({ value, label: value }));
export const SOIL_CHOICES = SOILS.map((value) => ({ value, label: value }));

// Kept explicit so a future schema change cannot silently accept an unknown
// season in a record.
export const seasonSchema = season;
