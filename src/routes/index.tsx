import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { SeasonAssistant } from "@/components/SeasonAssistant";
import { InsuranceGuidance } from "@/components/InsuranceGuidance";
import { API_URL, DISTRICTS, SOILS } from "@/lib/api";
import { farmerCopy, cropLabel, soilLabel, type FarmerLanguage } from "@/lib/farmer-language";
import { useAutoPrediction } from "@/hooks/use-auto-prediction";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ImbutoSmart AI — What should I plant this season?" },
      { name: "description", content: "Explore Rwanda’s farming seasons, typical rainfall, and crop recommendations with ImbutoSmart AI’s season assistant." },
      { property: "og:title", content: "ImbutoSmart AI — Farmer Advisory" },
      { property: "og:description", content: "Learn Rwanda’s season names and typical rainfall, then get crop advice for your field." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Advisory,
});

function Advisory() {
  const [district, setDistrict] = useState("Musanze");
  const [soil, setSoil] = useState("Volcanic");
  const [rain, setRain] = useState("450");
  const [temp, setTemp] = useState("19");
  const [language, setLanguage] = useState<FarmerLanguage>("en");
  const t = farmerCopy[language];
  const { result, loading, error } = useAutoPrediction(district, soil, rain, temp);

  return (
    <SiteShell language={language}>
      <section lang={language} className="mx-auto max-w-xl px-5 py-10">
        <label className="mb-6 grid gap-1.5"><span className="text-sm font-medium">{t.language}</span><select className="field" aria-label="Language / Ururimi / Langue" value={language} onChange={(event) => setLanguage(event.target.value === "fr" ? "fr" : event.target.value === "rw" ? "rw" : "en")}><option value="en">English</option><option value="rw">Kinyarwanda</option><option value="fr">Français</option></select></label>
        <SeasonAssistant key={`${district}-${language}`} district={district} language={language} />
        <p className="eyebrow">{t.advisory}</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-foreground sm:text-5xl">
          {t.title}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t.intro}
        </p>

        <form onSubmit={(event) => event.preventDefault()} className="mt-8 grid gap-5">
          <Field label={t.district}>
            <select className="field" value={district} onChange={(e) => setDistrict(e.target.value)}>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label={t.soil}>
            <select className="field" value={soil} onChange={(e) => setSoil(e.target.value)}>
              {SOILS.map((s) => <option key={s} value={s}>{soilLabel(s, language)}</option>)}
            </select>
          </Field>
          <InsuranceGuidance district={district} soil={soil} language={language} />
          <div className="grid grid-cols-2 gap-4">
            <Field label={t.rain}>
              <input className="field" type="number" inputMode="decimal" min={0} max={5000} required value={rain} onChange={(e) => setRain(e.target.value)} />
            </Field>
            <Field label={t.temp}>
              <input className="field" type="number" inputMode="decimal" min={-5} max={45} step="0.1" required value={temp} onChange={(e) => setTemp(e.target.value)} />
            </Field>
          </div>
        </form>

        {loading && <p role="status" className="mt-6 text-sm text-muted-foreground">{t.analysing}</p>}
        {error && (
          <div role="alert" className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
            {t[error]}
          </div>
        )}

        {result && (
          <div aria-live="polite" data-testid="crop-result" className="result-card mt-8">
            <p className="text-sm uppercase tracking-widest opacity-80">{t.recommended}</p>
            <p className="mt-1 font-display break-words text-4xl sm:text-5xl">{cropLabel(result.recommended_crop, language)}</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm opacity-80">{t.confidence}</p>
                <p className="text-3xl font-semibold">{Math.round(result.confidence * 100)}%</p>
              </div>
              <div>
                <p className="text-sm opacity-80">{t.yield}</p>
                <p className="text-3xl font-semibold">{result.expected_yield_t_ha.toFixed(1)} t/ha</p>
              </div>
            </div>
            <p className="mt-4 text-xs opacity-80">{district} · {soilLabel(soil, language)}</p>
            {!API_URL && <p className="mt-3 text-xs leading-relaxed opacity-80">{t.localNote}</p>}
            {result.alternatives.length > 0 && (
              <div className="mt-6 border-t border-primary-foreground/25 pt-4">
                <p className="text-sm opacity-80">{t.alternatives}</p>
                <ul className="mt-2 space-y-1">
                  {result.alternatives.map((a) => (
                    <li key={a.crop} className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                      <span>{cropLabel(a.crop, language)}</span>
                      <span>{Math.round(a.success_probability * 100)}% · {a.expected_yield_t_ha.toFixed(1)} t/ha</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
