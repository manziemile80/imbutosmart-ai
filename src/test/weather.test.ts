import { describe, expect, it } from "vitest";

import {
  CLIMATE_MONTHS,
  rainWindowFrom,
  isWetWeather,
  weatherCodeLabel,
  forecastSummary,
  monthTempC,
  seasonFigures,
  seasonForMonth,
  seasonRainMm,
  seasonTempC,
  SEASON_MONTHS,
  type DistrictClimate,
  type DistrictForecast,
} from "@/lib/weather";

const climate: DistrictClimate = {
  district: "Musanze",
  months: Object.fromEntries(
    CLIMATE_MONTHS.map((month) => [month, { rainMm: 100, tempC: 18 }]),
  ) as DistrictClimate["months"],
  annualRainMm: 1200,
  period: "2001-2020",
  source: "NASA POWER (MERRA-2)",
  sourceUrl: "https://power.larc.nasa.gov/",
  note: "Climate normals on a 50 km grid.",
};

describe("district weather", () => {
  it("knows the agricultural season of every month", () => {
    expect(seasonForMonth(10)).toBe("A");
    expect(seasonForMonth(2)).toBe("A");
    expect(seasonForMonth(3)).toBe("B");
    expect(seasonForMonth(6)).toBe("B");
    expect(seasonForMonth(7)).toBe("C");
    expect(seasonForMonth(8)).toBe("C");
    // September belongs to two seasons, so no season is chosen for it.
    expect(seasonForMonth(9)).toBeNull();
  });

  it("adds up the rainfall of a season", () => {
    expect(SEASON_MONTHS.A).toHaveLength(6);
    expect(seasonRainMm(climate, "A")).toBe(600);
    expect(seasonRainMm(climate, "B")).toBe(400);
    expect(seasonRainMm(climate, "C")).toBe(300);
  });

  it("reads the usual temperature of a month", () => {
    expect(monthTempC(climate, 4)).toBe(18);
    expect(monthTempC(climate, 13)).toBe(18);
  });

  it("reads the usual temperature of a season", () => {
    expect(seasonTempC(climate, "A")).toBe(18);
    expect(seasonTempC(climate, null)).toBeNull();
  });

  it("fills the rain and temperature of the chosen season from the record", () => {
    expect(seasonFigures(climate, "B", 4)).toEqual({ rainMm: 400, tempC: 18 });
    // September belongs to two seasons: no seasonal rain, but the month's
    // temperature is still known.
    expect(seasonFigures(climate, null, 9)).toEqual({ rainMm: null, tempC: 18 });
  });

  it("summarises the coming week", () => {
    const forecast: DistrictForecast = {
      district: "Musanze",
      days: [
        {
          date: "2026-10-21",
          rainMm: 3,
          tempMinC: 14,
          tempMaxC: 24,
          maxChanceOfRain: 90,
          rainWindow: { from: "13:00", to: "17:00" },
          weatherCode: 61,
        },
        {
          date: "2026-10-22",
          rainMm: 7,
          tempMinC: 13,
          tempMaxC: 22,
          maxChanceOfRain: 20,
          rainWindow: null,
          weatherCode: 0,
        },
      ],
      source: "Open-Meteo",
      sourceUrl: "https://open-meteo.com/",
      issuedAt: "2026-10-21T00:00:00.000Z",
    };
    expect(forecastSummary(forecast)).toEqual({ rainMm: 10, tempMinC: 13, tempMaxC: 24 });
  });

  it("names the hours rain is likely", () => {
    const hours = [
      { time: "2026-10-23T09:00", chanceOfRain: 10 },
      { time: "2026-10-23T13:00", chanceOfRain: 60 },
      { time: "2026-10-23T15:00", chanceOfRain: 98 },
      { time: "2026-10-23T18:00", chanceOfRain: 30 },
    ];
    expect(rainWindowFrom(hours)).toEqual({ from: "13:00", to: "15:00" });
    expect(rainWindowFrom([{ time: "2026-10-23T09:00", chanceOfRain: 5 }])).toBeNull();
  });

  it("names the weather code in the farmer's language", () => {
    expect(weatherCodeLabel(0, "en")).toBe("Clear sky");
    expect(weatherCodeLabel(61, "en")).toBe("Slight rain");
    expect(weatherCodeLabel(95, "en")).toBe("Thunderstorm");
    expect(weatherCodeLabel(2, "fr")).toBe("Partiellement nuageux");
    expect(weatherCodeLabel(2, "rw")).toBeTruthy();
    expect(weatherCodeLabel(999, "en")).toBeNull();
    expect(weatherCodeLabel(null, "en")).toBeNull();
  });

  it("knows which codes mean wet weather", () => {
    expect(isWetWeather(61)).toBe(true);
    expect(isWetWeather(80)).toBe(true);
    expect(isWetWeather(95)).toBe(true);
    expect(isWetWeather(3)).toBe(false);
    expect(isWetWeather(0)).toBe(false);
  });
});
