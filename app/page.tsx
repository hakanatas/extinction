"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowRight, Images, MoveRight, Sigma, Upload } from "lucide-react";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { buttonStyles } from "@/components/ui/button";
import { useWorks } from "@/lib/works-store";
import { formatCount } from "@/lib/utils";
import { asset } from "@/lib/base-path";

/** Shown until the user has made work of their own. */
const SAMPLES = [
  "vaquita",
  "amur",
  "kakapo",
  "rhino",
  "saola",
  "axolotl",
  "condor",
  "pangolin",
].map((n) => ({ src: asset(`/samples/${n}.svg`), alt: `${n} piksel portresi` }));

const STEPS = [
  {
    icon: Upload,
    title: "Görseli bırak",
    body: "Bir fotoğraf sürükle. Şeffaf arka planlı bir PNG en temiz siluete ulaşır, ama düz bir fotoğraf da yeter.",
  },
  {
    icon: Sigma,
    title: "Kalan sayıyı yaz",
    body: "3.200 yazarsan tuvale tam 3.200 piksel düşer. Yoğunluk ve eşik, sayı tutana kadar birlikte çözülür.",
  },
  {
    icon: Images,
    title: "Galeriye ve sunuma taşı",
    body: "Beğendiklerini seç; koridor akışı ve tam ekran sunum, seçtiğin işlerden anında kurulur.",
  },
];

export default function Home() {
  const { works, ready } = useWorks();

  const images = React.useMemo(() => {
    const own = works.filter((w) => w.poster).map((w) => ({ src: w.poster, alt: w.title }));
    // The corridor wants a dozen cards; pad with samples until the user has that many.
    return own.length >= 5 ? own : [...own, ...SAMPLES].slice(0, 12);
  }, [works]);

  const total = works.reduce((sum, w) => sum + w.count, 0);

  return (
    <main className="min-h-screen">
      <ImageStreamHero
        images={images}
        cards={10}
        speed={22}
        axis={52}
        className="h-[100svh] w-full"
      >
        {/* The corridor is bright at the edges, so the copy sits in its own well. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--background)_78%,transparent)_16%,color-mix(in_oklch,var(--background)_42%,transparent)_48%,var(--background)_90%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <span className="animate-rise mb-6 rounded-full border border-border/70 bg-background/50 px-4 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
            Population by Pixel · WWF Japan, 2008
          </span>

          <h1
            className="animate-rise max-w-4xl text-balance font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.5rem]"
            style={{ animationDelay: "80ms" }}
          >
            Kalan her birey,
            <br />
            <span className="text-ember-gradient italic">tek bir piksel.</span>
          </h1>

          <p
            className="animate-rise mt-7 max-w-xl text-balance text-[0.98rem] leading-relaxed text-muted-foreground"
            style={{ animationDelay: "160ms" }}
          >
            Bir tür ne kadar azaldıysa portresi o kadar çözünürlüğünü yitirir. Görseli ve
            kalan sayıyı ver; gerisini piksel motoru çözsün.
          </p>

          <div
            className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <Link href="/studio" className={buttonStyles("default", "lg", "group")}>
              Stüdyoyu aç
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link href="/gallery" className={buttonStyles("outline", "lg")}>
              Galeriye bak
            </Link>
          </div>

          <div
            className="animate-rise absolute inset-x-0 bottom-8 flex items-center justify-center gap-8 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground"
            style={{ animationDelay: "320ms" }}
          >
            <span className="tabular">{ready ? works.length : "—"} eser</span>
            <span className="h-3 w-px bg-border" />
            <span className="tabular">{ready ? formatCount(total) : "—"} piksel</span>
          </div>
        </div>
      </ImageStreamHero>

      <section className="mx-auto w-full max-w-6xl px-6 py-28">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              Sayı, görüntünün
              <br />
              <span className="italic text-muted-foreground">çözünürlüğü olur.</span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              Hakuhodo C&amp;D Tokyo'nun 2008 kampanyası basit bir denklem kurmuştu: geriye
              kaç birey kaldıysa, afişte o kadar piksel var. 3.200 pikselden yapılmış bir
              kaplan, uzaktan hâlâ bir kaplan; yaklaştığınızda dağılıyor. Bu uygulama o
              denklemi bir araca çeviriyor.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:gap-5">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 transition-colors duration-300 hover:border-primary/40"
              >
                <div className="bg-lattice pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-40" />
                <span className="relative font-mono text-xs text-muted-foreground">
                  0{i + 1}
                </span>
                <s.icon className="relative mt-6 h-5 w-5 text-primary" />
                <h3 className="relative mt-4 text-base font-medium tracking-tight">{s.title}</h3>
                <p className="relative mt-2 text-[0.82rem] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-20 sm:flex-row sm:items-end sm:justify-between">
          <blockquote className="max-w-2xl font-display text-2xl leading-snug tracking-tight sm:text-3xl">
            “Bu poster {formatCount(3200)} pikselden oluşuyor; çünkü doğada
            <span className="text-ember-gradient"> {formatCount(3200)} kaplan </span>
            kaldı.”
          </blockquote>
          <Link
            href="/studio"
            className="group flex shrink-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Kendi posterini üret
            <MoveRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-12 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Extinction — kalan sayıyı görselleştiren bir stüdyo. İlham: WWF Japan “Population
          by Pixel”, Hakuhodo C&amp;D Tokyo.
        </span>
        <span className="font-mono tracking-wider">Tüm işlem tarayıcıda, sunucusuz.</span>
      </footer>
    </main>
  );
}
