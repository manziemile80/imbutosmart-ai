import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, ExternalLink, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
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
    <Panel aria-labelledby="insurance-title" data-testid="insurance-guidance">
      <PanelHeader
        icon={<ShieldCheck className="size-5" aria-hidden="true" />}
        title={t.title}
        titleId="insurance-title"
        description={`${t.context}: ${district} · ${soilLabel(soil, language)}`}
      />
      <PanelBody>
        <p className="font-medium text-primary-text">{t.suggested}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.summary}</p>

        <fieldset className="mt-6">
          <legend className="font-semibold text-foreground">{c.title}</legend>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.note}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {COVERAGE_TYPES.map((type) => {
              const isSelected = selected.includes(type);
              return (
                <label
                  key={type}
                  className={cn("option-card", isSelected && "option-card-selected")}
                >
                  <Checkbox
                    className="mt-1 shrink-0"
                    checked={isSelected}
                    onCheckedChange={() => setSelected((current) => toggleCoverage(current, type))}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {c.choices[type].label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {c.choices[type].detail}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/50 p-4" role="status">
            <p className="text-sm font-medium text-foreground">{c.selected}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {selected.length
                ? selected.map((type) => c.choices[type].label).join(" · ")
                : c.empty}
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
          className="mt-5 h-auto min-h-11 w-full justify-between gap-3 whitespace-normal text-left"
          aria-expanded={expanded}
          aria-controls="insurance-checklist"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="flex items-center gap-2">
            {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            {expanded ? t.hide : t.compare}
          </span>
        </Button>

        {expanded && (
          <div id="insurance-checklist" className="mt-4">
            <ul className="grid gap-3">
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

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm leading-relaxed text-foreground">{t.program}</p>
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

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t.disclaimer}
        </p>
      </PanelBody>
    </Panel>
  );
}
