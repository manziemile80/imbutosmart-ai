import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.ComponentPropsWithoutRef<"input">, "type" | "checked" | "defaultChecked"> & {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

// Native form semantics avoid an extra state provider and its separate React dependency.
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => (
    <span className={cn("relative inline-flex size-4 shrink-0", className)}>
      <input
        {...props}
        ref={(input) => {
          if (input) input.indeterminate = checked === "indeterminate";
          if (typeof ref === "function") ref(input);
          else if (ref) ref.current = input;
        }}
        type="checkbox"
        checked={checked === undefined ? undefined : checked === true}
        aria-checked={checked === "indeterminate" ? "mixed" : checked}
        onChange={(event) => {
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
        }}
        className="peer m-0 size-4 cursor-pointer appearance-none rounded-sm border border-primary bg-card shadow-sm checked:bg-primary indeterminate:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Check aria-hidden="true" className="pointer-events-none absolute inset-0 hidden size-4 text-primary-foreground peer-checked:block" />
      <Minus aria-hidden="true" className="pointer-events-none absolute inset-0 hidden size-4 text-primary-foreground peer-indeterminate:block" />
    </span>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
