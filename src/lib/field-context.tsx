import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_FIELD,
  FieldContext,
  readStoredField,
  storeField,
  type FieldContextValue,
  type FarmerField,
} from "./field";

// Holds the farmer's field for the whole app, so the summary in the header
// follows the district and soil the farmer chose on any page.

export function FieldProvider({ children }: { children: ReactNode }) {
  const [field, setFieldState] = useState<FarmerField>(DEFAULT_FIELD);

  // The stored choice is read after the first render, so the page the server
  // sends and the page the browser builds are the same.
  useEffect(() => {
    const stored = readStoredField();
    if (stored) setFieldState(stored);
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
    }),
    [field],
  );

  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}
