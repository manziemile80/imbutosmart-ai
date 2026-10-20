import { z } from "zod";
import { DISTRICTS, SOILS } from "./api";

// Browser-safe definition of the voice assistant: speech-to-text / text-to-speech
// request validation, the "what information you'll need" guide, and the
// farmer-facing copy. Kept free of server-only imports so the UI and the server
// functions share one contract, exactly like the text assistants.

export const VOICE_LANGUAGES = ["en", "rw", "fr"] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

// Roughly 30 seconds of speech is plenty for a question and keeps the payload
// inside serverless request limits (base64 inflates audio by about a third).
export const MAX_RECORDING_MS = 30_000;
export const MAX_AUDIO_BASE64_CHARS = 2_500_000;
// Spoken answers are kept short; this bounds the text sent to the speech model.
export const MAX_SPEECH_TEXT = 1_200;

export const AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
] as const;

export function isSupportedAudioType(value: string): boolean {
  return AUDIO_MIME_TYPES.some((type) => value.startsWith(type));
}

export const speechInputSchema = z.object({
  language: z.enum(VOICE_LANGUAGES).default("en"),
  mimeType: z.string().refine(isSupportedAudioType, "Unsupported audio format."),
  audioBase64: z.string().trim().min(1).max(MAX_AUDIO_BASE64_CHARS),
});

export const synthesisInputSchema = z.object({
  language: z.enum(VOICE_LANGUAGES).default("en"),
  text: z.string().trim().min(1).max(MAX_SPEECH_TEXT),
});

export type SpeechInput = z.infer<typeof speechInputSchema>;
export type SynthesisInput = z.infer<typeof synthesisInputSchema>;

// Client-side status codes the UI maps to copy. Only the problems a farmer can
// act on are notices: a blocked microphone, no speech heard, a voice service
// that is not set up, or a language it cannot read aloud. A request that simply
// fails is not shown: the answer stays written and the page stays calm.
export type VoiceNotice = "unconfigured" | "empty" | "unsupported" | "denied" | "no-speech" | "not-spoken";

export type VoiceGuideItem = { title: string; detail: string };

const guide: Record<VoiceLanguage, VoiceGuideItem[]> = {
  en: [
    { title: "Your district and location", detail: "The district and sector or village of your field, so advice matches local conditions." },
    { title: "Soil type", detail: "Whether your soil is volcanic, clay, loam, sandy, laterite or humic, or how it looks and feels." },
    { title: "Season and month", detail: "The farming season (A, B or C) and the month you plan to plant." },
    { title: "Rainfall and temperature forecast", detail: "Recent rain and the coming weeks' forecast from Meteo Rwanda or a trusted local source." },
    { title: "Crop and field size", detail: "The crop you want to grow and how big the field is, for example in ares or hectares." },
    { title: "Recent field observations", detail: "Any pests, diseases, waterlogging, erosion or unusual plant symptoms you have seen." },
    { title: "Previous crop", detail: "What you grew last season, to consider rotation and soil health." },
    { title: "Water and inputs", detail: "Whether you can irrigate and which seed, fertiliser or tools you already have." },
  ],
  rw: [
    { title: "Akarere n'aho uherereye", detail: "Akarere n'umurenge cyangwa umudugudu umurima wawe uherereyemo, kugira ngo inama ihure n'ibihe byaho." },
    { title: "Ubwoko bw'ubutaka", detail: "Niba ubutaka ari ubw'ibirunga, ubw'ibumba, buvanze, ubw'umucanga, butukura cyangwa bukungahaye ku bisigazwa by'ibimera, cyangwa uko busa." },
    { title: "Igihembwe n'ukwezi", detail: "Igihembwe cy'ihinga (A, B cyangwa C) n'ukwezi uteganya guhinga." },
    { title: "Imvura n'ubushyuhe biteganyijwe", detail: "Imvura ya vuba n'iteganyagihe ry'ibyumweru biri imbere biva kuri Meteo Rwanda cyangwa ahandi hizewe." },
    { title: "Igihingwa n'ubunini bw'umurima", detail: "Igihingwa ushaka guhinga n'ubunini bw'umurima, urugero muri are cyangwa hegitari." },
    { title: "Ibyo ubona mu murima", detail: "Udukoko, indwara, imvura irenze urugero, isuri cyangwa ibimenyetso bidasanzwe ku bimera." },
    { title: "Igihingwa cyabanje", detail: "Icyo wahinze mu gihembwe gishize, kugira ngo uzirikane guhinduranya ibihingwa n'ubuzima bw'ubutaka." },
    { title: "Amazi n'ibikoresho", detail: "Niba ushobora kuhira n'imbuto, ifumbire cyangwa ibikoresho ufite." },
  ],
  fr: [
    { title: "Votre district et votre localisation", detail: "Le district et le secteur ou le village de votre champ, pour adapter les conseils aux conditions locales." },
    { title: "Type de sol", detail: "Si votre sol est volcanique, argileux, limoneux, sableux, latéritique ou humifère, ou son aspect et sa texture." },
    { title: "Saison et mois", detail: "La saison agricole (A, B ou C) et le mois où vous prévoyez de planter." },
    { title: "Prévisions de pluie et de température", detail: "Les pluies récentes et les prévisions des prochaines semaines de Meteo Rwanda ou d'une source locale fiable." },
    { title: "Culture et taille du champ", detail: "La culture que vous voulez planter et la superficie du champ, par exemple en ares ou en hectares." },
    { title: "Observations récentes du champ", detail: "Ravageurs, maladies, engorgement, érosion ou symptômes inhabituels sur les plantes." },
    { title: "Culture précédente", detail: "Ce que vous avez cultivé la saison dernière, pour la rotation et la santé du sol." },
    { title: "Eau et intrants", detail: "Si vous pouvez irriguer et quelles semences, engrais ou outils vous possédez déjà." },
  ],
};

