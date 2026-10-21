import { useEffect, useState } from "react";
import { predict, predictionInputSchema, type Prediction } from "@/lib/api";

// The estimate follows the field details: the district, the soil, the season
// and the weather the farmer entered. A request that is still running is
// replaced by the next one, so the card never shows a stale answer.
export function useAutoPrediction(
  district: string,
  soil: string,
  rain: string,
  temp: string,
  season: "A" | "B" | "C" | null,
) {
  const [state, setState] = useState<{
    result: Prediction | null;
    loading: boolean;
    error: "invalid" | "failed" | null;
  }>({ result: null, loading: false, error: null });

  useEffect(() => {
    let active = true;
    const input = predictionInputSchema.safeParse({
      district,
      soil_type: soil,
      season,
      forecast_rain_mm: rain.trim() ? Number(rain) : NaN,
      forecast_temp_c: temp.trim() ? Number(temp) : NaN,
    });
    if (!input.success) {
      setState({ result: null, loading: false, error: "invalid" });
      return;
    }
    setState({ result: null, loading: true, error: null });
    const timer = setTimeout(() => {
      predict(input.data)
        .then((result) => {
          if (active) setState({ result, loading: false, error: null });
        })
        .catch(() => {
          if (active) setState({ result: null, loading: false, error: "failed" });
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [district, soil, rain, temp, season]);

  return state;
}
