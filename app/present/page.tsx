"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, X } from "lucide-react";
import { PixelCanvas } from "@/components/studio/pixel-canvas";
import { buttonStyles } from "@/components/ui/button";
import { buildMosaic, loadImage, type Mosaic } from "@/lib/pixelate";
import { statusOf, useWorks } from "@/lib/works-store";
import type { Work } from "@/lib/db";
import { cn, formatCount } from "@/lib/utils";

const AUTOPLAY_MS = 9000;

export default function PresentPage() {
  const router = useRouter();
  const { selected, works, ready } = useWorks();

  // Fall back to everything, so hitting the route directly still shows something.
  const deck = selected.length ? selected : works;
  // An opening and a closing card turn a pile of posters into a talk.
  const slides = deck.length + 2;

  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);

  const go = React.useCallback(
    (delta: number) => setIndex((i) => Math.min(slides - 1, Math.max(0, i + delta))),
    [slides],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        else router.push("/gallery");
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "p") {
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, router]);

  React.useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      // Stop at the closing card rather than looping into the intro again.
      setIndex((i) => (i >= slides - 1 ? i : i + 1));
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [playing, index, slides]);

  if (ready && deck.length === 0) return <NothingSelected />;

  const work = index > 0 && index <= deck.length ? deck[index - 1] : null;
  const total = deck.reduce((s, w) => s + w.count, 0);

  return (
    <main
      className="relative h-[100svh] w-full overflow-hidden bg-background"
      onClick={(e) => {
        // Click-to-advance, the way a remote behaves; the left eighth goes back.
        const x = e.clientX / window.innerWidth;
        go(x < 0.12 ? -1 : 1);
      }}
    >
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />

      <AnimatePresence mode="wait">
        {index === 0 && <IntroSlide key="intro" count={deck.length} total={total} />}
        {work && <WorkSlide key={work.id} work={work} />}
        {index === slides - 1 && <OutroSlide key="outro" deck={deck} total={total} />}
      </AnimatePresence>

      {/* ── chrome ─────────────────────────────────────────────
          Everything here stops the click-to-advance handler, so the
          controls never double as a page turn. */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-4 px-6 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <ChromeButton onClick={() => go(-1)} disabled={index === 0} label="Önceki">
            <ChevronLeft className="h-4 w-4" />
          </ChromeButton>
          <ChromeButton onClick={() => go(1)} disabled={index === slides - 1} label="Sonraki">
            <ChevronRight className="h-4 w-4" />
          </ChromeButton>
          <ChromeButton onClick={() => setPlaying((p) => !p)} label={playing ? "Duraklat" : "Oynat"}>
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          </ChromeButton>
        </div>

        <div className="relative h-px flex-1 bg-border">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${(index / (slides - 1)) * 100}%` }}
          />
          {/* one tick per poster, so the audience can see how long is left */}
          <div className="absolute inset-0 flex justify-between">
            {Array.from({ length: slides }, (_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}. slayt`}
                className="relative -top-2 h-4 w-4"
              >
                <span
                  className={cn(
                    "block h-1 w-1 rounded-full transition-colors",
                    i <= index ? "bg-primary" : "bg-border",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <span className="tabular font-mono text-[0.8rem] uppercase tracking-[0.18em] text-muted-foreground">
          {String(index + 1).padStart(2, "0")} / {String(slides).padStart(2, "0")}
        </span>

        <div className="flex items-center gap-1.5">
          <ChromeButton onClick={toggleFullscreen} label="Tam ekran">
            <Maximize2 className="h-3.5 w-3.5" />
          </ChromeButton>
          <Link
            href="/gallery"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
            aria-label="Sunumdan çık"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  else document.documentElement.requestFullscreen().catch(() => undefined);
}

function ChromeButton({
  children,
  label,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground backdrop-blur transition-colors hover:text-foreground disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

function IntroSlide({ count, total }: { count: number; total: number }) {
  return (
    <motion.section
      {...fade}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center"
    >
      <span lang="en" className="font-mono text-[0.8rem] uppercase tracking-[0.24em] text-muted-foreground">
        Extinction
      </span>
      <h1 className="mt-8 max-w-4xl text-balance font-display text-6xl leading-[0.95] tracking-tight sm:text-8xl">
        Kalan her birey,
        <br />
        <span className="text-ember-gradient italic">tek bir piksel.</span>
      </h1>
      <p className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
        <span className="tabular text-foreground">{count}</span> tür ·{" "}
        <span className="tabular text-foreground">{formatCount(total)}</span> birey
      </p>

      {/* The room should know whose idea this was, and that this is not it. */}
      <p className="absolute inset-x-0 bottom-24 px-8 text-[0.82rem] text-muted-foreground/70">
        WWF Japan'ın 2008 “Population by Pixel” kampanyasından ilhamla
      </p>
    </motion.section>
  );
}

function WorkSlide({ work }: { work: Work }) {
  const [mosaic, setMosaic] = React.useState<Mosaic | null>(null);
  const status = statusOf(work.status);

  // Rebuilt rather than shown as a stored PNG, so the mosaic can assemble
  // itself in front of the audience.
  React.useEffect(() => {
    let live = true;
    loadImage(work.source)
      .then((img) => live && setMosaic(buildMosaic(img, work.count, work.settings)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [work]);

  return (
    <motion.section {...fade} className="absolute inset-0 z-10 flex flex-col lg:flex-row">
      <div className="relative min-h-0 flex-1 p-8 lg:p-16">
        {mosaic ? (
          <PixelCanvas mosaic={mosaic} settings={work.settings} duration={1600} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={work.poster} alt={work.title} className="h-full w-full object-contain opacity-40" />
        )}
      </div>

      <div className="flex shrink-0 flex-col justify-center gap-7 px-8 pb-24 lg:w-[38%] lg:px-14 lg:pb-16">
        <div>
          <span
            className="rounded-full px-2.5 py-1 font-mono text-[0.75rem] text-background"
            style={{ background: status.tone }}
          >
            {status.short} · {status.label}
          </span>
          <h2 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight lg:text-6xl">
            {work.title}
          </h2>
          {work.latin && (
            <p className="mt-2 font-display text-xl italic text-muted-foreground">{work.latin}</p>
          )}
        </div>

        <div>
          <CountUp value={work.count} />
          <p className="mt-2 font-mono text-[0.8rem] uppercase tracking-[0.2em] text-muted-foreground">
            kalan birey · ekrandaki piksel
          </p>
        </div>

        {work.region && (
          <p className="font-mono text-[0.82rem] uppercase tracking-[0.16em] text-muted-foreground">
            {work.region}
          </p>
        )}

        {work.note && (
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">{work.note}</p>
        )}
      </div>
    </motion.section>
  );
}

function OutroSlide({ deck, total }: { deck: Work[]; total: number }) {
  return (
    <motion.section
      {...fade}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-10 px-8 text-center"
    >
      <h2 className="max-w-3xl text-balance font-display text-5xl leading-tight tracking-tight sm:text-7xl">
        Hepsi birlikte
        <br />
        <span className="text-ember-gradient tabular">{formatCount(total)}</span> piksel.
      </h2>

      <ul className="flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {deck.map((w) => (
          <li key={w.id} className="font-mono text-[0.82rem] uppercase tracking-[0.16em] text-muted-foreground">
            {w.title} <span className="tabular text-foreground">{formatCount(w.count)}</span>
          </li>
        ))}
      </ul>

      <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
        Sayı küçüldükçe görüntü dağılır. Tersi de mümkün: her kazanılan birey, tabloya bir
        piksel geri koyar.
      </p>
    </motion.section>
  );
}

/** Rolls the count up on entry — the number is the headline, so it moves. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1400;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 4))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className="tabular block font-mono text-6xl leading-none text-ember-gradient lg:text-7xl">
      {formatCount(shown)}
    </span>
  );
}

function NothingSelected() {
  return (
    <main className="flex h-[100svh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-4xl tracking-tight">Sunulacak eser yok</p>
      <p className="max-w-md text-base leading-relaxed text-muted-foreground">
        Galeriden en az bir eser seç ya da stüdyoda yeni bir poster üret.
      </p>
      <div className="flex gap-2">
        <Link href="/gallery" className={buttonStyles("outline", "md")}>
          Galeriye dön
        </Link>
        <Link href="/studio" className={buttonStyles("default", "md")}>
          Stüdyoya git
        </Link>
      </div>
    </main>
  );
}
