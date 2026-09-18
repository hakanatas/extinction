"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ANIMATE_LIMIT, renderMosaic, type Mosaic, type PixelSettings } from "@/lib/pixelate";

/**
 * Paints a mosaic and keeps it painted: it re-renders on resize, on every
 * settings change, and runs the assemble animation whenever the mosaic
 * itself is replaced (a new solve), not when a colour slider moves.
 */
export function PixelCanvas({
  mosaic,
  settings,
  className,
  animate = true,
  duration = 900,
  padding = 0.04,
}: {
  mosaic: Mosaic | null;
  settings: PixelSettings;
  className?: string;
  animate?: boolean;
  duration?: number;
  padding?: number;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const frame = React.useRef<number>(0);
  const progress = React.useRef(1);

  const paint = React.useCallback(() => {
    const canvas = ref.current;
    if (!canvas || !mosaic) return;
    renderMosaic(canvas, mosaic, settings, {
      progress: progress.current,
      padding: Math.round(canvas.clientWidth * padding),
    });
  }, [mosaic, settings, padding]);

  // A new solve reassembles from nothing; everything else is an instant repaint.
  React.useEffect(() => {
    cancelAnimationFrame(frame.current);
    if (!mosaic) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Assembling means repainting every cell once a frame. That is a lovely
    // effect at three thousand cells and a frozen tab at a hundred thousand,
    // where the individual pixels are too small to be seen arriving anyway.
    if (!animate || reduced || mosaic.cells.length > ANIMATE_LIMIT) {
      progress.current = 1;
      paint();
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease out: the last pixels should settle rather than snap.
      progress.current = 1 - Math.pow(1 - t, 3);
      paint();
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [mosaic, animate, duration, paint]);

  React.useEffect(() => {
    if (progress.current >= 1) paint();
  }, [paint]);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [paint]);

  return <canvas ref={ref} className={cn("h-full w-full", className)} />;
}
