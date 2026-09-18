"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline" | "subtle" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_10px_30px_-12px_color-mix(in_oklch,var(--ember)_70%,transparent)]",
  subtle: "bg-secondary text-secondary-foreground hover:bg-muted",
  outline: "border border-border bg-transparent hover:bg-secondary/70",
  ghost: "bg-transparent hover:bg-secondary/70",
  destructive: "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[0.95rem] gap-2.5",
  icon: "h-10 w-10",
};

/**
 * Exported on its own so links can wear the button without a <button>
 * wrapping an <a>, which is invalid and breaks keyboard navigation.
 */
export function buttonStyles(variant: Variant = "default", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-full font-medium tracking-tight",
    "transition-[transform,background-color,filter,box-shadow] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return <button className={buttonStyles(variant, size, className)} {...props} />;
}
