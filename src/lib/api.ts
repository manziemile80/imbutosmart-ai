export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export type Prediction = {
  recommended_crop: string;
  confidence: number;
  expected_yield_t_ha: number;
  alternatives: { crop: string; success_probability: number; expected_yield_t_ha: number }[];
};

export type Stats = {
  by_crop: { crop: string; actual: number; predicted: number; n: number }[];
  by_period: { period: string; actual: number; predicted: number }[];
  metrics: { rows?: number; test_accuracy?: number | null; test_r2?: number | null; test_mae_t_ha?: number | null; test_auc?: number | null };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error("The prediction server is not connected yet (VITE_API_URL is not set).");
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

export const predict = (body: {
  district: string;
  soil_type: string;
  forecast_rain_mm: number;
  forecast_temp_c: number;
}) => call<Prediction>("/predict", { method: "POST", body: JSON.stringify(body) });

export const getStats = () => call<Stats>("/stats");

export const DISTRICTS = [
  "Bugesera","Burera","Gakenke","Gasabo","Gatsibo","Gicumbi","Gisagara","Huye","Kamonyi","Karongi",
  "Kayonza","Kicukiro","Kirehe","Muhanga","Musanze","Ngoma","Ngororero","Nyabihu","Nyagatare","Nyamagabe",
  "Nyamasheke","Nyanza","Nyarugenge","Nyaruguru","Rubavu","Ruhango","Rulindo","Rusizi","Rutsiro","Rwamagana",
];
export const SOILS = ["Volcanic", "Clay", "Loam", "Sandy", "Laterite", "Humic"];
