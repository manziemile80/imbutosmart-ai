import { useMemo, useState } from "react";
import { Mail, MessageCircle, Phone, Send, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Callout, StatusPill } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import {
  MESSAGE_CATEGORIES,
  MESSAGE_CATEGORY_LABELS,
  MESSAGE_CHANNELS,
  MESSAGE_CHANNEL_LABELS,
  dashboardCopy,
  formatDate,
  mailtoLink,
  smsLink,
  telLink,
  whatsappLink,
  type MessageData,
} from "@/lib/agronomist-dashboard";
import { MESSAGE_TEMPLATES } from "@/lib/agronomist-reference";
import type { FarmerLanguage } from "@/lib/farmer-language";
import { RecordMeta } from "./RecordManager";
import type { SectionProps } from "./section-types";

export function CommunicationSection(props: SectionProps) {
  const t = dashboardCopy[props.language];
  const farmers = props.records.filter((record) => record.kind === "farmer");
  const messages = props.records.filter((record) => record.kind === "message");
  const [farmerName, setFarmerName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState<MessageData["channel"]>("whatsapp");
  const [language, setLanguage] = useState<FarmerLanguage>(props.language);
  const [category, setCategory] = useState<MessageData["category"]>("reminder");
  const [subject, setSubject] = useState(MESSAGE_TEMPLATES[props.language].reminder.subject);
  const [body, setBody] = useState(MESSAGE_TEMPLATES[props.language].reminder.body);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const farmerChoices = useMemo(
    () =>
      farmers.map((record) => ({
        value: record.id,
        label: `${String(record.data["fullName"] ?? "Farmer")} · ${String(record.data["district"] ?? "")}`,
        record,
      })),
    [farmers],
  );

  function applyTemplate(nextCategory: MessageData["category"], nextLanguage: FarmerLanguage) {
    setCategory(nextCategory);
    setLanguage(nextLanguage);
    const template = MESSAGE_TEMPLATES[nextLanguage][nextCategory];
    setSubject(template.subject);
    setBody(template.body);
  }

  function chooseFarmer(id: string) {
    const found = farmerChoices.find((choice) => choice.value === id);
    if (!found) return;
    setFarmerName(String(found.record.data["fullName"] ?? ""));
    setRecipient(String(found.record.data["phone"] ?? ""));
  }

  async function prepare() {
    setError(null);
    setNotice(null);
    if (!farmerName.trim()) {
      setError("Choose or name the farmer.");
      return;
    }
    const result = await props.save(
      "message",
      {
        farmerName: farmerName.trim(),
        recipient: recipient.trim(),
        channel,
        language,
        category,
        subject: subject.trim(),
        body: body.trim(),
        status: "prepared",
        sentAt: null,
      },
      null,
    );
    if (!result.ok && !result.queued) {
      setError(result.message ?? "The message could not be saved.");
      return;
    }
    setNotice(
      result.queued
        ? "Kept on this device and sent when the connection returns. The message appears in the history after the server accepts it."
        : "Message prepared and recorded. Open the channel below, then mark it sent when you have sent it.",
    );
  }

  async function markSent(recordId: string) {
    const record = messages.find((item) => item.id === recordId);
    if (!record) return;
    const data = record.data as unknown as MessageData;
    const result = await props.save(
      "message",
      {
        ...data,
        status: "sent",
        sentAt: new Date().toISOString().slice(0, 10),
      },
      record.id,
    );
    if (!result.ok && !result.queued) {
      setError(result.message ?? "The message status could not be saved.");
    }
  }

  return (
    <Panel aria-labelledby="agronomist-communication-title">
      <PanelHeader
        icon={<Send className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.communication}
        title="Farmer messages in English, Kinyarwanda and French"
        titleId="agronomist-communication-title"
        description="Write a personalised message, open it in the farmer's channel, then mark it sent. The app records the message and the author; it does not claim delivery by itself."
      />
      <PanelBody>
        {error && (
          <Callout tone="danger" role="alert" className="mb-4">
            {error}
          </Callout>
        )}
        {notice && (
          <Callout tone="success" className="mb-4">
            {notice}
          </Callout>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section
            aria-labelledby="compose-message-title"
            className="rounded-xl border border-border bg-muted/30 p-4"
          >
            <h3 id="compose-message-title" className="text-sm font-semibold text-foreground">
              Compose a message
            </h3>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1.5">
                <span className="field-label">Farmer record</span>
                <select
                  className="field h-10"
                  value=""
                  onChange={(event) => chooseFarmer(event.target.value)}
                >
                  <option value="">Choose a recorded farmer (optional)</option>
                  {farmerChoices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="field-label">Farmer name</span>
                <Input value={farmerName} onChange={(event) => setFarmerName(event.target.value)} />
              </label>
              <label className="grid gap-1.5">
                <span className="field-label">Phone or email</span>
                <Input
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="Recorded contact only"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="field-label">Channel</span>
                  <select
                    className="field h-10"
                    value={channel}
                    onChange={(event) => setChannel(event.target.value as MessageData["channel"])}
                  >
                    {MESSAGE_CHANNELS.map((value) => (
                      <option key={value} value={value}>
                        {MESSAGE_CHANNEL_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="field-label">Message language</span>
                  <select
                    className="field h-10"
                    value={language}
                    onChange={(event) => {
                      const next = event.target.value as FarmerLanguage;
                      setLanguage(next);
                      applyTemplate(category, next);
                    }}
                  >
                    <option value="en">English</option>
                    <option value="rw">Kinyarwanda</option>
                    <option value="fr">French</option>
                  </select>
                </label>
                <label className="grid gap-1.5 sm:col-span-2">
                  <span className="field-label">Purpose</span>
                  <select
                    className="field h-10"
                    value={category}
                    onChange={(event) => {
                      const next = event.target.value as MessageData["category"];
                      applyTemplate(next, language);
                    }}
                  >
                    {MESSAGE_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {MESSAGE_CATEGORY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="field-label">Subject</span>
                <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
              </label>
              <label className="grid gap-1.5">
                <span className="field-label">Message</span>
                <Textarea rows={7} value={body} onChange={(event) => setBody(event.target.value)} />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  The template carries no figure, price or rate. Add only a figure you have
                  verified, with its source.
                </span>
              </label>
              <Button type="button" onClick={() => void prepare()} disabled={props.busy}>
                <Send aria-hidden="true" />
                Prepare and record
              </Button>
            </div>
          </section>

          <section aria-labelledby="message-history-title">
            <h3 id="message-history-title" className="text-sm font-semibold text-foreground">
              Message history ({messages.length})
            </h3>
            {messages.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No message has been recorded yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {messages.map((record) => {
                  const data = record.data as unknown as MessageData;
                  const wa = whatsappLink(data.recipient, data.body);
                  const mail = mailtoLink(data.recipient, data.subject, data.body);
                  const sms = smsLink(data.recipient, data.body);
                  const tel = telLink(data.recipient);
                  return (
                    <li key={record.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{data.subject}</h4>
                        <StatusPill tone={data.status === "sent" ? "success" : "warning"}>
                          {data.status}
                        </StatusPill>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {data.farmerName} · {MESSAGE_CHANNEL_LABELS[data.channel]} ·{" "}
                        {data.language.toUpperCase()} · {MESSAGE_CATEGORY_LABELS[data.category]}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {data.body}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {wa && (
                          <Button asChild variant="outline" size="sm">
                            <a href={wa} target="_blank" rel="noreferrer">
                              <MessageCircle aria-hidden="true" />
                              WhatsApp
                            </a>
                          </Button>
                        )}
                        {sms && (
                          <Button asChild variant="outline" size="sm">
                            <a href={sms}>
                              <Smartphone aria-hidden="true" />
                              SMS
                            </a>
                          </Button>
                        )}
                        {mail && (
                          <Button asChild variant="outline" size="sm">
                            <a href={mail}>
                              <Mail aria-hidden="true" />
                              Email
                            </a>
                          </Button>
                        )}
                        {tel && (
                          <Button asChild variant="outline" size="sm">
                            <a href={tel}>
                              <Phone aria-hidden="true" />
                              Call
                            </a>
                          </Button>
                        )}
                        {data.status !== "sent" && props.canEdit && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={props.busy}
                            onClick={() => void markSent(record.id)}
                          >
                            Mark sent
                          </Button>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Prepared {formatDate(record.createdAt)}
                        {data.sentAt ? ` · marked sent ${formatDate(data.sentAt)}` : ""}. The app
                        does not confirm delivery.
                      </p>
                      <RecordMeta record={record} language={props.language} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </PanelBody>
    </Panel>
  );
}
