import { Package, ShieldCheck, Sprout } from "lucide-react";

import { knowledgeCropLabel } from "@/lib/crop-knowledge";
import { summaryCopy, type PlanSummary } from "@/lib/plan-summary";
import type { FarmerLanguage } from "@/lib/farmer-language";

// The four parts of the farmer's overview. Used by the Summary get page, so the
// wording is the same wherever the farmer meets the summary.

export function PlanSummaryBody({
  summary,
  language = "en",
}: {
  summary: PlanSummary;
  language?: FarmerLanguage;
}) {
  const t = summaryCopy[language];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sprout className="size-4 text-primary-text" aria-hidden="true" />
          {t.crops}
        </h3>
        <ul className="mt-2 grid gap-1 text-sm">
          {summary.crops.map((crop) => (
            <li key={crop.crop} className="flex justify-between gap-3">
              <span className="text-foreground">{knowledgeCropLabel(crop.crop, language)}</span>
              <span className="tabular text-muted-foreground">{crop.score}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Package className="size-4 text-primary-text" aria-hidden="true" />
          {t.inputs}
        </h3>
        {summary.inputs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t.noInputs}</p>
        ) : (
          <ul className="mt-2 grid gap-2 text-sm">
            {summary.inputs.map((input) => (
              <li key={input.name}>
                <span className="flex justify-between gap-3">
                  <span className="text-foreground">{input.name}</span>
                  <span className="tabular text-muted-foreground">
                    {Math.round(input.share * 100)}%
                  </span>
                </span>
                {input.rateKgPerHa ? (
                  <span className="text-xs text-muted-foreground">
                    {t.rate.replace("{n}", String(Math.round(input.rateKgPerHa)))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-primary-text" aria-hidden="true" />
          {t.insurance}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.insuranceNote}</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground">{t.advice}</h3>
        <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed text-muted-foreground">
          {summary.advice.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
