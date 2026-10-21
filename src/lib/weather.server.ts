import centroids from "@/lib/district-centroids.json";
import climateRecord from "@/lib/district-climate.json";
import {
  CLIMATE_MONTHS,
  type ClimateMonth,
  type DistrictClimate,
  type DistrictForecast,
  type DistrictWeather,
  type ForecastDay,
} from "./weather";

// Server-only access to the district weather.
//
//   - The climate comes from the published record that ships with the app
//     (src/lib/district-climate.json: NASA POWER, MERRA-2, 2001-2020), so it
//     is always there and always says the same thing.
//   - The forecast is a live 7-day outlook (Open-Meteo) for the same point.
//
// The forecast is the only part that needs the network, and when it cannot be
// reached the answer simply carries no forecast. No figure is ever estimated
// in its place.

const FORECAST_URL = (process.env["WEATHER_FORECAST_URL"] ?? "https://api.open-meteo.com/v1/forecast").replace(/\/+$/, "");
const FORECAST_DAYS = Number(process.env["WEATHER_FORECAST_DAYS"] ?? 7);

// A forecast is only useful for minutes.
const FORECAST_TTL_MS = 30 * 60 * 1000;

type CacheEntry<T> = { value: T; expires: number };
const forecastCache = new Map<string, CacheEntry<DistrictForecast | null>>();

function pointFor(district: string): { lat: number; lon: number } | null {
  const record = (centroids as Record<string, { lat: number; lon: number }>)[district];
  return record ?? null;
}

// The published record of a district, as it ships with the app.
function climateFor(district: string): DistrictClimate | null {
  const record = (
    climateRecord as Record<string, Omit<DistrictClimate, "district" | "note">>
  )[district];
  if (!record) return null;
  return {
    ...record,
    district,
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

  try {
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
  } catch (error) {
    console.error("[weather] forecast request error", district, error);
    return null;
  }
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
  const forecast = await cached(forecastCache, district, FORECAST_TTL_MS, () =>
    fetchForecast(district),
  );
  return { district, climate: climateFor(district), forecast };
}
