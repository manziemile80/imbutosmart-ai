// Browser-safe contract for the district weather the farmer page shows.
//
// Two different things are kept apart on purpose:
//   - the climate: what this district's rainfall and temperature usually are,
//     from a published 20-year record. It fills the season figures the crop
//     model needs.
//   - the forecast: what is expected in the coming days, from a live forecast.
//
// Nothing here is estimated locally: every number arrives from a named
// source, and a source that cannot be reached leaves its part empty instead
// of filling the gap.

export type ClimateMonth =
  "JAN" | "FEB" | "MAR" | "APR" | "MAY" | "JUN" | "JUL" | "AUG" | "SEP" | "OCT" | "NOV" | "DEC";

export type AgriculturalSeason = "A" | "B" | "C";

export type MonthClimate = { rainMm: number; tempC: number };

export type DistrictClimate = {
  district: string;
  months: Record<ClimateMonth, MonthClimate>;
  annualRainMm: number;
  /** The years the record covers, e.g. "2001-2020". */
  period: string;
  source: string;
  sourceUrl: string;
  /** The resolution of the source, so a farmer knows how precise it is. */
  note: string;
};

export type ForecastDay = {
  date: string;
  rainMm: number;
  tempMinC: number;
  tempMaxC: number;
  /** The highest chance of rain in the day, in per cent. */
  maxChanceOfRain: number;
  /** The hours of the day rain is likely, e.g. "13:00" to "17:00". */
  rainWindow: { from: string; to: string } | null;
  /** The WMO weather code of the day, e.g. 61 for slight rain. */
  weatherCode: number | null;
};

export type DistrictForecast = {
  district: string;
  days: ForecastDay[];
  source: string;
  sourceUrl: string;
  issuedAt: string;
};

export type DistrictWeather = {
  district: string;
  climate: DistrictClimate | null;
  forecast: DistrictForecast | null;
};

export const CLIMATE_MONTHS: ClimateMonth[] = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

// The agricultural calendar used across the app: Season A runs from September
// to February, Season B from March to June, and Season C from July to
// September.
export const SEASON_MONTHS: Record<AgriculturalSeason, ClimateMonth[]> = {
  A: ["SEP", "OCT", "NOV", "DEC", "JAN", "FEB"],
  B: ["MAR", "APR", "MAY", "JUN"],
  C: ["JUL", "AUG", "SEP"],
};

// The season a month belongs to. September overlaps seasons A and C, so no
// season is chosen for it.
export function seasonForMonth(month: number): AgriculturalSeason | null {
  if (month >= 10 || month <= 2) return "A";
  if (month <= 6) return "B";
  if (month <= 8) return "C";
  return null;
}

// The usual rainfall of a season, in millimetres, from the district's own
// record.
export function seasonRainMm(climate: DistrictClimate, season: AgriculturalSeason): number {
  return SEASON_MONTHS[season].reduce(
    (total, month) => total + (climate.months[month]?.rainMm ?? 0),
    0,
  );
}

// The usual mean temperature of a month, in degrees Celsius.
export function monthTempC(climate: DistrictClimate, month: number): number | null {
  const key = CLIMATE_MONTHS[Math.min(12, Math.max(1, month)) - 1];
  const value = key ? climate.months[key]?.tempC : undefined;
  return value == null ? null : value;
}

