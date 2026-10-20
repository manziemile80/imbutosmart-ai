import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Sparkles, LoaderCircle, Trash2, Mic, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { soilLabel, type FarmerLanguage } from "@/lib/farmer-language";
import {
  chatCopy,
  suggestedQuestions,
  MAX_QUESTION_LENGTH,
  type FarmerChatMessage,
} from "@/lib/farmer-chat";
import { voiceCopy } from "@/lib/voice-assistant";
import { askFarmerAssistant } from "@/lib/farmer-chat.functions";
import { useVoice } from "@/hooks/use-voice";
import type { AiErrorCode } from "@/lib/ai/error-codes";

export function FarmerAssistant({ district, soil, language }: { district: string; soil: string; language: FarmerLanguage }) {
  const t = chatCopy[language];
  const vt = voiceCopy[language];
  const examples = suggestedQuestions(language);
  const ask = useServerFn(askFarmerAssistant);
  const [messages, setMessages] = useState<FarmerChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<AiErrorCode | null>(null);
  const voice = useVoice(language, (text) => { setInput(text); setInputError(null); });

  function reset() {
    setMessages([]);
    setInputError(null);
    setAiError(null);
    voice.clearNotice();
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const question = input.trim();
    setAiError(null);
    if (!question) { setInputError(t.empty); return; }
    if (question.length > MAX_QUESTION_LENGTH) { setInputError(t.tooLong); return; }
    setInputError(null);
    const next: FarmerChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await ask({ data: { district, soil, language, messages: next } });
      if (response.error) {
        setAiError(response.error);
      } else {
        setMessages([...next, { role: "assistant", content: response.answer }]);
      }
    } catch {
      setAiError("failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="farmer-assistant-title" className="mb-9" data-testid="farmer-assistant">
      <div className="flex items-center gap-2 text-primary-text"><Sparkles className="size-5" aria-hidden="true" /><p className="eyebrow">{t.assistant}</p></div>
      <h2 id="farmer-assistant-title" className="mt-2 font-display text-2xl">{t.heading}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{district} · {soilLabel(soil, language)}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.intro}</p>

      {voice.configured === false && (
        <p role="status" className="mt-3 rounded-md border border-border bg-card p-3 text-sm leading-relaxed text-muted-foreground">
          {vt.configNote}
        </p>
      )}

      {messages.length > 0 && (
        <div role="log" aria-live="polite" className="mt-5 grid gap-3">
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={message.role === "user" ? "rounded-md border border-border bg-card p-3" : "rounded-md border-l-2 border-primary bg-accent p-3"}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{message.role === "user" ? t.you : t.assistant}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              {message.role === "assistant" && (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary-text underline"
                  onClick={() => (voice.status === "speaking" ? voice.stopSpeaking() : void voice.speakText(message.content))}
                >
                  <Volume2 className="size-3.5" aria-hidden="true" />{voice.status === "speaking" ? vt.stop : vt.listen}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t.thinking}</p>}
      {voice.status === "recording" && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{vt.recording}</p>}
      {voice.status === "transcribing" && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{vt.transcribing}</p>}
      {aiError && <p role="alert" className="mt-3 text-sm text-destructive">{t.errors[aiError]}</p>}
      {voice.notice && (
        <p
          role={voice.notice === "unconfigured" ? "status" : "alert"}
          className={voice.notice === "unconfigured" ? "mt-3 text-sm text-muted-foreground" : "mt-3 text-sm text-destructive"}
        >
          {vt.notices[voice.notice]}
        </p>
      )}
      {inputError && <p role="alert" className="mt-3 text-sm text-destructive">{inputError}</p>}

      {messages.length === 0 && !loading && (
        <div className="mt-5">
          <p className="text-xs font-medium text-muted-foreground">{t.suggestions}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => { setInput(example); setInputError(null); }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
              >
                {example}
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
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={loading || voice.status === "transcribing"}
            aria-pressed={voice.status === "recording"}
            aria-label={voice.status === "recording" ? vt.stopRecording : vt.record}
            onClick={() => (voice.status === "recording" ? voice.stopRecording() : void voice.startRecording())}
          >
            {voice.status === "transcribing"
              ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              : voice.status === "recording"
                ? <Square aria-hidden="true" />
                : <Mic aria-hidden="true" />}
          </Button>
          <Button type="submit" disabled={loading || !input.trim()} className="h-11 flex-1">
            {loading ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send aria-hidden="true" />}
            {loading ? t.thinking : t.send}
          </Button>
          {messages.length > 0 && (
            <Button type="button" variant="outline" className="h-11" disabled={loading} onClick={reset}>
              <Trash2 aria-hidden="true" />{t.clear}
            </Button>
          )}
        </div>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t.disclaimer}</p>
    </section>
  );
}
