import type { FarmerLanguage } from "./farmer-language";

type InsuranceCopy = {
  title: string; suggested: string; summary: string; context: string; disclaimer: string;
  compare: string; hide: string; checklist: string[]; damage: string; source: string;
};

export const insuranceCopy: Record<FarmerLanguage, InsuranceCopy> = {
  en: {
    title: "Protect your harvest from heavy rain",
    suggested: "Consider crop insurance with explicit excess-rainfall and flood cover",
    summary: "Ask a licensed insurer or your cooperative for a written quote covering your crop and field. Confirm that waterlogging and flood damage are included, not just drought.",
    context: "Your selected field", disclaimer: "General guidance, not an insurance quote or a heavy-rain forecast. District and soil alone cannot establish risk, eligibility, or the best insurer. Cover and payment depend on the policy terms.",
    compare: "What to check before buying", hide: "Hide checklist",
    checklist: [
      "Confirm the insurer is licensed and your district, crop and planting season are eligible.",
      "Ask which losses are covered: excess rain, flooding, waterlogging and erosion. Check exclusions in writing.",
      "Compare the premium, deductible, insured amount and payment limit for the same cover.",
      "Check the start date, waiting period and enrolment deadline. Do not assume an existing loss is covered.",
      "For index insurance, ask what rainfall threshold triggers payment and which station or data is used. Your field may suffer damage without the index triggering a payment.",
      "For loss-assessed insurance, ask how damage is assessed. For either type, confirm claim deadlines, required evidence and the complaints process.",
    ],
    damage: "If damage occurs: stay away from floodwater, document losses only when safe, and notify your insurer promptly under your policy’s claim rules.",
    source: "Rwanda agriculture ministry",
  },
  fr: {
    title: "Protégez votre récolte contre les fortes pluies",
    suggested: "Envisagez une assurance couvrant explicitement l’excès de pluie et les inondations",
    summary: "Demandez à un assureur agréé ou à votre coopérative un devis écrit pour votre culture et votre parcelle. Vérifiez la couverture des sols gorgés d’eau et des inondations, pas seulement de la sécheresse.",
    context: "Votre parcelle sélectionnée", disclaimer: "Conseils généraux, pas un devis ni une prévision de fortes pluies. Le district et le sol ne suffisent pas à déterminer le risque, l’éligibilité ou le meilleur assureur. La couverture et le paiement dépendent du contrat.",
    compare: "À vérifier avant de souscrire", hide: "Masquer la liste",
    checklist: [
      "Vérifiez l’agrément de l’assureur et l’éligibilité de votre district, culture et saison de plantation.",
      "Confirmez par écrit les risques couverts : excès de pluie, inondation, engorgement et érosion, ainsi que les exclusions.",
      "Comparez la prime, la franchise, le montant assuré et le plafond d’indemnisation pour une couverture identique.",
      "Vérifiez la date d’effet, le délai de carence et la date limite de souscription. Ne présumez pas qu’un dommage existant est couvert.",
      "Pour une assurance indicielle, demandez le seuil de pluie déclenchant le paiement et la station ou les données utilisées. Une parcelle peut subir des dégâts sans déclencher le paiement.",
      "Pour une assurance avec expertise, demandez comment les dégâts sont évalués. Dans les deux cas, vérifiez les délais, les justificatifs et la procédure de réclamation.",
    ],
    damage: "En cas de dégâts : évitez les eaux de crue, documentez les pertes seulement sans danger et prévenez rapidement l’assureur selon les règles du contrat.",
    source: "Ministère rwandais de l’Agriculture",
  },
  rw: {
    title: "Rinda umusaruro wawe imvura nyinshi",
    suggested: "Tekereza ku bwishingizi bw’ibihingwa burinda ibyangizwa n’imvura nyinshi n’umwuzure",
    summary: "Saba ikigo cy’ubwishingizi cyemewe cyangwa koperative yawe inyandiko igaragaza igiciro n’ibishingirwa ku gihingwa no ku murima wawe. Menya niba amazi areka mu murima n’umwuzure birimo, atari amapfa gusa.",
    context: "Umurima wahisemo", disclaimer: "Izi ni inama rusange, si igiciro cy’ubwishingizi cyangwa iteganyagihe ry’imvura nyinshi. Akarere n’ubutaka byonyine ntibyemeza ibyago, kwemerewa cyangwa ikigo cyiza kurusha ibindi. Kurindwa no kwishyurwa bishingira ku masezerano.",
    compare: "Ibyo kugenzura mbere yo kwishingira", hide: "Hisha urutonde",
    checklist: [
      "Menya ko ikigo cyemewe kandi ko akarere, igihingwa n’igihembwe cyawe byemerewe.",
      "Saba inyandiko yemeza ibishingirwa: imvura nyinshi, umwuzure, amazi areka n’isuri. Reba ibitemewe mu masezerano.",
      "Gereranya ikiguzi, igice cy’igihombo wishyura ubwawe, agaciro kishingiwe n’amafaranga ntarengwa y’indishyi ku bwishingizi bumwe.",
      "Reba igihe ubwishingizi butangirira, igihe cyo gutegereza n’itariki ntarengwa yo kwiyandikisha. Ntukibwire ko ibyangiritse mbere bizishyurwa.",
      "Ku bwishingizi bushingiye ku bipimo by’imvura, baza igipimo gituma wishyurwa n’aho amakuru ava. Umurima ushobora kwangirika ariko igipimo ntigitume wishyurwa.",
      "Ku bwishingizi busuzuma ibyangiritse, baza uko isuzuma rikorwa. Kuri byombi, menya igihe cyo kumenyesha igihombo, ibimenyetso bisabwa n’uburyo bwo gutanga ikirego.",
    ],
    damage: "Iyo habaye ibyangiritse: irinde amazi y’umwuzure, fata ibimenyetso gusa igihe nta kaga, kandi menyesha ikigo vuba ukurikije amategeko y’amasezerano.",
    source: "Minisiteri y’Ubuhinzi y’u Rwanda",
  },
};