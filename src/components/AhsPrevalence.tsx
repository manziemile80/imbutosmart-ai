import {
  AHS_SOURCE,
  RSAS_METHODOLOGY,
  ahsCopy,
  ahsSeasonRanking,
  monthToAhsSeason,
} from "@/lib/ahs-crops";
import { cropLabel, type FarmerLanguage } from "@/lib/farmer-language";
import { BarChart3 } from "lucide-react";

// Shows how widespread each crop was among farming households nationally for the
// selected agricultural season, using NISR AHS 2024 Table 16. These are survey
// observations — not yields, probabilities, or guarantees — and the report
// publishes no district breakdown, so nothing here is per district. Where the
// report says "na" the season simply has no figure and the crop is omitted.
export function AhsPrevalence({
  month,
  language,
  seasonLabel,
}: {
  month: number;
  language: FarmerLanguage;
  seasonLabel: string;
}) {
  const t = ahsCopy[language];
  const season = monthToAhsSeason(month);

  return (
    <section
      aria-labelledby="ahs-prevalence-title"
      className="mt-6 rounded-xl border border-border bg-muted/40 p-4"
    >
      <div className="flex items-center gap-2 text-primary-text">
        <BarChart3 className="size-4" aria-hidden="true" />
        <h3 id="ahs-prevalence-title" className="text-sm font-semibold text-foreground">
          {t.title}
        </h3>
      </div>
      {season === null ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.transition}</p>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t.seasonNote.replace("{season}", seasonLabel)}
          </p>
          <ul className="mt-3 grid gap-1.5">
            {ahsSeasonRanking(season).map(({ crop, share }) => (
              <li key={crop} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-foreground">{cropLabel(crop, language)}</span>
                <span className="tabular text-muted-foreground">{share.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t.note}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {t.methodology} ({RSAS_METHODOLOGY.survey}, {RSAS_METHODOLOGY.archive}.)
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t.source}: {AHS_SOURCE.citation} ({AHS_SOURCE.published}).
      </p>
    </section>
  );
}
