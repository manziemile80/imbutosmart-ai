import { z } from "zod";

export const API_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

export type Prediction = {
  recommended_crop: string;
  confidence: number;
  expected_yield_t_ha: number;
  /** Farm observations behind the recommendation, when it comes from the trained model. */
  observations?: number;
  alternatives: {
    crop: string;
    success_probability: number;
    expected_yield_t_ha: number;
    observations?: number;
  }[];
};

export type Stats = {
  by_crop: { crop: string; actual: number; predicted: number; n: number }[];
  by_period: { period: string; actual: number; predicted: number }[];
  metrics: {
    rows?: number;
    districts?: number;
    crops?: number;
    seasons?: number;
    failures?: number;
    test_accuracy?: number | null;
    test_r2?: number | null;
    test_mae_t_ha?: number | null;
    test_auc?: number | null;
  };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL)
    throw new Error("The prediction server is not connected yet (VITE_API_URL is not set).");
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}

export const predict = async (body: {
  district: string;
  soil_type: string;
  season: "A" | "B" | "C" | null;
  forecast_rain_mm: number;
  forecast_temp_c: number;
}): Promise<Prediction> => {
  body = predictionInputSchema.parse(body);
  // Without a season - September belongs to two - the general estimate is
  // used, because the trained model works on one season at a time.
  if (!API_URL || !body.season) {
    const { localPredict } = await import("./local-model");
    return localPredict(body);
  }
  // The trained model works from the district, the season and the weather. The
  // soil the farmer reports feeds the agronomic suitability engine instead.
  return call<Prediction>("/predict", {
    method: "POST",
    body: JSON.stringify({
      district: body.district,
      season: body.season,
      forecast_rain_mm: body.forecast_rain_mm,
      forecast_temp_c: body.forecast_temp_c,
    }),
  });
};

export const getStats = () => call<Stats>("/stats");

export const DISTRICTS = [
  "Bugesera",
  "Burera",
  "Gakenke",
  "Gasabo",
  "Gatsibo",
  "Gicumbi",
  "Gisagara",
  "Huye",
  "Kamonyi",
  "Karongi",
  "Kayonza",
  "Kicukiro",
  "Kirehe",
  "Muhanga",
  "Musanze",
  "Ngoma",
  "Ngororero",
  "Nyabihu",
  "Nyagatare",
  "Nyamagabe",
  "Nyamasheke",
  "Nyanza",
  "Nyarugenge",
  "Nyaruguru",
  "Rubavu",
  "Ruhango",
  "Rulindo",
  "Rusizi",
  "Rutsiro",
  "Rwamagana",
];
export const SOILS = ["Volcanic", "Clay", "Loam", "Sandy", "Laterite", "Humic"];

export const predictionInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value)),
  soil_type: z.string().refine((value) => SOILS.includes(value)),
  season: z.enum(["A", "B", "C"]).nullable(),
  forecast_rain_mm: z.number().finite().min(0).max(5000),
  forecast_temp_c: z.number().finite().min(-5).max(45),
});
