import * as React from "react";

import { cn } from "@/lib/utils";

// The panel is the app's structural unit: a titled surface that groups one
// topic. Every major block on the farmer page and the dashboard is a panel, so
// the page reads as a set of clear, repeatable sections.

export const Panel = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <section ref={ref} className={cn("panel", className)} {...props} />
  ),
);
Panel.displayName = "Panel";

export const PanelHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon?: React.ReactNode;
    eyebrow?: string;
    title: React.ReactNode;
    titleId?: string;
    description?: React.ReactNode;
    meta?: React.ReactNode;
  }
>(({ className, icon, eyebrow, title, titleId, description, meta, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-3 border-b border-border p-5 sm:p-6", className)}
    {...props}
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="flex items-center gap-2 text-primary-text">
            {icon}
            <span className="eyebrow">{eyebrow}</span>
          </p>
        )}
        <h2 id={titleId} className={cn("section-title", eyebrow && "mt-2")}>
          {title}
        </h2>
        {description && <p className="section-lede">{description}</p>}
      </div>
      {meta && <div className="shrink-0 sm:max-w-sm">{meta}</div>}
    </div>
  </div>
));
PanelHeader.displayName = "PanelHeader";

export const PanelBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("panel-body", className)} {...props} />
  ),
);
PanelBody.displayName = "PanelBody";

export const PanelFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("panel-divider", className)} {...props} />
  ),
);
PanelFooter.displayName = "PanelFooter";