export function voiceGuide(language: VoiceLanguage): VoiceGuideItem[] {
  return guide[language];
}

export const voiceCopy: Record<
  VoiceLanguage,
  {
    eyebrow: string;
    heading: string;
    intro: string;
    guideTitle: string;
    guideIntro: string;
    guideSpokenIntro: string;
    listen: string;
    stop: string;
    speaking: string;
    askTitle: string;
    askIntro: string;
    record: string;
    stopRecording: string;
    recording: string;
    transcribing: string;
    thinking: string;
    transcript: string;
    answer: string;
    clear: string;
    disclaimer: string;
    configNote: string;
    spokenUnavailable: string;
    notices: Record<VoiceNotice, string>;
  }
> = {
  en: {
    eyebrow: "Voice assistant",
    heading: "Talk to your farm assistant",
    intro: "Listen to the information that helps most, then ask a question out loud. Answers are spoken back and written below.",
    guideTitle: "What information you'll need",
    guideIntro: "Have these details ready for the best advice. Nothing is sent until you choose to ask.",
    guideSpokenIntro: "To give you better advice, have this information ready.",
    listen: "Listen to what you'll need",
    stop: "Stop",
    speaking: "Speaking…",
    askTitle: "Ask by voice",
    askIntro: "Tap the microphone, speak your question, then tap again to stop. Your words are transcribed and answered by the AI assistant.",
    record: "Start recording",
    stopRecording: "Stop and ask",
    recording: "Recording… speak now",
    transcribing: "Transcribing…",
    thinking: "Thinking…",
    transcript: "You said",
    answer: "AI answer",
    clear: "Clear",
    disclaimer: "Spoken guidance is general only — not live weather, a diagnosis, or a guarantee. Confirm with a local agronomist and Meteo Rwanda before acting.",
    configNote: "Voice isn't switched on yet — the server still needs an API key. You can read the guide and use the text assistants below in the meantime.",
    spokenUnavailable: "The voice service cannot read this language aloud, so answers are written here instead. The text assistants below work in every language.",
    notices: {
      unconfigured: "Voice assistance isn't configured on the server yet (no API key). The guide above and the text assistants remain available.",
      empty: "No answer was returned. Please try rephrasing your question.",
      unsupported: "This browser cannot record audio. Please type your question instead.",
      denied: "Microphone access was blocked. Allow the microphone or type your question instead.",
      "no-speech": "We did not hear anything. Please try again and speak a little closer to the microphone.",
      "not-spoken": "The voice service cannot read this language aloud. The answer is written above.",
    },
  },
  rw: {
    eyebrow: "Umufasha w'ijwi",
    heading: "Vugana n'umufasha w'umurima wawe",
    intro: "Umva amakuru afasha cyane, hanyuma ubaze ikibazo uvuga. Ibisubizo bibwirizwa mu ijwi kandi byandikwa hasi.",
    guideTitle: "Amakuru uzakenera",
    guideIntro: "Gira aya makuru witeguye kugira ngo ubone inama nziza. Nta kintu koherezwa keretse wifuza kubaza.",
    guideSpokenIntro: "Kugira ngo ugire inama nziza, gira aya makuru witeguye.",
    listen: "Umva amakuru uzakenera",
    stop: "Hagarika",
    speaking: "Turimo kuvuga…",
    askTitle: "Baza uvuze",
    askIntro: "Kanda kuri mikoro, vuga ikibazo cyawe, hanyuma ukande ukundi uhagarike. Amagambo yawe yandikwa hanyuma umufasha wa AI akayashubiza.",
    record: "Tangira gufata ijwi",
    stopRecording: "Hagarika ubaze",
    recording: "Turafata ijwi… vuga ubu",
    transcribing: "Turandika amagambo…",
    thinking: "Turatekereza…",
    transcript: "Wavuze",
    answer: "Igisubizo cya AI",
    clear: "Gusiba",
    disclaimer: "Inama mu ijwi ni rusange gusa — si amakuru y'ikirere ariho, isuzuma, cyangwa isezerano. Emeza n'impuguke mu buhinzi na Meteo Rwanda mbere yo kubikora.",
    configNote: "Umufasha w'ijwi nta kurahura — seriveri incyo ifite API key. Mu gihe cy'ubu, usome amakuru hanyuma uboneshe abafasha bandika hasi.",
    spokenUnavailable: "Ubutumwa bw'ijwi ntibishobora gusoma ururimi rw'ubu mu ijwi, ibisobanuro byandikwa hano ariko. Abafasha bandika hasi bashobora gukora muri bururimi.",
    notices: {
      unconfigured: "Umufasha w'ijwi ntarashyirwaho kuri seriveri (nta API key). Amakuru ari hejuru n'abafasha bandika baracyaboneka.",
      empty: "Nta gisubizo cyatanzwe. Ongera ugerageze uhindure ikibazo.",
      unsupported: "Iyi porogaramu ntishobora gufata ijwi. Nyamara wandike ikibazo cyawe.",
      denied: "Kwinjira muri mikoro byanzwe. Emerera mikoro cyangwa wandike ikibazo cyawe.",
      "no-speech": "Nta jwi twumvise. Ongera ugerageze uvuge hafi ya mikoro.",
      "not-spoken": "Ubutumwa bw'ijwi ntibishobora gusoma ururimi rw'ubu mu ijwi. Igisubizo cyandikwe hejuru.",
    },
  },
  fr: {
    eyebrow: "Assistant vocal",
    heading: "Parlez à l'assistant de votre exploitation",
    intro: "Écoutez les informations les plus utiles, puis posez votre question à voix haute. Les réponses sont lues et écrites ci-dessous.",
    guideTitle: "Les informations dont vous aurez besoin",
    guideIntro: "Ayez ces détails prêts pour de meilleurs conseils. Rien n'est envoyé tant que vous ne décidez pas de demander.",
    guideSpokenIntro: "Pour de meilleurs conseils, ayez ces informations prêtes.",
    listen: "Écouter ce dont vous aurez besoin",
    stop: "Arrêter",
    speaking: "Lecture…",
    askTitle: "Demander à voix haute",
    askIntro: "Touchez le microphone, posez votre question, puis touchez à nouveau pour arrêter. Vos paroles sont transcrites et l'assistant IA répond.",
    record: "Démarrer l'enregistrement",
    stopRecording: "Arrêter et demander",
    recording: "Enregistrement… parlez maintenant",
    transcribing: "Transcription…",
    thinking: "Réflexion…",
    transcript: "Vous avez dit",
    answer: "Réponse de l'IA",
    clear: "Effacer",
    disclaimer: "Les conseils vocaux sont généraux uniquement — pas de météo en direct, de diagnostic ni de garantie. Confirmez avec un agronome local et Meteo Rwanda avant d'agir.",
    configNote: "La voix n'est pas encore activée — le serveur a besoin d'une clé API. En attendant, consultez le guide et utilisez les assistants écrits ci-dessous.",
    spokenUnavailable: "Le service vocal ne peut pas lire cette langue à voix haute : les réponses restent écrites ici. Les assistants écrits ci-dessous fonctionnent dans toutes les langues.",
    notices: {
      unconfigured: "L'assistance vocale n'est pas encore configurée sur le serveur (aucune clé API). Le guide ci-dessus et les assistants écrits restent disponibles.",
      empty: "Aucune réponse n'a été renvoyée. Reformulez votre question.",
      unsupported: "Ce navigateur ne peut pas enregistrer l'audio. Écrivez plutôt votre question.",
      denied: "L'accès au microphone a été bloqué. Autorisez le microphone ou écrivez votre question.",
      "no-speech": "Nous n'avons rien entendu. Réessayez en parlant plus près du microphone.",
      "not-spoken": "Le service vocal ne peut pas lire cette langue à voix haute. La réponse est écrite ci-dessus.",
    },
  },
};

