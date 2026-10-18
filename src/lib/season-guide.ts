import { z } from "zod";
import { DISTRICTS } from "./api";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const seasonInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value), "Choose a district."),
  month: z.number().int().min(1).max(12),
  language: z.enum(["en", "rw"]).default("en"),
});

export function getSeasonGuide(month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Choose a valid month.");
  const farming = month === 9 ? "Seasons A & C" : month >= 10 || month <= 2 ? "Season A" : month <= 6 ? "Season B" : "Season C";
  const period = month === 9 ? "A starts; C ends" : farming === "Season A" ? "September–February" : farming === "Season B" ? "March–June" : "July–September";
  const climate = month >= 3 && month <= 5
    ? { name: "Long rainy season", local: "Itumba", rain: "Wetter period", note: "March–May is a usual rainy period. Rainfall varies considerably by place and year." }
    : month >= 10 && month <= 12
      ? { name: "Short rainy season", local: "Umuhindo", rain: "Wetter period", note: "October–December is a usual rainy period; onset and amounts vary by location." }
      : month === 9
        ? { name: "Transition toward short rains", local: "Toward Umuhindo", rain: "Variable", note: "September overlaps agricultural Seasons A and C. Wait for locally confirmed rain before rain-fed planting." }
      : month <= 2
        ? { name: "Short dry season", local: "Urugaryi", rain: "Drier / variable", note: "A drier break; occasional rain is still possible." }
        : { name: "Long dry season", local: "Impeshyi", rain: "Drier period", note: "Usually a dry period; rain-fed planting is risky without reliable water." };
  return { farming, period, ...climate };
}