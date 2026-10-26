import type { FarmerLanguage } from "./farmer-language";

// The bell is the app's announcement feed, not a second copy of a page. Each
// notice is short, links to the page that holds the detail, and states no
// figure of its own: the pages quote the survey and the climate record.

export type AnnouncementRoute = "/" | "/advice" | "/summary";

export type Announcement = {
  id: "summary" | "manure" | "season";
  title: string;
  body: string;
  link: { to: AnnouncementRoute; label: string };
};

export const announcementCopy: Record<
  FarmerLanguage,
  {
    label: string;
    intro: string;
    summary: { title: string; body: string; link: string };
    manure: { title: string; body: string; link: string };
    season: { title: string; body: string; link: string };
  }
> = {
  en: {
    label: "Announcements",
    intro: "Short notices for your field. The details stay on the pages they belong to.",
    summary: {
      title: "Your summary is ready",
      body: "The crops, inputs, insurance and next steps for {district} are on Summary get, ready to read and download.",
      link: "Open Summary get",
    },
    manure: {
      title: "Manure cost",
      body: "Prices differ from shop to shop and change through the season. Ask your local agrodealer for today's price before you buy; this app holds no prices.",
      link: "See the inputs farmers here use",
    },
    season: {
      title: "Check the season before you plant",
      body: "Advice shows the season's usual rain and the days ahead, so you can choose when to plant.",
      link: "Open Advice",
    },
  },
  rw: {
    label: "Amatangazo",
    intro: "Amatangazo magufi ku murima wawe. Ibisobanuro birambuye biri ku rupapuro rwabyo.",
    summary: {
      title: "Incamake yawe yiteguye",
      body: "Ibihingwa, ifumbire, ubwishingizi n'ibindi byo gukora kuri {district} biri kuri “Fata incamake”, byiteguye gusomwa no gukururwa.",
      link: "Fata incamake",
    },
    manure: {
      title: "Igiciro cy'ifumbire y'ubworozi",
      body: "Ibiciro bitandukanya ku iduka no mu gihe. Baza umucuruzi w'ifumbire hafi yawe igiciro cy'uyu munsi mbere yo kugura; iyi porogaramu ntibika ibiciro.",
      link: "Reba ifumbire abahinzi bakoresha",
    },
    season: {
      title: "Reba igihembwe mbere yo guhinga",
      body: "Inama zerekana imvura isanzwe y'igihembwe n'iminsi iri imbere, kugira ngo uhitemo igihe cyo guhinga.",
      link: "Fungura Inama",
    },
  },
  fr: {
    label: "Annonces",
    intro: "De courtes annonces pour votre champ. Les détails restent sur les pages concernées.",
    summary: {
      title: "Votre récapitulatif est prêt",
      body: "Les cultures, les intrants, l’assurance et les prochaines étapes pour {district} sont sur « Obtenir le récapitulatif », prêts à lire et à télécharger.",
      link: "Obtenir le récapitulatif",
    },
    manure: {
      title: "Coût du fumier",
      body: "Les prix varient d’un magasin à l’autre et au fil de la saison. Demandez le prix du jour à votre fournisseur avant d’acheter ; cette application ne détient aucun prix.",
      link: "Voir les intrants utilisés ici",
    },
    season: {
      title: "Vérifiez la saison avant de semer",
      body: "La page Conseils indique les pluies habituelles de la saison et les jours à venir, pour choisir le moment de semer.",
      link: "Ouvrir Conseils",
    },
  },
};

export function buildAnnouncements(input: {
  district: string;
  language: FarmerLanguage;
}): Announcement[] {
  const t = announcementCopy[input.language];
  return [
    {
      id: "summary",
      title: t.summary.title,
      body: t.summary.body.replace("{district}", input.district),
      link: { to: "/summary", label: t.summary.link },
    },
    {
      id: "manure",
      title: t.manure.title,
      body: t.manure.body,
      link: { to: "/advice", label: t.manure.link },
    },
    {
      id: "season",
      title: t.season.title,
      body: t.season.body,
      link: { to: "/advice", label: t.season.link },
    },
  ];
}
