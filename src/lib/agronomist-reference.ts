import type { FarmerLanguage } from "./farmer-language";

// Reference material for the agronomist dashboard. Everything here is either
// general agronomic practice or an official source. It deliberately contains
// no prices, application rates or insurer premiums: a price or a rate is only
// shown when an agronomist records a verified local figure with its source and
// the date it was checked.

export const INPUT_CATEGORIES = ["manure", "fertilizer"] as const;
export type InputCategory = (typeof INPUT_CATEGORIES)[number];

export type ReferenceInput = {
  /** Stable id used by the read-only reference catalogue. */
  referenceId: string;
  category: InputCategory;
  name: string;
  uses: string;
  benefits: string;
  suitableCrops: string;
  applicationGuidance: string;
  /** No quantity, supplier, price or location is implied for a reference entry. */
  availableQuantity: null;
  quantityUnit: null;
  supplier: "";
  priceRwf: null;
  priceUnit: null;
  bagSizeKg: null;
  location: "";
  source: string;
  sourceUrl: string;
  verified: false;
  priceUpdatedAt: null;
};

const GENERAL_INPUT_SOURCE =
  "General agronomic reference. Record the supplier, price and check date before showing a local price.";

export const REFERENCE_INPUTS: ReferenceInput[] = [
  {
    referenceId: "ref-cow-dung",
    category: "manure",
    name: "Cow dung",
    uses: "Adds organic matter and improves soil structure, water holding and nutrient cycling.",
    benefits:
      "Widely available on mixed farms. Well-rotted dung is safer for young plants than fresh dung.",
    suitableCrops: "Maize, beans, banana, vegetables, sweet potato, Irish potato",
    applicationGuidance:
      "Compost or age the dung before use. Spread and incorporate it before planting, following local extension advice and a soil test where available. Keep fresh dung away from edible leaves and drinking water.",
    availableQuantity: null,
    quantityUnit: null,
    supplier: "",
    priceRwf: null,
    priceUnit: null,
    bagSizeKg: null,
    location: "",
    source: GENERAL_INPUT_SOURCE,
    sourceUrl: "https://www.rab.gov.rw",
    verified: false,
    priceUpdatedAt: null,
  },
  {
    referenceId: "ref-goat-sheep",
    category: "manure",
    name: "Goat and sheep manure",
    uses: "A richer farmyard manure for building organic matter and supplying several nutrients.",
    benefits:
      "Useful where cattle manure is scarce. Dry, stacked manure is easier to store and spread.",
    suitableCrops: "Vegetables, maize, beans, Irish potato, banana",
    applicationGuidance:
      "Compost or age before use. Mix with other organic material and incorporate before planting. Do not apply fresh manure directly around seedlings.",
    availableQuantity: null,
    quantityUnit: null,
    supplier: "",
    priceRwf: null,
    priceUnit: null,
    bagSizeKg: null,
    location: "",
    source: GENERAL_INPUT_SOURCE,
    sourceUrl: "https://www.rab.gov.rw",
    verified: false,
    priceUpdatedAt: null,
  },
  {
    referenceId: "ref-poultry",
    category: "manure",
    name: "Poultry manure",
    uses: "A nutrient-rich manure, especially for nitrogen and phosphorus.",
    benefits:
      "Small volumes can supply useful nutrients, but fresh poultry manure can burn plants and carry pathogens.",
    suitableCrops: "Maize, vegetables, banana, fodder",
    applicationGuidance:
      "Compost or age thoroughly before use. Apply at a conservative rate and keep it away from direct contact with roots and edible leaves. Follow local extension advice.",
    availableQuantity: null,
    quantityUnit: null,
    supplier: "",
    priceRwf: null,
    priceUnit: null,
    bagSizeKg: null,
    location: "",
    source: GENERAL_INPUT_SOURCE,
    sourceUrl: "https://www.rab.gov.rw",
    verified: false,
    priceUpdatedAt: null,
  },
  {
    referenceId: "ref-compost",
    category: "manure",
    name: "Compost",
    uses: "Recycles plant and kitchen waste into organic matter for the field.",
    benefits:
      "Improves soil structure, moisture retention and biological activity. Reduces waste and can be made on the farm.",
    suitableCrops: "All field crops and vegetables",
    applicationGuidance:
      "Use mature compost that no longer heats up and has no strong smell. Incorporate it before planting or use it as a mulch. Keep the heap moist but not waterlogged and turn it regularly.",
    availableQuantity: null,
    quantityUnit: null,
    supplier: "",
    priceRwf: null,
    priceUnit: null,
    bagSizeKg: null,
    location: "",
    source: GENERAL_INPUT_SOURCE,
    sourceUrl: "https://www.rab.gov.rw",
    verified: false,
    priceUpdatedAt: null,
  },
  {
    referenceId: "ref-npk",
    category: "fertilizer",
    name: "NPK 17-17-17",
    uses: "A balanced mineral fertiliser supplying nitrogen, phosphorus and potassium.",
    benefits:
      "Convenient where a soil test or local recommendation calls for a balanced NPK product.",
    suitableCrops: "Maize, Irish potato, vegetables, rice, wheat",
    applicationGuidance:
      "Use the product label and a soil test or local extension recommendation. Place it correctly for the crop and keep it out of direct contact with seed where the label says so.",
    availableQuantity: null,
    quantityUnit: null,
    supplier: "",
    priceRwf: null,
    priceUnit: null,
    bagSizeKg: null,
    location: "",
    source: GENERAL_INPUT_SOURCE,
    sourceUrl: "https://www.rab.gov.rw",
    verified: false,
    priceUpdatedAt: null,
  },
  {
    referenceId: "ref-dap",
    category: "fertilizer",
    name: "DAP",
    uses: "A phosphorus fertiliser used at or near planting where phosphorus is needed.",
    benefits: "Supplies phosphorus and some nitrogen for early root and crop establishment.",
    suitableCrops: "Maize, wheat, rice, Irish potato, vegetables",
    applicationGuidance:
      "Follow the label and a soil test or local recommendation. Place it according to the crop and label; avoid direct seed contact where the label requires it.",
    availableQuantity: null,
    quantityUnit: null,
    supplier: "",
    priceRwf: null,
    priceUnit: null,
    bagSizeKg: null,
    location: "",
    source: GENERAL_INPUT_SOURCE,
    sourceUrl: "https://www.rab.gov.rw",
    verified: false,
    priceUpdatedAt: null,
  },
  {
    referenceId: "ref-urea",
    category: "fertilizer",
    name: "Urea",
    uses: "A nitrogen fertiliser used for top dressing leafy and cereal crops.",
    benefits: "Supplies concentrated nitrogen when the crop needs it.",
    suitableCrops: "Maize, rice, wheat, vegetables, fodder",
    applicationGuidance:
      "Apply according to the label and local recommendation, usually in split doses. Keep it away from direct seed contact and avoid applying before heavy rain or on waterlogged soil.",
    availableQuantity: null,
    quantityUnit: null,
    supplier: "",
    priceRwf: null,
    priceUnit: null,
    bagSizeKg: null,
    location: "",
    source: GENERAL_INPUT_SOURCE,
    sourceUrl: "https://www.rab.gov.rw",
    verified: false,
    priceUpdatedAt: null,
  },
];