export function guideSpokenText(language: VoiceLanguage): string {
  const { guideSpokenIntro } = voiceCopy[language];
  return [guideSpokenIntro, ...voiceGuide(language).map((item) => `${item.title}. ${item.detail}`)].join(" ");
}

// Whisper-style speech endpoints take an ISO-639-1 hint; the app's languages are
// already ISO-639-1 codes, so the mapping is the identity.
export function speechLanguageCode(language: VoiceLanguage): VoiceLanguage {
  return language;
}

// Whether the speech backend can read this language aloud. A null list means the
// server has not answered yet, so nothing is ruled out.
export function canSpeakLanguage(spokenLanguages: VoiceLanguage[] | null, language: VoiceLanguage): boolean {
  return spokenLanguages === null || spokenLanguages.includes(language);
}

export function buildVoiceSystemPrompt(language: VoiceLanguage, district: string, soil: string): string {
  const languageName =
    language === "rw"
      ? "Kinyarwanda (write the entire answer in Kinyarwanda)"
      : language === "fr"
        ? "French (write the entire answer in French)"
        : "English";
  return [
    `You are the voice farming assistant of ImbutoSmart AI, helping smallholder farmers in Rwanda.`,
    `Answer in simple ${languageName}. Keep answers under 120 words, practical, and easy to listen to. No markdown, no bullet symbols, no headings, no tables.`,
    `The farmer is in ${district} district with ${soil} soil.`,
    `Your main job is to explain what information the farmer needs to give us or prepare to get reliable advice: their district and location, soil type, the season and month, the rainfall and temperature forecast from Meteo Rwanda or a trusted local source, the crop and field size, recent field observations such as pests, disease or waterlogging, the previous crop, water access, and the inputs they already have.`,
    `Rules you must follow:`,
    `- Give general agronomic guidance only; you have no live weather, no district measurements, and no soil test results.`,
    `- Never invent rainfall amounts, temperatures, probabilities, prices, yields, or guarantees, and never claim a treatment is certain to work.`,
    `- If the question needs live weather, a soil test, or a diagnosis, say what the farmer should check and point to Meteo Rwanda or a local agronomist.`,
    `- Prefer low-cost, safe, environmentally sound practices; never recommend banned or hazardous pesticides.`,
    `- If the question is unrelated to farming in Rwanda, politely say you can only help with farming questions.`,
    `- Because the answer is spoken aloud, use short sentences and plain words.`,
  ].join("\n");
}
