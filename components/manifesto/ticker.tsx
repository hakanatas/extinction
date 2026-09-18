"use client";

import { cn, formatCount } from "@/lib/utils";

export type TickerItem = { title: string; count: number };

/**
 * An endless band of species and counts. The track holds the list twice and
 * slides exactly half its width, so the loop has no seam and no JavaScript.
 */
export function Ticker({
  items,
  duration = 52,
  reverse = false,
  className,
}: {
  items: TickerItem[];
  duration?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden py-5", className)}>
      {/* the band fades out instead of being cut by the frame */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-background to-transparent" />

      <div
        className="animate-marquee flex w-max items-center gap-12"
        style={{
          ["--marquee-duration" as string]: `${duration}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-12" aria-hidden={copy === 1}>
            {items.map((item) => (
              <span key={`${copy}-${item.title}`} className="flex shrink-0 items-baseline gap-3">
                <span className="text-lg tracking-tight text-foreground/80">{item.title}</span>
                <span className="tabular font-mono text-lg text-primary">
                  {formatCount(item.count)}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