export type GuideCategory = "soil" | "calendar" | "water" | "crop" | "harvest" | "pest";

export type KnowledgeGuide = {
  id: string;
  category: GuideCategory;
  title: string;
  summary: string;
  steps: string[];
  source: string;
  sourceUrl: string;
};

export const KNOWLEDGE_GUIDES: KnowledgeGuide[] = [
  {
    id: "soil-test",
    category: "soil",
    title: "Taking a soil sample for testing",
    summary:
      "A soil test is the only reliable way to know the field's pH and nutrient status. The app never invents a pH or a nutrient figure.",
    steps: [
      "Divide the field into areas with similar soil, slope and cropping history.",
      "Take small samples from several points in a zig-zag pattern, from the topsoil where roots grow.",
      "Mix the samples in a clean bucket and send a representative sub-sample to an accredited laboratory or your district agronomist.",
      "Record the field name, sampling date and the depth used, and keep the laboratory report with the field records.",
      "Use the report with local extension advice before changing fertiliser or lime use.",
    ],
    source:
      "General agronomic practice; confirm the laboratory and sampling method with RAB or your district agronomist.",
    sourceUrl: "https://www.rab.gov.rw",
  },
  {
    id: "compost",
    category: "soil",
    title: "Making and using compost",
    summary:
      "Compost improves soil structure and moisture retention and recycles farm waste. Mature compost is safer than fresh waste.",
    steps: [
      "Layer dry plant material, green material and animal manure, and keep the heap moist but not waterlogged.",
      "Turn the heap regularly so the outside material heats up too.",
      "Cover it to protect it from heavy rain and to keep moisture in.",
      "Use it when it is dark, crumbly and no longer heats up; remove stones and plastic first.",
      "Incorporate it before planting or use it as a mulch, following local advice.",
    ],
    source: "General agronomic practice.",
    sourceUrl: "https://www.rab.gov.rw",
  },
  {
    id: "fertiliser-safety",
    category: "soil",
    title: "Storing and applying fertiliser safely",
    summary:
      "Mineral fertilisers are concentrated. The label, the soil test and local advice come before any application rate.",
    steps: [
      "Keep fertiliser in its original labelled bag, dry, closed and out of reach of children and animals.",
      "Wear gloves and avoid breathing dust or spray; wash after handling.",
      "Do not mix products unless the label or an extension officer says it is safe.",
      "Keep fertiliser away from streams, wells and drainage lines, and do not apply before heavy rain.",
      "Record the product, supplier, price, quantity and date so the next decision can be checked.",
    ],
    source: "General agronomic practice and product labels.",
    sourceUrl: "https://www.rab.gov.rw",
  },
  {
    id: "crop-rotation",
    category: "crop",
    title: "Crop rotation and soil fertility",
    summary:
      "Alternating crop families helps break pest and disease cycles and spreads nutrient demand.",
    steps: [
      "Follow a cereal with a legume such as beans, and avoid growing the same crop family in the same plot season after season.",
      "Keep a simple plot map and write down what was planted in each season.",
      "Use organic matter regularly; rotation alone does not replace soil fertility management.",
      "Check the district's survey figures in the Advice page for the crops and inputs farmers already use.",
    ],
    source: "General agronomic practice; NISR survey context is shown in the Advice page.",
    sourceUrl: "https://www.statistics.gov.rw",
  },
  {
    id: "irrigation",
    category: "water",
    title: "Irrigating with limited water",
    summary: "Apply water where it reaches the roots, early or late in the day, and avoid runoff.",
    steps: [
      "Check soil moisture by hand before watering; do not water on a schedule alone.",
      "Water early in the morning or late in the afternoon to reduce evaporation.",
      "Use furrows, basins, drip lines or a watering can close to the plant rather than flooding the whole plot.",
      "Mulch around plants to keep soil moisture and reduce erosion.",
      "Keep irrigation equipment and water sources clean, and follow local water-use rules.",
    ],
    source: "General agronomic practice; follow local water-use rules.",
    sourceUrl: "https://www.rab.gov.rw",
  },
  {
    id: "erosion",
    category: "water",
    title: "Protecting soil from heavy rain",
    summary:
      "Rwanda's slopes can lose topsoil quickly in intense rain. Cover and slow the water before it forms a channel.",
    steps: [
      "Keep the soil covered with crops, mulch or cover crops, especially at the start of the rains.",
      "Plant across the slope and maintain contour bunds, trenches or grass strips where they are recommended locally.",
      "Do not leave bare soil on steep plots through the rainy season.",
      "Check drainage before heavy-rain days and keep paths and waterways clear.",
      "Repair gullies and broken bunds early, before the next storm.",
    ],
    source:
      "General agronomic practice; the district survey's eroded share is shown in the soil section.",
    sourceUrl: "https://www.statistics.gov.rw",
  },
  {
    id: "ipm",
    category: "pest",
    title: "Integrated pest and disease management",
    summary:
      "Scout first, identify the problem, and start with cultural and biological measures before a chemical product.",
    steps: [
      "Walk the field regularly and record what you see, where and on which crop.",
      "Remove and destroy severely affected plants where the problem is spreading.",
      "Use resistant varieties, clean seed, spacing and rotation where they are available.",
      "Encourage beneficial insects and avoid unnecessary spraying that kills them.",
      "If a chemical is justified, follow the label exactly and keep the treated crop's harvest interval.",
      "Refer unusual or serious outbreaks to RAB or your district agronomist instead of guessing.",
    ],
    source: "General agronomic practice; refer serious cases to RAB or the district agronomist.",
    sourceUrl: "https://www.rab.gov.rw",
  },
  {
    id: "harvest-storage",
    category: "harvest",
    title: "Harvesting and storing safely",
    summary:
      "Dry and clean grain and tubers before storage, and keep them away from moisture and pests.",
    steps: [
      "Harvest at the right maturity and avoid damaging the produce during harvest.",
      "Dry grain on a clean raised surface until it is hard and does not stick together.",
      "Clean and repair the store before bringing in the new harvest.",
      "Use hermetic or well-sealed containers where available, and keep bags off the floor and away from walls.",
      "Check the store regularly for moisture, insects and rodents; do not store treated seed with food.",
    ],
    source: "General post-harvest practice.",
    sourceUrl: "https://www.rab.gov.rw",
  },
  {
    id: "planting-calendar",
    category: "calendar",
    title: "Rwanda's agricultural seasons",
    summary:
      "The survey calendar: Season A runs September–February, Season B March–June and Season C July–September. September overlaps A and C.",
    steps: [
      "Season A: September to February. It includes the short rainy period; onset and amount vary by place and year.",
      "Season B: March to June. It includes the long rainy period; it can extend into June.",
      "Season C: July to September, often marshland or irrigated production. Use water legally and avoid protected wetlands.",
      "Wait for locally confirmed rain before rain-fed planting; the calendar is a usual pattern, not a forecast.",
      "Check the district climate and the coming-days forecast before choosing a planting day.",
    ],
    source: "NISR seasonal calendar, as used by the app's season guide.",
    sourceUrl: "https://www.statistics.gov.rw",
  },
  {
    id: "post-harvest-loss",
    category: "harvest",
    title: "Reducing post-harvest loss",
    summary:
      "Losses continue after harvest. Dry, clean, cool and protected storage protects the work already done.",
    steps: [
      "Dry produce on a clean surface and cover it at night or when rain threatens.",
      "Sort out damaged produce before storage so it does not spoil the rest.",
      "Keep stores cool, dry and ventilated, with bags on pallets away from walls.",
      "Use traps or hermetic storage before reaching for a chemical treatment.",
      "Record the harvest date, quantity and any losses so follow-up can be planned.",
    ],
    source: "General post-harvest practice.",
    sourceUrl: "https://www.rab.gov.rw",
  },
];

