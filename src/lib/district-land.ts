import Papa from "papaparse";
import { DISTRICTS } from "@/lib/api";

export type DistrictLand = { district: string; crops_ha: number; pasture_ha: number; fallow_ha: number };
export type LandCategory = "crops_ha" | "pasture_ha" | "fallow_ha";
export const LAND_CATEGORIES: { key: LandCategory; label: string; color: string }[] = [
  { key: "crops_ha", label: "Crops", color: "var(--chart-1)" },
  { key: "pasture_ha", label: "Pasture", color: "var(--chart-3)" },
  { key: "fallow_ha", label: "Fallow", color: "var(--chart-4)" },
];

export function landShare(row: DistrictLand, category: LandCategory): number | null {
  const total = row.crops_ha + row.pasture_ha + row.fallow_ha;
  return total > 0 ? row[category] / total : null;
}

export function parseDistrictLand(csv: string): DistrictLand[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase() });
  const required = ["district", ...LAND_CATEGORIES.map((c) => c.key)];
  if (parsed.errors.length || !required.every((h) => parsed.meta.fields?.includes(h))) {
    throw new Error("Required CSV columns: district, crops_ha, pasture_ha, fallow_ha.");
  }
  if (!parsed.data.length || parsed.data.length > 30) throw new Error("Provide one row per district, up to 30 districts.");
  const seen = new Set<string>();
  return parsed.data.map((row, index) => {
    const district = DISTRICTS.find((d) => d.toLowerCase() === row["district"]?.trim().toLowerCase());
    if (!district || seen.has(district)) throw new Error(`Row ${index + 2}: unknown or duplicate district.`);
    seen.add(district);
    const values = LAND_CATEGORIES.map(({ key }) => {
      const raw = row[key]?.trim();
      const value = raw ? Number(raw) : NaN;
      if (!Number.isFinite(value) || value < 0) throw new Error(`Row ${index + 2}: ${key} must be a nonnegative number of hectares.`);
      return value;
    });
    return { district, crops_ha: values[0] ?? 0, pasture_ha: values[1] ?? 0, fallow_ha: values[2] ?? 0 };
  });
}