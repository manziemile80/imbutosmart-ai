import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CloudRain, Sprout, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSeasonGuide, MONTHS, seasonInputSchema } from "@/lib/season-guide";
import { explainSeason } from "@/lib/season-assistant.functions";

export function SeasonAssistant({ district }: { district: string }) {
  const [month, setMonth] = useState(10);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(explainSeason);
  const guide = getSeasonGuide(month);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = seasonInputSchema.safeParse({ district, month });
    if (!parsed.success) { setError("Choose a valid district and month."); return; }
    setLoading(true); setError(null); setAnswer("");
    try {
      const response = await ask({ data: parsed.data });
      setAnswer(response.answer); setError(response.error);
    } catch { setError("AI assistance is unavailable. The usual-season guide remains available."); }
    finally { setLoading(false); }
  }

  return (
    <section aria-labelledby="season-assistant-title" className="mb-9 border-b border-border pb-8">
      <div className="flex items-center gap-2 text-primary"><Sprout className="size-5" /><p className="eyebrow">AI season assistant</p></div>
      <h2 id="season-assistant-title" className="mt-2 font-display text-2xl">Seasons & rainfall</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4">
        <label className="grid gap-1.5"><span className="text-sm font-medium">Month</span>
          <select aria-label="Season month" className="field" value={month} disabled={loading} onChange={(event) => { setMonth(Number(event.target.value)); setAnswer(""); setError(null); }}>
            {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4 border-y border-border py-4">
          <div><p className="text-xs text-muted-foreground">Farming season</p><p className="mt-1 text-xl font-semibold">{guide.farming}</p><p className="text-xs text-muted-foreground">{guide.period}</p></div>
          <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><CloudRain className="size-4" />Typical rainfall</p><p className="mt-1 text-lg font-semibold text-primary">{guide.rain}</p></div>
        </div>
        <div><p className="font-medium">{guide.name} · {guide.local}</p><p className="mt-1 text-sm text-muted-foreground">{guide.note}</p></div>
        <p className="text-xs text-muted-foreground">Usual patterns, not current rainfall. Amounts vary by district and year.</p>
        <Button type="submit" disabled={loading} className="h-12 w-full">{loading ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Sprout />}{loading ? "Preparing advice…" : `Ask AI about ${MONTHS[month - 1]}`}</Button>
      </form>
      {loading && <p role="status" className="mt-3 text-sm text-muted-foreground">Preparing season advice for {district}…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {answer && <div aria-live="polite" className="mt-5 border-l-2 border-primary pl-4"><p className="mb-2 text-sm font-semibold">AI advice · {district} · {MONTHS[month - 1]}</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p></div>}
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><a className="underline" href="https://www.meteorwanda.gov.rw/" target="_blank" rel="noreferrer">Meteo Rwanda</a><a className="underline" href="https://www.statistics.gov.rw/" target="_blank" rel="noreferrer">NISR agricultural surveys</a></p>
    </section>
  );
}