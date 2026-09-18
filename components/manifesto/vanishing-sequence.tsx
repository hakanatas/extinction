"use client";

import * as React from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { PixelCanvas } from "@/components/studio/pixel-canvas";
import {
  DEFAULT_SETTINGS,
  loadImage,
  prepareImage,
  solveMosaic,
  type Mosaic,
  type PixelSettings,
} from "@/lib/pixelate";
import { asset } from "@/lib/base-path";
import { cn, formatCount } from "@/lib/utils";

/* ── the argument, made scrollable ───────────────────────────────
 * The campaign's claim is that a population *is* a resolution. Saying
 * so is one sentence; watching it happen is the piece. So this section
 * pins one animal and walks its count down as the page scrolls: every
 * stop is a real solve at that many pixels, not a fade or a blur.
 *
 * Each stop re-solves rather than dropping cells from a fixed grid,
 * because that is the honest version — at 400 the cells are genuinely
 * bigger, the way a 400-pixel poster would be printed. Solving ten
 * times is affordable only because the image is analysed once and the
 * counts share it, which is what `prepareImage` exists for.
 * ─────────────────────────────────────────────────────────────── */

const STEPS: { count: number; line: string }[] = [
  { count: 12000, line: "Hâlâ bir orman dolusu. Portre kusursuz." },
  { count: 6400, line: "Yarıya indi. Görüntüde henüz bir şey değişmedi." },
  { count: 3200, line: "2010'da doğadaki tüm kaplanlar bu kadardı." },
  { count: 1600, line: "Her birey artık tek tek kayıt altında." },
  { count: 800, line: "Portre kenarlarından dağılmaya başlıyor." },
  { count: 400, line: "Bir alt tür, tek bir adada." },
  { count: 200, line: "İki yüz birey: hepsinin adı biliniyor." },
  { count: 100, line: "Yüz kaldı. Yüz de gidiyor." },
  { count: 40, line: "Kırk. Görüntü artık bir tahminden ibaret." },
  { count: 10, line: "On. Ekranda kalan bu." },
];

const SETTINGS: PixelSettings = {
  ...DEFAULT_SETTINGS,
  gap: 0.14,
  shape: "round",
  saturation: 1.15,
  contrast: 1.1,
  glow: true,
};

export function VanishingSequence() {
  const track = React.useRef<HTMLDivElement>(null);
  const [mosaics, setMosaics] = React.useState<(Mosaic | null)[]>(() => STEPS.map(() => null));
  const [index, setIndex] = React.useState(0);

  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length)));
    setIndex((current) => (current === next ? current : next));
  });

  // Analyse once, then solve the stops one per frame so the page stays
  // responsive while the sequence fills in behind the hero.
  React.useEffect(() => {
    let live = true;
    let frame = 0;

    loadImage(asset("/manifesto/creature.svg"))
      .then((img) => {
        if (!live) return;
        const prepared = prepareImage(img, SETTINGS);
        let i = 0;
        const step = () => {
          if (!live || i >= STEPS.length) return;
          const solved = solveMosaic(prepared, STEPS[i].count);
          const at = i;
          setMosaics((prev) => {
            const next = [...prev];
            next[at] = solved;
            return next;
          });
          i++;
          frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      })
      .catch(() => undefined);

    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  const step = STEPS[index];
  // Until this stop is solved, keep showing the last one that was — better a
  // slightly stale picture than an empty frame mid-scroll.
  const shown = React.useMemo(() => {
    for (let i = index; i >= 0; i--) if (mosaics[i]) return mosaics[i];
    return mosaics.find(Boolean) ?? null;
  }, [mosaics, index]);

  return (
    <section
      ref={track}
      style={{ height: `${STEPS.length * 46 + 50}vh` }}
      className="relative"
      aria-label="Sayı düştükçe portrenin dağılışı"
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden lg:flex-row">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative min-h-0 flex-1 p-6 pt-24 lg:p-14">
          <PixelCanvas mosaic={shown} settings={SETTINGS} animate={false} padding={0.02} />
        </div>

        <div className="relative flex shrink-0 flex-col justify-center gap-8 px-6 pb-14 lg:w-[42%] lg:px-14 lg:pb-0">
          <span className="eyebrow text-muted-foreground">Sayı düştükçe</span>

          <div>
            <span
              key={step.count}
              className="tabular animate-rise block font-mono text-[clamp(3.5rem,9vw,7rem)] leading-[0.9] text-ember-gradient"
            >
              {formatCount(step.count)}
            </span>
            <p className="mt-5 max-w-md text-balance text-xl leading-snug text-foreground/85 lg:text-2xl">
              {step.line}
            </p>
          </div>

          {/* one rung per stop: the whole descent is visible at a glance */}
          <ol className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <li
                key={s.count}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i <= index ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </ol>

          <p className="eyebrow-sm max-w-sm text-muted-foreground">
            Her durak gerçek bir çözüm: tuvalde tam o kadar piksel var.
          </p>
        </div>
      </div>
    </section>
  );
}
