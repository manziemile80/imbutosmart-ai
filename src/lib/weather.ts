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
export function seasonTempC(climate: DistrictClimate, season: "A" | "B" | "C" | null): number | null {
  if (!season) return null;
  const months = SEASON_MONTHS[season];
  const values = months
    .map((month) => climate.months[month]?.tempC)
    .filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
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
