import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { insuranceCopy } from "@/lib/insurance-language";
import { soilLabel, type FarmerLanguage } from "@/lib/farmer-language";

export function InsuranceGuidance({ district, soil, language }: { district: string; soil: string; language: FarmerLanguage }) {
  const [expanded, setExpanded] = useState(false);
  const t = insuranceCopy[language];
  return (
    <section aria-labelledby="insurance-title" className="border-y border-border py-5" data-testid="insurance-guidance">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary-text" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="insurance-title" className="text-lg font-semibold">{t.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t.context}: {district} · {soilLabel(soil, language)}</p>
        </div>
      </div>
      <p className="mt-4 font-medium text-primary-text">{t.suggested}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.summary}</p>
      <Button type="button" variant="outline" className="mt-4 h-auto min-h-10 w-full whitespace-normal text-left" aria-expanded={expanded} aria-controls="insurance-checklist" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronUp /> : <ChevronDown />}{expanded ? t.hide : t.compare}
      </Button>
      {expanded && <div id="insurance-checklist" className="mt-4">
        <ul className="space-y-3">{t.checklist.map((item) => <li key={item} className="flex items-start gap-2 text-sm leading-relaxed"><Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary-text" /><span>{item}</span></li>)}</ul>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.damage}</p>
      </div>}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm leading-relaxed">{t.program}</p>
        <Button asChild variant="link" className="mt-1 h-auto min-h-9 whitespace-normal px-0 text-primary-text"><a href="https://www.minagri.gov.rw/national-agriculture-insurance-scheme" target="_blank" rel="noreferrer">{t.source}<ExternalLink /></a></Button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t.disclaimer}</p>
    </section>
  );
}