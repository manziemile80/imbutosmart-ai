import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { useField } from "@/lib/field";
import { farmerCopy } from "@/lib/farmer-language";

// One menu owns the field: the Farmer page has the district, soil and season
// controls. Every other page points back to it instead of repeating them, so
// the farmer never has two copies of the same field to keep in step.
export function FieldLink() {
  const { language } = useField();
  const t = farmerCopy[language];
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-muted-foreground">
      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{t.fieldFrom}</span>
      <Link to="/" className="font-medium text-primary-text underline-offset-4 hover:underline">
        {t.changeField}
      </Link>
    </p>
  );
}
