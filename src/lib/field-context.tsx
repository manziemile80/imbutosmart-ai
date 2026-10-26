import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_FIELD,
  FieldContext,
  readStoredField,
  readStoredLanguage,
  storeField,
  storeLanguage,
  type FieldContextValue,
  type FarmerField,
} from "./field";
import type { FarmerLanguage } from "./farmer-language";

// Holds the farmer's field and language for the whole app, so the announcements
// in the header follow the district and soil the farmer chose on any page, and
// every menu speaks the language chosen once in the header.

export function FieldProvider({ children }: { children: ReactNode }) {
  const [field, setFieldState] = useState<FarmerField>(DEFAULT_FIELD);
  const [language, setLanguageState] = useState<FarmerLanguage>("en");

  // The stored choices are read after the first render, so the page the server
  // sends and the page the browser builds are the same.
  useEffect(() => {
    const storedField = readStoredField();
    if (storedField) setFieldState(storedField);
    const storedLanguage = readStoredLanguage();
    if (storedLanguage) setLanguageState(storedLanguage);
  }, []);

  const value = useMemo<FieldContextValue>(
    () => ({
      field,
      setField: (update) =>
        setFieldState((current) => {
          const next = { ...current, ...update };
          storeField(next);
          return next;
        }),
      language,
      setLanguage: (next) => {
        setLanguageState(next);
        storeLanguage(next);
      },
    }),
    [field, language],
  );

  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}
