import centroids from "@/lib/district-centroids.json";
import climateRecord from "@/lib/district-climate.json";
import {
  CLIMATE_MONTHS,
  isWetWeather,
  rainWindowFrom,
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

const FORECAST_URL = (
  process.env["WEATHER_FORECAST_URL"] ?? "https://api.open-meteo.com/v1/forecast"
).replace(/\/+$/, "");
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
  const record = (climateRecord as Record<string, Omit<DistrictClimate, "district" | "note">>)[
    district
  ];
  if (!record) return null;
  return {
    ...record,
    district,
    note: "Climate normals on a 50 km grid, so nearby districts share a figure.",
  };
}

// The published climate record of a district, for the server functions that
// need it.
export async function getDistrictClimate(district: string): Promise<DistrictClimate | null> {
  return climateFor(district);
}

async function fetchForecast(district: string): Promise<DistrictForecast | null> {
  const point = pointFor(district);
  if (!point) return null;

  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(point.lat));
  url.searchParams.set("longitude", String(point.lon));
  // The hourly series says when it will rain and what the sky will be like,
  // which is what a farmer needs; the daily series carries the day's total.
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation,precipitation_probability,weather_code",
  );
  url.searchParams.set(
    "daily",
    "precipitation_sum,temperature_2m_max,temperature_2m_min,weather_code",
  );
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
        weather_code?: (number | null)[];
      };
      hourly?: {
        time?: string[];
        temperature_2m?: (number | null)[];
        precipitation?: (number | null)[];
        precipitation_probability?: (number | null)[];
        weather_code?: (number | null)[];
      };
    };
    const times = payload.daily?.time;
    if (!times?.length) {
      console.error("[weather] forecast response had no days", district);
      return null;
    }

    // The hours of each day, so the rain window and the sky can be named.
    const hoursByDay = new Map<
      string,
      { time: string; chanceOfRain: number; code: number | null }[]
    >();
    for (const [index, time] of (payload.hourly?.time ?? []).entries()) {
      const day = time.slice(0, 10);
      const hours = hoursByDay.get(day) ?? [];
      hours.push({
        time,
        chanceOfRain: payload.hourly?.precipitation_probability?.[index] ?? 0,
        code: payload.hourly?.weather_code?.[index] ?? null,
      });
      hoursByDay.set(day, hours);
    }

    const days: ForecastDay[] = times.map((date, index) => {
      const hours = hoursByDay.get(date) ?? [];
      const temperatures = (payload.hourly?.time ?? [])
        .map((time, hourIndex) => ({ time, value: payload.hourly?.temperature_2m?.[hourIndex] }))
        .filter((entry) => entry.time.startsWith(date) && entry.value != null)
        .map((entry) => entry.value as number);
      // The hours the sky itself reports rain, with the forecast's chance as a
      // second signal.
      const wet = hours.filter((hour) => isWetWeather(hour.code) || hour.chanceOfRain >= 50);
      return {
        date,
        rainMm: payload.daily?.precipitation_sum?.[index] ?? 0,
        tempMinC:
          temperatures.length > 0
            ? Math.min(...temperatures)
            : (payload.daily?.temperature_2m_min?.[index] ?? 0),
        tempMaxC:
          temperatures.length > 0
            ? Math.max(...temperatures)
            : (payload.daily?.temperature_2m_max?.[index] ?? 0),
        maxChanceOfRain: hours.length > 0 ? Math.max(...hours.map((hour) => hour.chanceOfRain)) : 0,
        rainWindow: rainWindowFrom(wet.map((hour) => ({ time: hour.time, chanceOfRain: 100 }))),
        weatherCode: payload.daily?.weather_code?.[index] ?? hours[0]?.code ?? null,
      };
    });

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
