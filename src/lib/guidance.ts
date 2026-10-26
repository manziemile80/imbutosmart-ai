import type { FarmerLanguage } from "./farmer-language";

// Browser-safe contract for the guidance page: the ways the app can help, and
// the copy that explains them. The page is a help desk: one place where every
// assistant is reachable, instead of the farmer having to know which part of
// the app holds what.

export const guidanceModes = ["question", "voice", "season", "plan"] as const;
export type GuidanceMode = (typeof guidanceModes)[number];

export const guidanceCopy: Record<
  FarmerLanguage,
  {
    eyebrow: string;
    title: string;
    lede: string;
    modes: Record<GuidanceMode, { label: string; blurb: string }>;
    guideTitle: string;
    guide: string[];
    planLink: string;
    planBlurb: string;
    planContains: { crops: string; inputs: string; when: string };
  }
> = {
  en: {
    eyebrow: "Guidance",
    title: "All the help in one place",
    lede: "Every way ImbutoSmart AI can help you: ask a question, speak it, read about this season's weather, or get a plan for your field. Pick what you need.",
    modes: {
      question: {
        label: "Ask a question",
        blurb: "Type anything about your crops, your soil or the season.",
      },
      voice: {
        label: "Speak your question",
        blurb: "Record it, and hear the answer read back to you.",
      },
      season: {
        label: "This season",
        blurb: "The season names, the usual rainfall and the crop prevalence.",
      },
      plan: {
        label: "My plan",
        blurb: "What to plant for your field, and what farmers around you use.",
      },
    },
    guideTitle: "How to get a good answer",
    guide: [
      "Say where your field is: the district, and the soil if you know it.",
      "Ask one thing at a time. A short question gets a clear answer.",
      "Say what you have already tried, and what you can afford.",
      "The assistant uses general knowledge: confirm anything important with an agronomist and Meteo Rwanda.",
    ],
    planLink: "Open the full plan",
    planContains: {
      crops: "The crops that suit your district and soil, and how well each one fits.",
      inputs: "The inputs farmers around you use, and the rate they applied them at.",
      when: "The season's usual rainfall and temperature, and the days ahead.",
    },
    planBlurb:
      "The Advice page has the whole plan: the crops, the inputs farmers in your district used, and when to act.",
  },
  rw: {
    eyebrow: "Ubuyobozi",
    title: "Byose ubufasha ahurintanye ahantu kumwe",
    lede: "Uburyo butumwa ImbutoSmart AI bishobora kugufasha: ubaza ikibazo, uvugire, usome ibyerekeranye igihembwe, cyangwa ubone gahunda y'umurima wawe. Hitamo ibyo ukeneye.",
    modes: {
      question: {
        label: "Baza ikibazo",
        blurb: "Andika ibyo ukeneye ku bihingwa, ubutaka cyangwa igihembwe.",
      },
      voice: {
        label: "Vuga ikibazo cyawe",
        blurb: "Yiga kwandika, hanyuma wumve igisubizo cyasomwa.",
      },
      season: {
        label: "Uyu gihembwe",
        blurb: "Amazina y'ibihembwe, imvura isanzwe, n'ibihingwa bisanzwe bikorwa.",
      },
      plan: {
        label: "Gahunda yanjye",
        blurb: "Icyo guhinga ku murima wawe, n'ifumbire abahinzi bakoresha hafi yawe.",
      },
    },
    guideTitle: "Uko unshobora kubona igisubizo cyiza",
    guide: [
      "Bwira aho umurima wawe uri: akarere, kandi ubutaka niba ubukazi.",
      "Baza ikibazo kimwe. Ikibazo gito gishobora igisubizo gikwiye.",
      "Bwira ibyo wagiye ugakora, n'ibyo washobora kwishyuza.",
      "Umufasha akoresha ubumenyi rusange: emeza ibintu bikennye n'impuguke na Meteo Rwanda.",
    ],
    planLink: "Fungura gahunda yose",
    planContains: {
      crops: "Ibihingwa bikwiye akarere n'ubutaka wawe, n'ubukere bw'ibyo byose.",
      inputs: "Ifumbire abahinzi bakoresha hafi yawe, n'ubunini bwabakoresha.",
      when: "Imvura n'ubushyuhe busanzwe bw'igihembwe, n'iminsi izoze.",
    },
    planBlurb:
      "Uruhande rw'Inama ruzabikora: ibihingwa, ifumbire abahinzi mu karere kawe bakoreseye, n'igihe cyo gukora.",
  },
  fr: {
    eyebrow: "Orientation",
    title: "Toute l'aide au même endroit",
    lede: "Toutes les façons dont ImbutoSmart AI peut vous aider : posez une question, parlez, lisez ce que dit la saison, ou obtenez un plan pour votre champ. Choisissez ce qu'il vous faut.",
    modes: {
      question: {
        label: "Poser une question",
        blurb: "Écrivez ce que vous voulez savoir sur vos cultures, votre sol ou la saison.",
      },
      voice: {
        label: "Parler votre question",
        blurb: "Enregistrez-la, et écoutez la réponse.",
      },
      season: {
        label: "Cette saison",
        blurb:
          "Les noms des saisons, la pluviométrie habituelle et les cultures les plus cultivées.",
      },
      plan: {
        label: "Mon plan",
        blurb: "Ce qu'il faut semer chez vous, et les intrants que vos voisins utilisent.",
      },
    },
    guideTitle: "Comment obtenir une bonne réponse",
    guide: [
      "Dites où se trouve votre champ : le district, et le sol si vous le connaissez.",
      "Posez une seule question à la fois. Une question courte reçoit une réponse claire.",
      "Dites ce que vous avez déjà essayé, et ce que vous pouvez payer.",
      "L'assistant utilise des connaissances générales : confirmez l'important avec un agronome et Meteo Rwanda.",
    ],
    planLink: "Ouvrir le plan complet",
    planContains: {
      crops: "Les cultures qui conviennent à votre district et à votre sol, et leur niveau.",
      inputs: "Les intrants utilisés par vos voisins, et la dose appliquée.",
      when: "La pluviométrie et la température habituelles de la saison, et les jours à venir.",
    },
    planBlurb:
      "La page Conseils contient tout le plan : les cultures, les intrants utilisés dans votre district et le moment d'agir.",
  },
};
