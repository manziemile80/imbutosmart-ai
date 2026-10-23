import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSeasonWeather } from "@/hooks/use-season-weather";
import { CLIMATE_MONTHS, type DistrictClimate } from "@/lib/weather";

// The district record ships with every month; the hook only reads it.
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

describe("season figures on the farmer page", () => {
  it("fills rain and temperature from the district and the chosen season", () => {
    const { result } = renderHook(() => useSeasonWeather(climate, "B", 4));

    // Season B is four months of 100 mm in this record.
    expect(result.current.rain).toBe("400");
    expect(result.current.temp).toBe("18.0");
    expect(result.current.rainEdited).toBe(false);
    expect(result.current.tempEdited).toBe(false);
  });

  it("follows a new season while both figures are still the record's", () => {
    const { result, rerender } = renderHook(
      ({ season }: { season: "A" | "B" | "C" }) => useSeasonWeather(climate, season, 4),
      { initialProps: { season: "B" as "A" | "B" | "C" } },
    );

    rerender({ season: "A" });

    // Season A is six months of 100 mm.
    expect(result.current.rain).toBe("600");
    expect(result.current.temp).toBe("18.0");
  });

  it("keeps a figure the farmer typed when the season changes", () => {
    const { result, rerender } = renderHook(
      ({ season }: { season: "A" | "B" | "C" }) => useSeasonWeather(climate, season, 4),
      { initialProps: { season: "B" as "A" | "B" | "C" } },
    );

    act(() => result.current.setTemp("25"));
    rerender({ season: "A" });

    // The typed temperature stays; only the rain it did not touch follows.
    expect(result.current.temp).toBe("25");
    expect(result.current.tempEdited).toBe(true);
    expect(result.current.rain).toBe("600");
  });

  it("hands both figures back to the district record", () => {
    const { result } = renderHook(() => useSeasonWeather(climate, "B", 4));

    act(() => {
      result.current.setRain("999");
      result.current.setTemp("30");
    });
    expect(result.current.rain).toBe("999");
    expect(result.current.temp).toBe("30");

    act(() => result.current.useDistrictFigures());
    expect(result.current.rain).toBe("400");
    expect(result.current.temp).toBe("18.0");
  });

  it("leaves the figures empty when the record is unavailable", () => {
    const { result } = renderHook(() => useSeasonWeather(null, "B", 4));

    expect(result.current.rain).toBe("");
    expect(result.current.temp).toBe("");
  });
});
