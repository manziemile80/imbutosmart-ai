import { z } from "zod";
import { DISTRICTS } from "./api";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const seasonInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value), "Choose a district."),
  month: z.number().int().min(1).max(12),
});

export function getSeasonGuide(month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Choose a valid month.");
  const farming = month >= 9 || month <= 2 ? "Season A" : month <= 6 ? "Season B" : "Season C";
  const period = farming === "Season A" ? "September–February" : farming === "Season B" ? "March–June" : "July–August";
  const climate = month >= 3 && month <= 5
    ? { name: "Long rainy season", local: "Itumba", rain: "High", note: "Usually the wetter rainy period; rainfall often peaks around April." }
    : month >= 9 && month <= 12
      ? { name: "Short rainy season", local: "Umuhindo", rain: "Moderate to high", note: "Rains usually return around September; onset and amounts vary by location." }
      : month <= 2
        ? { name: "Short dry season", local: "Urugaryi", rain: "Low / variable", note: "A drier break; occasional rain is still possible." }
        : { name: "Long dry season", local: "Impeshyi", rain: "Low", note: "Usually the driest period; rain-fed planting is risky without reliable water." };
  return { farming, period, ...climate };
}