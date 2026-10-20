import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Mic, Sparkles, Square, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { soilLabel, type FarmerLanguage } from "@/lib/farmer-language";
import { guideSpokenText, voiceCopy, voiceGuide } from "@/lib/voice-assistant";
import type { FarmerChatMessage } from "@/lib/farmer-chat";
import type { AiErrorCode } from "@/lib/ai/error-codes";
import { askVoiceAssistant } from "@/lib/voice-assistant.functions";
import { useVoice } from "@/hooks/use-voice";

export function VoiceAssistant({ district, soil, language }: { district: string; soil: string; language: FarmerLanguage }) {
  const t = voiceCopy[language];
  const items = voiceGuide(language);
  const ask = useServerFn(askVoiceAssistant);
  const [messages, setMessages] = useState<FarmerChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [answerError, setAnswerError] = useState<AiErrorCode | null>(null);
  const voice = useVoice(language, (text) => void sendQuestion(text));

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setAnswerError(null);
    const next: FarmerChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setLoading(true);
    try {
      const response = await ask({ data: { district, soil, language, messages: next } });
      if (response.error) {
        setAnswerError(response.error);
      } else {
        setMessages([...next, { role: "assistant", content: response.answer }]);
        void voice.speakText(response.answer);
      }
    } catch {
      setAnswerError("failed");
    } finally {
      setLoading(false);
    }
  }

  const speaking = voice.status === "speaking";
  const recording = voice.status === "recording";
  const busy = loading || voice.status === "transcribing";

  const statusText = recording
    ? t.recording
    : voice.status === "transcribing"
      ? t.transcribing
      : speaking
        ? t.speaking
        : loading
          ? t.thinking
          : "";

  return (
    <section aria-labelledby="voice-assistant-title" className="mb-9" data-testid="voice-assistant">
      <div className="flex items-center gap-2 text-primary-text">
        <Volume2 className="size-5" aria-hidden="true" />
        <p className="eyebrow">{t.eyebrow}</p>
      </div>
      <h2 id="voice-assistant-title" className="mt-2 font-display text-2xl">{t.heading}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.intro}</p>

      {voice.configured === false && (
        <p role="status" className="mt-3 rounded-md border border-border bg-card p-3 text-sm leading-relaxed text-muted-foreground">
          {t.configNote}
        </p>
      )}

      {voice.configured === true && !voice.canSpeak && (
        <p role="status" className="mt-3 rounded-md border border-border bg-card p-3 text-sm leading-relaxed text-muted-foreground">
          {t.spokenUnavailable}
        </p>
      )}

      <div className="mt-5 rounded-md border border-border bg-card p-4">
        <p className="font-semibold">{t.guideTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.guideIntro}</p>
        <ul className="mt-3 grid gap-2">
          {items.map((item) => (
            <li key={item.title} className="text-sm leading-relaxed">
              <span className="font-medium text-foreground">{item.title}</span>
              <span className="text-muted-foreground"> — {item.detail}</span>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-10"
          onClick={() => (speaking ? voice.stopSpeaking() : void voice.speakText(guideSpokenText(language)))}
        >
          {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          {speaking ? t.stop : t.listen}
        </Button>
      </div>

      <div className="mt-6">
        <p className="font-semibold">{t.askTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.askIntro}</p>

        {messages.length > 0 && (
          <div role="log" aria-live="polite" className="mt-4 grid gap-3">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={message.role === "user" ? "rounded-md border border-border bg-card p-3" : "rounded-md border-l-2 border-primary bg-accent p-3"}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {message.role === "user" ? t.transcript : t.answer}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                {message.role === "assistant" && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary-text underline"
                    onClick={() => (speaking ? voice.stopSpeaking() : void voice.speakText(message.content))}
                  >
                    <Volume2 className="size-3.5" aria-hidden="true" />{t.listen}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {statusText && (
          <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {statusText}
          </p>
        )}
        {voice.notice && (
          <p
            role={voice.notice === "unconfigured" ? "status" : "alert"}
            className={voice.notice === "unconfigured" ? "mt-3 text-sm text-muted-foreground" : "mt-3 text-sm text-destructive"}
          >
            {t.notices[voice.notice]}
          </p>
        )}
        {answerError && <p role="alert" className="mt-3 text-sm text-destructive">{t.notices[answerError]}</p>}
        {!voice.recordingSupported && !voice.notice && (
          <p className="mt-3 text-sm text-muted-foreground">{t.notices.unsupported}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={busy}
            className="h-11"
            aria-pressed={recording}
            onClick={() => (recording ? voice.stopRecording() : void voice.startRecording())}
          >
            {busy
              ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              : <Mic aria-hidden="true" />}
            {recording ? t.stopRecording : t.record}
          </Button>
          {speaking && (
            <Button type="button" variant="outline" className="h-11" onClick={voice.stopSpeaking}>
              <Square aria-hidden="true" />{t.stop}
            </Button>
          )}
          {messages.length > 0 && (
            <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => { setMessages([]); setAnswerError(null); voice.clearNotice(); }}>
              <Trash2 aria-hidden="true" />{t.clear}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {district} · {soilLabel(soil, language)} · {t.disclaimer}
      </p>
    </section>
  );
}
