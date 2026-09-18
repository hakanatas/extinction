import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TR = new Intl.NumberFormat("tr-TR");

/** 3200 -> "3.200" */
export function formatCount(n: number) {
  return TR.format(Math.round(n));
}

/** 3200 -> "3,2 bin", 1200000 -> "1,2 milyon" — for tight chrome only. */
export function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} milyon`;
  if (n >= 10_000) return `${Math.round(n / 1000)} bin`;
  return TR.format(Math.round(n));
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
