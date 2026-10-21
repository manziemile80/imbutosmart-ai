import { describe, expect, it } from "vitest";

import {
  CLIMATE_MONTHS,
  forecastSummary,
  monthTempC,
  seasonForMonth,
  seasonRainMm,
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

  it("summarises the coming week", () => {
    const forecast: DistrictForecast = {
      district: "Musanze",
      days: [
        { date: "2026-10-21", rainMm: 3, tempMinC: 14, tempMaxC: 24 },
        { date: "2026-10-22", rainMm: 7, tempMinC: 13, tempMaxC: 22 },
      ],
      source: "Open-Meteo",
      sourceUrl: "https://open-meteo.com/",
      issuedAt: "2026-10-21T00:00:00.000Z",
    };
    expect(forecastSummary(forecast)).toEqual({ rainMm: 10, tempMinC: 13, tempMaxC: 24 });
  });
});