export type RiskKind = "heavy-rain" | "dry-week" | "heat" | "erosion" | "pest";

export type RiskAction = {
  label: string;
  detail: string;
};

export const RISK_ACTIONS: Record<RiskKind, RiskAction[]> = {
  "heavy-rain": [
    {
      label: "Check drainage",
      detail: "Clear paths and waterways before the rain reaches the field.",
    },
    {
      label: "Protect young plants",
      detail: "Stake or cover vulnerable seedlings and avoid working wet soil.",
    },
    {
      label: "Delay fertiliser",
      detail: "Do not apply fertiliser just before heavy rain; it can wash away.",
    },
  ],
  "dry-week": [
    {
      label: "Check soil moisture",
      detail: "Water only where the soil is actually dry at root depth.",
    },
    { label: "Mulch", detail: "Keep the soil covered to slow evaporation." },
    {
      label: "Delay planting",
      detail: "Wait for locally confirmed rain before rain-fed planting.",
    },
  ],
  heat: [
    { label: "Water early or late", detail: "Avoid the hottest hours and reduce evaporation." },
    {
      label: "Shade young plants",
      detail: "Use available shade or mulch without blocking airflow.",
    },
    {
      label: "Watch for pests",
      detail: "Heat stress can make plants more attractive to pests; scout more often.",
    },
  ],
  erosion: [
    {
      label: "Keep soil covered",
      detail: "Mulch, cover crops and crop cover reduce raindrop impact.",
    },
    {
      label: "Maintain bunds",
      detail: "Check contour bunds, trenches and grass strips before the rain.",
    },
    {
      label: "Do not leave bare slopes",
      detail: "Bare soil on a slope loses topsoil quickly in intense rain.",
    },
  ],
  pest: [
    {
      label: "Scout and record",
      detail: "Walk the field and record the crop, symptom and location.",
    },
    {
      label: "Remove affected plants",
      detail: "Remove and destroy severely affected plants where it is safe.",
    },
    {
      label: "Refer serious cases",
      detail: "Send unusual or spreading outbreaks to RAB or the district agronomist.",
    },
  ],
};

