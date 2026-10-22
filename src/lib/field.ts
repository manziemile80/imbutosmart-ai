import { createContext, useContext } from "react";

import { seasonForMonth } from "./weather";

// The farmer's field, shared by every page: the district, the soil and the
// season they are working with. The header summary, the Advice page and the
// Guidance page all read it, so the farmer sets the field once and the
// summary follows them.

export type FarmerField = {
  district: string;
  soil: string;
  season: "A" | "B" | "C" | null;
};

export const FIELD_STORAGE_KEY = "imbutosmart-field";

// The season the farmer is in, unless they choose another one.
export const DEFAULT_FIELD: FarmerField = {
  district: "Musanze",
  soil: "Volcanic",
  season: seasonForMonth(new Date().getMonth() + 1),
};

export type FieldContextValue = {
  field: FarmerField;
  setField: (field: Partial<FarmerField>) => void;
};

export const FieldContext = createContext<FieldContextValue | null>(null);

export function useField(): FieldContextValue {
  const value = useContext(FieldContext);
  if (!value) throw new Error("useField must be used inside the FieldProvider.");
  return value;
}

export function readStoredField(): FarmerField | null {
  try {
    const raw = window.localStorage.getItem(FIELD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FarmerField>;
    if (typeof parsed.district !== "string" || typeof parsed.soil !== "string") return null;
    return {
      district: parsed.district,
      soil: parsed.soil,
      season:
        parsed.season === "A" || parsed.season === "B" || parsed.season === "C"
          ? parsed.season
          : null,
    };
  } catch {
    return null;
  }
}

export function storeField(field: FarmerField) {
  try {
    window.localStorage.setItem(FIELD_STORAGE_KEY, JSON.stringify(field));
  } catch {
    // A browser that blocks storage still keeps the choice for the visit.
  }
}
