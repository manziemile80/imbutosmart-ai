import centroids from "@/lib/district-centroids.json";
import {
  CLIMATE_MONTHS,
  type ClimateMonth,
  type DistrictClimate,
  type DistrictForecast,
  type DistrictWeather,
  type ForecastDay,
} from "./weather";

// Server-only access to published district weather.
//
//   - The climate is a published 20-year record (NASA POWER, MERRA-2) for the
//     point at the centre of the district. It says what the district's
//     rainfall and temperature usually are.
//   - The forecast is a live 7-day outlook (Open-Meteo) for the same point.
//
// Both are fetched here so the browser only ever receives numbers and the
// name of their source. A source that cannot be reached leaves its part
// empty: no figure is ever estimated in its place.

const CLIMATE_URL = (
  process.env["WEATHER_CLIMATE_URL"] ?? "https://power.larc.nasa.gov/api/temporal/climatology/point"
).replace(/\/+$/, "");
const FORECAST_URL = (
  process.env["WEATHER_FORECAST_URL"] ?? "https://api.open-meteo.com/v1/forecast"
).replace(/\/+$/, "");
const CLIMATE_START = process.env["WEATHER_CLIMATE_START"] ?? "2001";
const CLIMATE_END = process.env["WEATHER_CLIMATE_END"] ?? "2020";
const FORECAST_DAYS = Number(process.env["WEATHER_FORECAST_DAYS"] ?? 7);

// The climate record does not change, so it is kept for a long time; a
// forecast is only useful for minutes.
const CLIMATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FORECAST_TTL_MS = 30 * 60 * 1000;

type CacheEntry<T> = { value: T; expires: number };
const climateCache = new Map<string, CacheEntry<DistrictClimate | null>>();
const forecastCache = new Map<string, CacheEntry<DistrictForecast | null>>();

// The number of days in each month on average, so a monthly mean of daily
// rainfall becomes a monthly total.
const AVERAGE_DAYS: Record<ClimateMonth, number> = {
  JAN: 31,
  FEB: 28.25,
  MAR: 31,
  APR: 30,
  MAY: 31,
  JUN: 30,
  JUL: 31,
  AUG: 31,
  SEP: 30,
  OCT: 31,
  NOV: 30,
  DEC: 31,
};

function pointFor(district: string): { lat: number; lon: number } | null {
  const record = (centroids as Record<string, { lat: number; lon: number }>)[district];
  return record ?? null;
}

async function fetchClimate(district: string): Promise<DistrictClimate | null> {
  const point = pointFor(district);
  if (!point) return null;

  const url = new URL(CLIMATE_URL);
  url.searchParams.set("parameters", "PRECTOTCORR,T2M");
  url.searchParams.set("community", "AG");
  url.searchParams.set("longitude", String(point.lon));
  url.searchParams.set("latitude", String(point.lat));
  url.searchParams.set("start", CLIMATE_START);
  url.searchParams.set("end", CLIMATE_END);
  url.searchParams.set("format", "JSON");

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    console.error("[weather] climate request failed", response.status, district);
    return null;
  }
  const payload = (await response.json()) as {
    properties?: {
      parameter?: {
        PRECTOTCORR?: Record<string, number>;
        T2M?: Record<string, number>;
      };
    };
  };
  const rain = payload.properties?.parameter?.PRECTOTCORR;
  const temperature = payload.properties?.parameter?.T2M;
  if (!rain || !temperature) {
    console.error("[weather] climate response had no usable parameters", district);
    return null;
  }

  const months = {} as DistrictClimate["months"];
  for (const month of CLIMATE_MONTHS) {
    const dailyMean = rain[month];
    const mean = temperature[month];
    if (dailyMean == null || mean == null) {
      console.error("[weather] climate response missed a month", district, month);
      return null;
    }
    months[month] = { rainMm: dailyMean * AVERAGE_DAYS[month], tempC: mean };
  }

  const annualRainMm = CLIMATE_MONTHS.reduce((total, month) => total + months[month].rainMm, 0);
  return {
    district,
    months,
    annualRainMm,
    period: `${CLIMATE_START}-${CLIMATE_END}`,
    source: "NASA POWER (MERRA-2)",
    sourceUrl: "https://power.larc.nasa.gov/",
    note: "Climate normals on a 50 km grid, so nearby districts share a figure.",
  };
}

async function fetchForecast(district: string): Promise<DistrictForecast | null> {
  const point = pointFor(district);
  if (!point) return null;

  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(point.lat));
  url.searchParams.set("longitude", String(point.lon));
  url.searchParams.set("daily", "precipitation_sum,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "Africa/Kigali");
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    console.error("[weather] forecast request failed", response.status, district);
    return null;
  }
  const payload = (await response.json()) as {
    daily?: {
      time?: string[];
      precipitation_sum?: (number | null)[];
      temperature_2m_max?: (number | null)[];
      temperature_2m_min?: (number | null)[];
    };
  };
  const times = payload.daily?.time;
  if (!times?.length) {
    console.error("[weather] forecast response had no days", district);
    return null;
  }

  const days: ForecastDay[] = times.map((date, index) => ({
    date,
    rainMm: payload.daily?.precipitation_sum?.[index] ?? 0,
    tempMinC: payload.daily?.temperature_2m_min?.[index] ?? 0,
    tempMaxC: payload.daily?.temperature_2m_max?.[index] ?? 0,
  }));

  return {
    district,
    days,
    source: "Open-Meteo",
    sourceUrl: "https://open-meteo.com/",
    issuedAt: new Date().toISOString(),
  };
}

async function cached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const entry = cache.get(key);
  const now = Date.now();
  if (entry && entry.expires > now) return entry.value;
  const value = await load();
  cache.set(key, { value, expires: now + ttl });
  return value;
}

// The weather of one district. Either part can be missing when its source is
// unreachable; the page then keeps whatever the farmer already had.
export async function getDistrictWeather(district: string): Promise<DistrictWeather> {
  const [climate, forecast] = await Promise.all([
    cached(climateCache, district, CLIMATE_TTL_MS, () => fetchClimate(district)),
    cached(forecastCache, district, FORECAST_TTL_MS, () => fetchForecast(district)),
  ]);
  return { district, climate, forecast };
}
