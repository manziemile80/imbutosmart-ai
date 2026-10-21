import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, LoaderCircle, Mic, Sparkles, Square, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { soilLabel, type FarmerLanguage } from "@/lib/farmer-language";
import { guideSpokenText, voiceCopy, voiceGuide, type VoiceNotice } from "@/lib/voice-assistant";
import type { FarmerChatMessage } from "@/lib/farmer-chat";
import type { AiErrorCode } from "@/lib/ai/error-codes";
import { askVoiceAssistant } from "@/lib/voice-assistant.functions";
import { useVoice } from "@/hooks/use-voice";

// A notice the farmer cannot act on stays a calm status: the answer is simply
// written. Only a blocked microphone, a missing recording or an empty answer
// is worth an alert.
const calmNotices: VoiceNotice[] = ["unconfigured", "not-spoken"];

export function VoiceAssistant({
  district,
  soil,
  language,
}: {
  district: string;
  soil: string;
  language: FarmerLanguage;
}) {
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
    <Panel aria-labelledby="voice-assistant-title" data-testid="voice-assistant">
      <PanelHeader
        icon={<Volume2 className="size-5" aria-hidden="true" />}
        eyebrow={t.eyebrow}
        title={t.heading}
        titleId="voice-assistant-title"
        description={t.intro}
      />
      <PanelBody>
        {voice.configured === false && (
          <Callout tone="info" role="status">
            {t.configNote}
          </Callout>
        )}

        {voice.configured === true && !voice.canSpeak && (
          <Callout
            tone="warning"
            role="status"
            className="mt-3"
            icon={<AlertCircle className="size-4" aria-hidden="true" />}
          >
            {t.spokenUnavailable}
          </Callout>
        )}

        {voice.speechUnavailable && (
          <Callout
            tone="warning"
            role="status"
            className="mt-3"
            icon={<AlertCircle className="size-4" aria-hidden="true" />}
          >
            {t.speechUnavailable}
          </Callout>
        )}

        <div className="card-quiet mt-4">
          <p className="font-semibold text-foreground">{t.guideTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.guideIntro}</p>
          <ul className="mt-3 grid gap-2">
            {items.map((item) => (
              <li key={item.title} className="text-sm leading-relaxed">
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="text-muted-foreground"> — {item.detail}</span>
              </li>
            ))}
          </ul>
          {voice.canSpeak && !voice.speechUnavailable && (
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11"
              onClick={() =>
                speaking ? voice.stopSpeaking() : void voice.speakText(guideSpokenText(language))
              }
            >
              {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
              {speaking ? t.stop : t.listen}
            </Button>
          )}
        </div>

        <div className="mt-6">
          <p className="font-semibold text-foreground">{t.askTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.askIntro}</p>

          {messages.length > 0 && (
            <div role="log" aria-live="polite" className="mt-4 grid gap-3">
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
                    {message.role === "user" ? t.transcript : t.answer}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {message.content}
                  </p>
                  {message.role === "assistant" && !voice.speechUnavailable && (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-text underline underline-offset-4 hover:no-underline"
                      onClick={() =>
                        speaking ? voice.stopSpeaking() : void voice.speakText(message.content)
                      }
                    >
                      <Volume2 className="size-3.5" aria-hidden="true" />
                      {t.listen}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {statusText && (
            <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {statusText}
            </p>
          )}
          {voice.notice && (
            <p
              role={calmNotices.includes(voice.notice) ? "status" : "alert"}
              className={
                calmNotices.includes(voice.notice)
                  ? "mt-3 text-sm text-muted-foreground"
                  : "mt-3 text-sm text-destructive"
              }
            >
              {t.notices[voice.notice]}
            </p>
          )}
          {answerError && answerError !== "failed" && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {t.notices[answerError]}
            </p>
          )}
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
              {busy ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Mic aria-hidden="true" />
              )}
              {recording ? t.stopRecording : t.record}
            </Button>
            {speaking && (
              <Button type="button" variant="outline" className="h-11" onClick={voice.stopSpeaking}>
                <Square aria-hidden="true" />
                {t.stop}
              </Button>
            )}
            {messages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={busy}
                onClick={() => {
                  setMessages([]);
                  setAnswerError(null);
                  voice.clearNotice();
                }}
              >
                <Trash2 aria-hidden="true" />
                {t.clear}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {district} · {soilLabel(soil, language)} · {t.disclaimer}
          </span>
        </p>
      </PanelBody>
    </Panel>
  );
}
