"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-[0.82rem] font-medium uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background/40 px-3.5 text-sm",
        "placeholder:text-muted-foreground/60",
        "transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-input bg-background/40 px-3.5 py-3 text-sm leading-relaxed",
        "placeholder:text-muted-foreground/60",
        "transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

/** Range input styled to match the panel chrome, with its value read out. */
export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  format,
  className,
}: {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="tabular font-mono text-[0.85rem] text-foreground/80">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
          [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_color-mix(in_oklch,var(--ember)_22%,transparent)]
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
        style={{
          background: `linear-gradient(90deg, var(--ember) ${pct}%, color-mix(in oklch, var(--foreground) 14%, transparent) ${pct}%)`,
        }}
      />
    </div>
  );
}

/** Two-to-four way choice; the pill slides because the active item owns the fill. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-full border border-border bg-background/40 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onValueChange(o.value)}
          className={cn(
            "flex-1 rounded-full px-3 py-2 text-[0.85rem] font-medium transition-all duration-200",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <Label className="cursor-pointer">{label}</Label>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-background transition-all duration-200",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  );
}
