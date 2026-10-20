import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  COVERAGE_TYPES,
  coverageCopy,
  toggleCoverage,
  type CoverageType,
} from "@/lib/insurance-coverage";
import { INSURANCE_PROGRAM_URL, insuranceCopy } from "@/lib/insurance-language";
import { soilLabel, type FarmerLanguage } from "@/lib/farmer-language";

export function InsuranceGuidance({
  district,
  soil,
  language,
}: {
  district: string;
  soil: string;
  language: FarmerLanguage;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<CoverageType[]>([]);
  const t = insuranceCopy[language];
  const c = coverageCopy[language];
  return (
    <section
      aria-labelledby="insurance-title"
      className="border-y border-border py-5"
      data-testid="insurance-guidance"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary-text" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="insurance-title" className="text-lg font-semibold">
            {t.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.context}: {district} · {soilLabel(soil, language)}
          </p>
        </div>
      </div>
      <p className="mt-4 font-medium text-primary-text">{t.suggested}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.summary}</p>
      <fieldset className="mt-5">
        <legend className="font-semibold">{c.title}</legend>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.note}</p>
        <div className="mt-4 grid gap-3">
          {COVERAGE_TYPES.map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${selected.includes(type) ? "border-primary bg-accent" : "border-border bg-card"}`}
            >
              <Checkbox
                className="mt-1 shrink-0"
                checked={selected.includes(type)}
                onCheckedChange={() => setSelected((current) => toggleCoverage(current, type))}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{c.choices[type].label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {c.choices[type].detail}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 border-l-2 border-primary pl-3" role="status">
          <p className="text-sm font-medium">{c.selected}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {selected.length ? selected.map((type) => c.choices[type].label).join(" · ") : c.empty}
          </p>
        </div>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="mt-2 text-primary-text"
            onClick={() => setSelected([])}
          >
            {c.clear}
          </Button>
        )}
      </fieldset>
      <Button
        type="button"
        variant="outline"
        className="mt-4 h-auto min-h-10 w-full whitespace-normal text-left"
        aria-expanded={expanded}
        aria-controls="insurance-checklist"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp /> : <ChevronDown />}
        {expanded ? t.hide : t.compare}
      </Button>
      {expanded && (
        <div id="insurance-checklist" className="mt-4">
          <ul className="space-y-3">
            {t.checklist.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary-text" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.damage}</p>
        </div>
      )}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm leading-relaxed">{t.program}</p>
        <Button
          asChild
          variant="outline"
          className="mt-3 h-auto min-h-11 w-full justify-between gap-3 whitespace-normal px-4 py-3 text-left"
        >
          <a href={INSURANCE_PROGRAM_URL} target="_blank" rel="noopener noreferrer">
            <span className="grid gap-0.5">
              <span className="font-medium">{t.source}</span>
              <span className="text-xs font-normal text-muted-foreground">{t.sourceHint}</span>
            </span>
            <ExternalLink className="shrink-0" aria-hidden="true" />
          </a>
        </Button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t.disclaimer}</p>
    </section>
  );
}
