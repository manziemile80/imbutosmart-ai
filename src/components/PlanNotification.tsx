import { useState } from "react";
import { Bell, BellOff, Check, Sprout, ShieldCheck, Package } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { knowledgeCropLabel } from "@/lib/crop-knowledge";
import { summaryCopy, type PlanSummary } from "@/lib/plan-summary";
import { soilLabel, type FarmerLanguage } from "@/lib/farmer-language";

// The farmer's overview: what to plant, what farmers around them apply, what
// to ask an insurer about, and what else to do. It appears as soon as the
// field is chosen, and the farmer can ask the browser to send it as a
// notification too.
export function PlanNotification({
  summary,
  district,
  soil,
  language = "en",
}: {
  summary: PlanSummary;
  district: string;
  soil: string;
  language?: FarmerLanguage;
}) {
  const t = summaryCopy[language];
  const [sent, setSent] = useState<"sent" | "blocked" | null>(null);

  function send() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSent("blocked");
      return;
    }
    const show = () => {
      const body = [
        `${summary.crops
          .slice(0, 3)
          .map((crop) => knowledgeCropLabel(crop.crop, language))
          .join(", ")}`,
        summary.inputs.length > 0
          ? summary.inputs
              .map((input) =>
                input.rateKgPerHa
                  ? `${input.name} (${Math.round(input.share * 100)}%, ${Math.round(input.rateKgPerHa)} kg/ha)`
                  : `${input.name} (${Math.round(input.share * 100)}%)`,
              )
              .join(", ")
          : "",
        summary.advice[0] ?? "",
      ]
        .filter(Boolean)
        .join(" · ");
      new Notification(`${t.title} — ${district}`, { body, tag: `plan-${district}` });
      setSent("sent");
    };
    if (Notification.permission === "granted") {
      show();
    } else if (Notification.permission === "denied") {
      setSent("blocked");
    } else {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") show();
        else setSent("blocked");
      });
    }
  }

  return (
    <Panel aria-labelledby="plan-notification-title" data-testid="plan-notification">
      <PanelHeader
        icon={<Bell className="size-5" aria-hidden="true" />}
        eyebrow={district}
        title={t.title}
        titleId="plan-notification-title"
        description={`${t.intro} ${soilLabel(soil, language)}.`}
        meta={
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={send}
            disabled={sent === "sent"}
          >
            {sent === "sent" ? (
              <Check aria-hidden="true" />
            ) : sent === "blocked" ? (
              <BellOff aria-hidden="true" />
            ) : (
              <Bell aria-hidden="true" />
            )}
            {sent === "sent" ? t.notified : sent === "blocked" ? t.notifyBlocked : t.notify}
          </Button>
        }
      />
      <PanelBody>
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sprout className="size-4 text-primary-text" aria-hidden="true" />
              {t.crops}
            </h3>
            <ul className="mt-2 grid gap-1 text-sm">
              {summary.crops.map((crop) => (
                <li key={crop.crop} className="flex justify-between gap-3">
                  <span className="text-foreground">{knowledgeCropLabel(crop.crop, language)}</span>
                  <span className="tabular text-muted-foreground">{crop.score}%</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="size-4 text-primary-text" aria-hidden="true" />
              {t.inputs}
            </h3>
            {summary.inputs.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t.noInputs}</p>
            ) : (
              <ul className="mt-2 grid gap-2 text-sm">
                {summary.inputs.map((input) => (
                  <li key={input.name}>
                    <span className="flex justify-between gap-3">
                      <span className="text-foreground">{input.name}</span>
                      <span className="tabular text-muted-foreground">
                        {Math.round(input.share * 100)}%
                      </span>
                    </span>
                    {input.rateKgPerHa ? (
                      <span className="text-xs text-muted-foreground">
                        {t.rate.replace("{n}", String(Math.round(input.rateKgPerHa)))}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-primary-text" aria-hidden="true" />
              {t.insurance}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.insuranceNote}</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">{t.advice}</h3>
            <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed text-muted-foreground">
              {summary.advice.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </section>
        </div>
      </PanelBody>
    </Panel>
  );
}