export type MessageCategory = "recommendation" | "reminder" | "weather" | "input" | "follow-up";
export type MessageChannel = "whatsapp" | "sms" | "email" | "call" | "in-person";

export const MESSAGE_CATEGORIES: MessageCategory[] = [
  "recommendation",
  "reminder",
  "weather",
  "input",
  "follow-up",
];

export const MESSAGE_CHANNELS: MessageChannel[] = ["whatsapp", "sms", "email", "call", "in-person"];

type TemplateCopy = Record<MessageCategory, { subject: string; body: string }>;

// Plain-language templates. They carry no crop figure, price or rate: an
// agronomist adds the verified detail before sending.
export const MESSAGE_TEMPLATES: Record<FarmerLanguage, TemplateCopy> = {
  en: {
    recommendation: {
      subject: "Your crop recommendation",
      body: "Hello. Here is the recommendation we discussed for your field. Please read it and call me if anything is unclear. This is general guidance, not a guarantee: confirm the seed, inputs and planting date with your local extension officer.",
    },
    reminder: {
      subject: "Planting reminder",
      body: "Hello. This is a reminder to check your field and the coming-days forecast before planting. Wait for locally confirmed rain if your field depends on rainfall. Call me if you need help with the decision.",
    },
    weather: {
      subject: "Weather alert",
      body: "Hello. Please check the coming-days forecast for your district before field work. Protect young plants and check drainage if heavy rain is expected. This alert is general guidance; follow Meteo Rwanda and local advice.",
    },
    input: {
      subject: "Manure and fertiliser guidance",
      body: "Hello. Before buying manure or fertiliser, check the product, the supplier, the price and the date it was last updated. Ask for a label and follow a soil test or local extension advice for the application rate. Do not use a price or rate that has not been verified.",
    },
    "follow-up": {
      subject: "Follow-up visit",
      body: "Hello. I would like to follow up on your field and the recommendation you received. Please tell me a good day and any changes you have seen since planting.",
    },
  },
  fr: {
    recommendation: {
      subject: "Votre recommandation de culture",
      body: "Bonjour. Voici la recommandation dont nous avons parlé pour votre champ. Lisez-la et appelez-moi si quelque chose n’est pas clair. Ce sont des conseils généraux, pas une garantie : confirmez les semences, les intrants et la date de plantation avec votre agent de vulgarisation.",
    },
    reminder: {
      subject: "Rappel de plantation",
      body: "Bonjour. Pensez à vérifier votre champ et les prévisions des prochains jours avant de planter. Attendez une pluie confirmée localement si votre champ dépend de la pluie. Appelez-moi si vous avez besoin d’aide.",
    },
    weather: {
      subject: "Alerte météo",
      body: "Bonjour. Consultez les prévisions des prochains jours pour votre district avant les travaux. Protégez les jeunes plants et vérifiez le drainage si de fortes pluies sont attendues. Cette alerte est générale ; suivez Meteo Rwanda et les conseils locaux.",
    },
    input: {
      subject: "Conseils sur le fumier et les engrais",
      body: "Bonjour. Avant d’acheter du fumier ou de l’engrais, vérifiez le produit, le fournisseur, le prix et la date de dernière mise à jour. Demandez l’étiquette et suivez une analyse de sol ou un conseil local pour la dose. N’utilisez pas un prix ou une dose non vérifiés.",
    },
    "follow-up": {
      subject: "Visite de suivi",
      body: "Bonjour. Je souhaite faire un suivi de votre champ et de la recommandation reçue. Dites-moi un jour qui vous convient et les changements observés depuis la plantation.",
    },
  },
  rw: {
    recommendation: {
      subject: "Inama y’igihingwa cyawe",
      body: "Muraho. Iyi ni inama twaganiriyeho ku murima wawe. Yisomere kandi umpamagare niba hari icyo utumva neza. Ni inama rusange, si isezerano: emeza imbuto, ifumbire n’itariki yo guhinga n’umujyanama w’ubuhinzi wo hafi yawe.",
    },
    reminder: {
      subject: "Icyibutso cyo guhinga",
      body: "Muraho. Icyi ni icyibutso cyo kureba umurima wawe n’iteganyagihe ry’iminsi iri imbere mbere yo guhinga. Tegereza imvura yemejwe mu gace kawe niba umurima wawe ukoresha imvura gusa. Mpamagare niba ukeneye ubufasha.",
    },
    weather: {
      subject: "Imenyesha ry’ikirere",
      body: "Muraho. Reba iteganyagihe ry’iminsi iri imbere mu karere kawe mbere y’imirimo yo mu murima. Rinda ibihingwa bito kandi urebe imiyoboro y’amazi niba imvura nyinshi iteganyijwe. Iri menyesha ni rusange; kurikiza Meteo Rwanda n’inama z’aho uherereye.",
    },
    input: {
      subject: "Inama ku ifumbire",
      body: "Muraho. Mbere yo kugura ifumbire, reba igicuruzwa, uwugurisha, igiciro n’itariki yavuguruwe. Saba etiketi kandi ukurikize isuzuma ry’ubutaka cyangwa inama y’umujyanama ku kigero cyo gushyiramo. Ntukoreshe igiciro cyangwa igipimo bitemejwe.",
    },
    "follow-up": {
      subject: "Isura ryo gukurikirana",
      body: "Muraho. Nshaka gukurikirana umurima wawe n’inama wahawe. Mbwira umunsi ukwiye n’imihindukire wabonye kuva uhinga.",
    },
  },
};

export const INSURANCE_SOURCE_URL =
  "https://www.minagri.gov.rw/updates/news-details/minagri-and-rab-spiu-encourage-farmers-to-embrace-the-national-agriculture-insurance-scheme-nais";

export const AGRONOMIST_SOURCES = {
  survey: {
    label: "NISR Seasonal Agricultural Survey 2025 / AHS 2024",
    url: "https://www.statistics.gov.rw",
  },
  climate: {
    label: "NASA POWER / MERRA-2 district climate record",
    url: "https://power.larc.nasa.gov",
  },
  forecast: {
    label: "Open-Meteo forecast",
    url: "https://open-meteo.com",
  },
  rab: {
    label: "Rwanda Agriculture and Animal Resources Development Board (RAB)",
    url: "https://www.rab.gov.rw",
  },
  insurance: {
    label: "MINAGRI — National Agriculture Insurance Scheme (NAIS)",
    url: INSURANCE_SOURCE_URL,
  },
} as const;
