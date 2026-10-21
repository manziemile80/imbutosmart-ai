import * as React from "react";

import { cn } from "@/lib/utils";

// Status messages have one shape everywhere: a tinted surface, a coloured
// border and an icon. The tone is a token, so the same message reads the same
// in light and dark mode.

export type CalloutTone = "info" | "success" | "warning" | "danger";

const toneClass: Record<CalloutTone, string> = {
  info: "callout-info",
  success: "callout-success",
  warning: "callout-warning",
  danger: "callout-danger",
};

export const Callout = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    tone?: CalloutTone;
    icon?: React.ReactNode;
    role?: React.AriaRole;
  }
>(({ className, tone = "info", icon, role, ...props }, ref) => (
  <div ref={ref} role={role} className={cn("callout", toneClass[tone], className)} {...props}>
    {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
    <div className="min-w-0">{props.children}</div>
  </div>
));
Callout.displayName = "Callout";

export type StatusPillTone = "neutral" | "success" | "warning";

const pillClass: Record<StatusPillTone, string> = {
  neutral: "status-pill-neutral",
  success: "status-pill-success",
  warning: "status-pill-warning",
};

export const StatusPill = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    tone?: StatusPillTone;
    icon?: React.ReactNode;
  }
>(({ className, tone = "neutral", icon, ...props }, ref) => (
  <span ref={ref} className={cn("status-pill", pillClass[tone], className)} {...props}>
    {icon}
    {props.children}
  </span>
));
StatusPill.displayName = "StatusPill";
