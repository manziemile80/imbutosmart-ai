import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlanSummaryBody } from "@/components/PlanSummaryBody";
import { useField } from "@/lib/field";
import { buildPlanSummary } from "@/lib/plan-summary";
import { summaryCopy } from "@/lib/plan-summary";
import { engineInput } from "@/lib/recommendation";
import { recommendOffline } from "@/lib/recommendation-engine";
import { districtInputs } from "@/lib/advice";
import { seasonForMonth, seasonRainMm, seasonTempC } from "@/lib/weather";
import { useDistrictWeather } from "@/hooks/use-district-weather";
import type { FarmerLanguage } from "@/lib/farmer-language";

// The farmer's summary, in the header: the bell opens it. It follows the
// district, soil and season the farmer has chosen anywhere in the app.
export function PlanSummaryMenu({ language = "en" }: { language?: FarmerLanguage }) {
  const { field } = useField();
  const { district, soil, season } = field;
  const t = summaryCopy[language];
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const { weather } = useDistrictWeather(district);
  const climate = weather?.climate ?? null;
  const profile = districtInputs[district] ?? null;

  const rainMm = climate && season ? seasonRainMm(climate, season) : null;
  const tempC = climate && season ? seasonTempC(climate, season) : null;

  const summary = useMemo(() => {
    const crops = recommendOffline(
      engineInput({ district, soil, language, season, rainfallMm: rainMm, temperatureC: tempC }),
    );
    return buildPlanSummary({
      district,
      soil,
      season,
      crops: [crops.primary, ...crops.alternatives].slice(0, 3).map((crop) => ({
        crop: crop.crop,
        score: crop.score,
      })),
      profile: profile ?? null,
      climate: rainMm != null && tempC != null ? { rainMm, tempC } : null,
      language,
    });
  }, [district, soil, season, rainMm, tempC, profile, language]);

  // The panel closes when the farmer clicks away from it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapper}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={t.title}
        aria-expanded={open}
        title={t.title}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <BellRing aria-hidden="true" /> : <Bell aria-hidden="true" />}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={t.title}
          className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,30rem)] rounded-2xl border border-border bg-card p-5 text-left shadow-pop"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{district}</p>
              <p className="font-display text-lg text-foreground">{t.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.intro}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="mt-4">
            <PlanSummaryBody summary={summary} language={language} />
          </div>
        </div>
      )}
    </div>
  );
}
