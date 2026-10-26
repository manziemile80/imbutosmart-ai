import { createContext, useContext } from "react";

import { seasonForMonth } from "./weather";
import type { FarmerLanguage } from "./farmer-language";

// The farmer's field, shared by every page: the district, the soil and the
// season they are working with. The header bell, the Advice page and the
// Guidance page all read it, so the farmer sets the field once on the Farmer
// page and every menu follows them.

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
  language: FarmerLanguage;
  setLanguage: (language: FarmerLanguage) => void;
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

// The language belongs to the app, not to one page: the header chooses it once
// and every menu reads the same value. It is kept for the next visit.
export const LANGUAGE_STORAGE_KEY = "imbutosmart-language";

export function readStoredLanguage(): FarmerLanguage | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "en" || stored === "rw" || stored === "fr" ? stored : null;
  } catch {
    return null;
  }
}

export function storeLanguage(language: FarmerLanguage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Nothing to do: the page still speaks the language chosen for this visit.
  }
}
