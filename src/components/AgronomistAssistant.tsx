import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChartColumnBig, LoaderCircle, Send, Sparkles, Trash2, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  agronomistCopy,
  agronomistSuggestions,
  MAX_QUESTION_LENGTH,
  type AgronomistMessage,
} from "@/lib/agronomist-chat";
import { askAgronomist } from "@/lib/agronomist-chat.functions";
import { useVoice } from "@/hooks/use-voice";
import type { AiErrorCode } from "@/lib/ai/error-codes";
import type { Stats } from "@/lib/api";

// The agronomist assistant answers from the figures the dashboard is showing:
// the published survey figures, the model report and the district's climate.
export function AgronomistAssistant({
  district,
  season,
  onSeasonChange,
  stats,
}: {
  district: string;
  season: "A" | "B" | "C" | null;
  onSeasonChange: (season: "A" | "B" | "C" | null) => void;
  stats: Stats | null;
}) {
  const t = agronomistCopy;
  const ask = useServerFn(askAgronomist);
  const [messages, setMessages] = useState<AgronomistMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<AiErrorCode | null>(null);
  const voice = useVoice("en", (text) => {
    setInput(text);
    setError(null);
  });

  const model = stats
    ? {
        rows: stats.metrics.rows,
        districts: stats.metrics.districts,
        crops: stats.metrics.crops,
        seasons: stats.metrics.seasons,
        testAccuracy: stats.metrics.test_accuracy ?? null,
        testAuc: stats.metrics.test_auc ?? null,
        testR2: stats.metrics.test_r2 ?? null,
        testMae: stats.metrics.test_mae_t_ha ?? null,
        byCrop: stats.by_crop,
      }
    : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const question = input.trim();
    setAiError(null);
    if (!question) {
      setError(t.empty);
      return;
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      setError(t.tooLong);
      return;
    }
    setError(null);
    const next: AgronomistMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await ask({ data: { district, season, model, messages: next } });
      if (response.error) {
        setAiError(response.error);
      } else {
        setMessages([...next, { role: "assistant", content: response.answer }]);
        void voice.speakText(response.answer);
      }
    } catch (caught) {
      console.error("[agronomist-chat] call failed", caught);
      setAiError("failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel aria-labelledby="agronomist-assistant-title" data-testid="agronomist-assistant">
      <PanelHeader
        icon={<ChartColumnBig className="size-5" aria-hidden="true" />}
        eyebrow={t.eyebrow}
        title={t.heading}
        titleId="agronomist-assistant-title"
        description={t.intro}
        meta={
          <div className="grid gap-2 sm:w-40">
            <label className="grid gap-1.5">
              <span className="field-label">District</span>
              <span className="text-sm text-foreground">{district}</span>
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">Season</span>
              <select
                className="field h-10"
                value={season ?? ""}
                onChange={(event) =>
                  onSeasonChange(
                    event.target.value === "" ? null : (event.target.value as "A" | "B" | "C"),
                  )
                }
              >
                <option value="">Not set</option>
                <option value="A">Season A</option>
                <option value="B">Season B</option>
                <option value="C">Season C</option>
              </select>
            </label>
          </div>
        }
      />
      <PanelBody>
        {messages.length > 0 && (
          <div role="log" aria-live="polite" className="grid gap-3">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={
                  message.role === "user"
                    ? "rounded-xl border border-border bg-muted/50 p-3"
                    : "rounded-xl border-l-2 border-primary bg-accent/50 p-3"
                }
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {message.role === "user" ? t.you : t.assistant}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {message.content}
                </p>
                {message.role === "assistant" && voice.canSpeak && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-text underline underline-offset-4 hover:no-underline"
                    onClick={() =>
                      voice.status === "speaking"
                        ? voice.stopSpeaking()
                        : void voice.speakText(message.content)
                    }
                  >
                    <Volume2 className="size-3.5" aria-hidden="true" />
                    {voice.status === "speaking" ? "Stop" : t.listen}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {loading && (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {t.thinking}
          </p>
        )}
        {aiError && (
          <Callout tone="danger" role="alert" className="mt-3">
            {t.errors[aiError]}
          </Callout>
        )}
        {error && (
          <Callout tone="danger" role="alert" className="mt-3">
            {error}
          </Callout>
        )}

        {messages.length === 0 && !loading && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">{t.suggestions}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {agronomistSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setInput(suggestion);
                    setError(null);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <label className="grid gap-1.5">
            <span className="sr-only">{t.placeholder}</span>
            <Textarea
              value={input}
              disabled={loading}
              maxLength={MAX_QUESTION_LENGTH}
              placeholder={t.placeholder}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
            />
          </label>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading || !input.trim()} className="h-11 flex-1">
              {loading ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Send aria-hidden="true" />
              )}
              {loading ? t.thinking : t.send}
            </Button>
            {messages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={loading}
                onClick={() => {
                  setMessages([]);
                  setError(null);
                  setAiError(null);
                }}
              >
                <Trash2 aria-hidden="true" />
                {t.clear}
              </Button>
            )}
          </div>
        </form>

        <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          {t.disclaimer}
        </p>
      </PanelBody>
    </Panel>
  );
}
