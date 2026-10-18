import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { SeasonAssistant } from "@/components/SeasonAssistant";
import { DISTRICTS, SOILS, predict, type Prediction } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SowSmart Rwanda — What should I plant this season?" },
      { name: "description", content: "Explore Rwanda’s farming seasons, typical rainfall, and crop recommendations with SowSmart’s AI season assistant." },
      { property: "og:title", content: "SowSmart Rwanda — Farmer Advisory" },
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await predict({
        district, soil_type: soil,
        forecast_rain_mm: Number(rain), forecast_temp_c: Number(temp),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-xl px-5 py-10">
        <SeasonAssistant key={district} district={district} />
        <p className="eyebrow">Farmer Advisory</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-foreground sm:text-5xl">
          What should I plant this season?
        </h1>
        <p className="mt-3 text-muted-foreground">
          Tell us about your field. Our model, trained on NISR survey data, ranks the crops most likely to succeed.
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-5">
          <Field label="District">
            <select className="field" value={district} onChange={(e) => setDistrict(e.target.value)}>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Soil type">
            <select className="field" value={soil} onChange={(e) => setSoil(e.target.value)}>
              {SOILS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Forecast rain (mm)">
              <input className="field" type="number" inputMode="decimal" min={0} max={5000} required value={rain} onChange={(e) => setRain(e.target.value)} />
            </Field>
            <Field label="Forecast temp (°C)">
              <input className="field" type="number" inputMode="decimal" min={-5} max={45} step="0.1" required value={temp} onChange={(e) => setTemp(e.target.value)} />
            </Field>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Analysing…" : "Get recommendation"}
          </button>
        </form>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
            {error}
          </div>
        )}

        {result && (
          <div aria-live="polite" className="result-card mt-8">
            <p className="text-sm uppercase tracking-widest opacity-80">Recommended crop</p>
            <p className="mt-1 font-display text-5xl">{result.recommended_crop}</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm opacity-80">Confidence</p>
                <p className="text-3xl font-semibold">{Math.round(result.confidence * 100)}%</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Expected yield</p>
                <p className="text-3xl font-semibold">{result.expected_yield_t_ha.toFixed(1)} t/ha</p>
              </div>
            </div>
            {result.alternatives.length > 0 && (
              <div className="mt-6 border-t border-primary-foreground/25 pt-4">
                <p className="text-sm opacity-80">Also good</p>
                <ul className="mt-2 space-y-1">
                  {result.alternatives.map((a) => (
                    <li key={a.crop} className="flex justify-between">
                      <span>{a.crop}</span>
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
