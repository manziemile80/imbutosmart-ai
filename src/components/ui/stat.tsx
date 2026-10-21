import * as React from "react";

import { cn } from "@/lib/utils";

// A figure with its label. Numbers use tabular figures so a column of them
// lines up, which is what the dashboard and the recommendation card need.

export const Stat = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
  }
>(({ className, label, value, hint, ...props }, ref) => (
  <div ref={ref} className={cn("stat", className)} {...props}>
    <p className="stat-label">{label}</p>
    <p className="stat-value">{value}</p>
    {hint && <p className="stat-hint">{hint}</p>}
  </div>
));
Stat.displayName = "Stat";
