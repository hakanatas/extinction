"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowDown, ArrowRight, Images, MoveRight, Sigma, Upload } from "lucide-react";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { buttonStyles } from "@/components/ui/button";
import { Reveal, RevealWords } from "@/components/manifesto/reveal";
import { Ticker } from "@/components/manifesto/ticker";
import { VanishingSequence } from "@/components/manifesto/vanishing-sequence";
import { useWorks } from "@/lib/works-store";
import { asset } from "@/lib/base-path";
import { formatCount } from "@/lib/utils";

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

/** Widely cited field estimates; the point is the order of magnitude. */
const POPULATIONS = [
  { title: "Vaquita", count: 10 },
  { title: "Java gergedanı", count: 76 },
  { title: "Amur leoparı", count: 120 },
  { title: "Kakapo", count: 247 },
  { title: "Sumatra kaplanı", count: 400 },
  { title: "Kuzey Atlantik sağ balinası", count: 370 },
  { title: "Dev panda", count: 1864 },
  { title: "Vahşi kaplan", count: 3200 },
  { title: "Kar leoparı", count: 4500 },
  { title: "Sumatra orangutanı", count: 13800 },
];

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
        axis={50}
        className="h-[100svh] w-full"
      >
        {/* The corridor is bright at the edges, so the copy sits in its own well. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--background)_78%,transparent)_16%,color-mix(in_oklch,var(--background)_42%,transparent)_48%,var(--background)_90%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <span className="animate-rise eyebrow mb-7 rounded-full border border-border/70 bg-background/50 px-4 py-2 text-muted-foreground backdrop-blur">
            Population by Pixel · WWF Japan, 2008
          </span>

          <h1
            className="animate-rise max-w-5xl text-balance font-display text-[clamp(3.25rem,10vw,7.5rem)] leading-[0.92] tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            Kalan her birey,
            <br />
            <span className="text-ember-gradient italic">tek bir piksel.</span>
          </h1>

          <p
            className="animate-rise mt-8 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl"
            style={{ animationDelay: "160ms" }}
          >
            Bir tür ne kadar azaldıysa portresi o kadar çözünürlüğünü yitirir. Görseli ve
            kalan sayıyı ver; gerisini piksel motoru çözsün.
          </p>

          <div
            className="animate-rise mt-11 flex flex-wrap items-center justify-center gap-3"
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
            className="animate-rise absolute inset-x-0 bottom-8 flex flex-col items-center gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <div className="eyebrow-sm flex items-center gap-6 text-muted-foreground">
              <span className="tabular">{ready ? works.length : "—"} eser</span>
              <span className="h-3 w-px bg-border" />
              <span className="tabular">{ready ? formatCount(total) : "—"} piksel</span>
            </div>
            <ArrowDown className="animate-drift h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
        </div>
      </ImageStreamHero>

      {/* The numbers first, without commentary: they do their own arguing. */}
      <section className="border-y border-border bg-card/20 py-6">
        <Ticker items={POPULATIONS} duration={64} />
        <Ticker items={[...POPULATIONS].reverse()} duration={78} reverse className="opacity-55" />
      </section>

      <VanishingSequence />

      <section className="mx-auto w-full max-w-6xl px-6 py-32">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-tight">
              Sayı, görüntünün
              <br />
              <span className="italic text-muted-foreground">çözünürlüğü olur.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground lg:pt-4">
              Hakuhodo C&amp;D Tokyo'nun 2008 kampanyası basit bir denklem kurmuştu: geriye
              kaç birey kaldıysa, afişte o kadar piksel var. 3.200 pikselden yapılmış bir
              kaplan uzaktan hâlâ bir kaplan; yaklaştığınızda dağılıyor. Bu uygulama o
              denklemi bir araca çeviriyor.
            </p>
          </Reveal>
        </div>

        {/* full width below the copy: three narrow columns beside a headline
            squeeze the body text down to two words a line */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.09}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card/40 p-8 transition-colors duration-300 hover:border-primary/40">
                <div className="bg-lattice pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-40" />
                <span className="eyebrow-sm relative text-muted-foreground">0{i + 1}</span>
                <s.icon className="relative mt-8 h-6 w-6 text-primary" />
                <h3 className="relative mt-5 text-xl font-medium tracking-tight">{s.title}</h3>
                <p className="relative mt-3 text-[1.02rem] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/20">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center">
          <blockquote className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1.08] tracking-tight">
            <RevealWords text="Bir türü kaybetmek, önce onu göremez hâle gelmektir." />
          </blockquote>
          <Reveal delay={0.5}>
            <p className="mx-auto mt-10 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Tersi de mümkün. Korumanın kazandığı her birey, tabloya geri konan bir
              pikseldir — ve portre yeniden netleşir.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-28">
        <Reveal className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-end">
          <h2 className="max-w-xl text-balance font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.06] tracking-tight">
            Şimdi sayıyı sen ver.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/studio" className={buttonStyles("default", "lg", "group")}>
              Kendi posterini üret
              <MoveRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link href="/gallery" className={buttonStyles("outline", "lg")}>
              Galeri
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-border px-6 py-12 text-[0.95rem] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="max-w-xl">
          Extinction — kalan sayıyı görselleştiren bir stüdyo. İlham: WWF Japan “Population
          by Pixel”, Hakuhodo C&amp;D Tokyo.
        </span>
        <span className="eyebrow-sm">Tüm işlem tarayıcıda, sunucusuz.</span>
      </footer>
    </main>
  );
}