// The usual mean temperature of a season, in degrees Celsius.
export function seasonTempC(
  climate: DistrictClimate,
  season: "A" | "B" | "C" | null,
): number | null {
  if (!season) return null;
  const months = SEASON_MONTHS[season];
  const values = months
    .map((month) => climate.months[month]?.tempC)
    .filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

// The usual rain and temperature of the season the farmer chose, from the
// district's published record. The season calendar is the agricultural one
// used for the survey, so the figures match the months the farmer works.
// September belongs to seasons A and C, so with no season chosen only the
// month's temperature is available.
export function seasonFigures(
  climate: DistrictClimate,
  season: AgriculturalSeason | null,
  month: number,
): { rainMm: number | null; tempC: number | null } {
  if (!season) return { rainMm: null, tempC: monthTempC(climate, month) };
  return { rainMm: seasonRainMm(climate, season), tempC: seasonTempC(climate, season) };
}

// The rain and temperature the coming week is expected to bring, which is the
// near-term outlook for the field.
export function forecastSummary(forecast: DistrictForecast): {
  rainMm: number;
  tempMinC: number;
  tempMaxC: number;
} {
  const days = forecast.days;
  if (days.length === 0) return { rainMm: 0, tempMinC: 0, tempMaxC: 0 };
  return {
    rainMm: days.reduce((total, day) => total + day.rainMm, 0),
    tempMinC: Math.min(...days.map((day) => day.tempMinC)),
    tempMaxC: Math.max(...days.map((day) => day.tempMaxC)),
  };
}

// The hours of a day when rain is likely, taken from the hourly forecast. A
// farmer needs the hour, not only the day's total.
export function rainWindowFrom(
  hours: { time: string; chanceOfRain: number }[],
  chance = 50,
): { from: string; to: string } | null {
  const likely = hours.filter((hour) => hour.chanceOfRain >= chance);
  if (likely.length === 0) return null;
  const hourOf = (time: string) => time.slice(11, 16);
  const first = likely[0];
  const last = likely[likely.length - 1];
  if (!first || !last) return null;
  return { from: hourOf(first.time), to: hourOf(last.time) };
}

// The WMO weather codes the forecast service reports, in the farmer's
// language. The numbers are the international weather code, the same one the
// forecast service uses.
const weatherCodes: Record<number, { en: string; rw: string; fr: string }> = {
  0: { en: "Clear sky", rw: "Ikirere kidafite ibicu", fr: "Ciel dégagé" },
  1: { en: "Mainly clear", rw: "Ikirere kiracyeye cyane", fr: "Plutôt dégagé" },
  2: { en: "Partly cloudy", rw: "Ikirere gifite ibicu bike", fr: "Partiellement nuageux" },
  3: { en: "Overcast", rw: "Ikirere cy’ibicu byinshi", fr: "Ciel couvert" },
  45: { en: "Fog", rw: "Igihu", fr: "Brouillard" },
  48: { en: "Depositing rime fog", rw: "Igihu gikonje", fr: "Brouillard givrant" },
  51: { en: "Light drizzle", rw: "Urunyanyaga ruto", fr: "Bruine légère" },
  53: { en: "Moderate drizzle", rw: "Urunyanyaga ruringaniye", fr: "Bruine modérée" },
  55: { en: "Dense drizzle", rw: "Urunyanyaga rwinshi", fr: "Bruine dense" },
  56: { en: "Light freezing drizzle", rw: "Urunyanyaga rukonje ruto", fr: "Bruine verglaçante" },
  57: {
    en: "Dense freezing drizzle",
    rw: "Urunyanyaga rukonje rwinshi",
    fr: "Bruine verglaçante dense",
  },
  61: { en: "Slight rain", rw: "Imvura nto", fr: "Pluie faible" },
  63: { en: "Moderate rain", rw: "Imvura iringaniye", fr: "Pluie modérée" },
  65: { en: "Heavy rain", rw: "Imvura nyinshi", fr: "Pluie forte" },
  66: { en: "Light freezing rain", rw: "Imvura ikonje nto", fr: "Pluie verglaçante" },
  67: { en: "Heavy freezing rain", rw: "Imvura ikonje nyinshi", fr: "Pluie verglaçante forte" },
  71: { en: "Slight snowfall", rw: "Urubura ruto", fr: "Chute de neige faible" },
  73: { en: "Moderate snowfall", rw: "Urubura ruringaniye", fr: "Chute de neige modérée" },
  75: { en: "Heavy snowfall", rw: "Urubura rwinshi", fr: "Chute de neige forte" },
  77: { en: "Snow grains", rw: "Utubura duto", fr: "Grains de neige" },
  80: { en: "Slight rain showers", rw: "Imvura nto ihita", fr: "Faibles averses de pluie" },
  81: {
    en: "Moderate rain showers",
    rw: "Imvura iringaniye ihita",
    fr: "Averses de pluie modérées",
  },
  82: {
    en: "Violent rain showers",
    rw: "Imvura nyinshi ihita",
    fr: "Averses de pluie violentes",
  },
  85: { en: "Slight snow showers", rw: "Urubura ruto ruhita", fr: "Faibles averses de neige" },
  86: {
    en: "Heavy snow showers",
    rw: "Urubura rwinshi ruhita",
    fr: "Averses de neige fortes",
  },
  95: { en: "Thunderstorm", rw: "Imvura y’inkuba", fr: "Orage" },
  96: {
    en: "Thunderstorm with slight hail",
    rw: "Imvura y’inkuba n’urubura ruto",
    fr: "Orage avec faible grêle",
  },
  97: { en: "Heavy thunderstorm", rw: "Imvura y’inkuba ikaze", fr: "Orage violent" },
  99: {
    en: "Thunderstorm with heavy hail",
    rw: "Imvura y’inkuba n’urubura rwinshi",
    fr: "Orage avec forte grêle",
  },
};

// The name of a weather code, in the farmer's language.
export function weatherCodeLabel(
  code: number | null | undefined,
  language: "en" | "rw" | "fr",
): string | null {
  if (code == null) return null;
  return weatherCodes[code]?.[language] ?? null;
}

// Whether a weather code means precipitation of any kind.
export function isWetWeather(code: number | null | undefined): boolean {
  if (code == null) return false;
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 86) || code >= 95;
}
