"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCheck,
  CloudUpload,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Play,
  Plus,
  SquareDashed,
  Trash2,
  X,
} from "lucide-react";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { buttonStyles } from "@/components/ui/button";
import { statusOf, useWorks, type GalleryWork } from "@/lib/works-store";
import { useAdminDialog } from "@/components/admin-gate";
import { cn, formatCount } from "@/lib/utils";

export default function GalleryPage() {
  const { works, ready, selected, isSelected, toggle, remove, selectAll, isAdmin, publish, busy } =
    useWorks();
  const [open, setOpen] = React.useState<GalleryWork | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const openAdmin = useAdminDialog();

  const totalPixels = selected.reduce((s, w) => s + w.count, 0);
  const unpublished = works.filter((w) => w.origin === "local" && !w.pendingPublish).length;

  const act = async (run: () => Promise<void>) => {
    setError(null);
    try {
      await run();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem tamamlanamadı.");
    }
  };

  return (
    <main className="min-h-screen pb-24">
      {/* A shallow slice of the corridor, running the deck — the gallery's own
          contents, already moving. */}
      <section className="relative h-[46svh] min-h-[320px] w-full overflow-hidden border-b border-border">
        {works.length > 0 ? (
          <ImageStreamHero
            images={(selected.length ? selected : works).map((w) => ({ src: w.poster, alt: w.title }))}
            cards={9}
            speed={26}
            axis={50}
            className="absolute inset-0"
          />
        ) : (
          <div className="bg-lattice absolute inset-0 opacity-30" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--background)_8%,color-mix(in_oklch,var(--background)_55%,transparent)_65%,color-mix(in_oklch,var(--background)_30%,transparent)_100%)]" />

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-6 pb-10">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Galeri</h1>
          <div className="eyebrow-sm mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
            <span className="tabular">{ready ? works.length : "—"} eser</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span className="tabular">{selected.length} sunumda</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span className="tabular">{formatCount(totalPixels)} piksel</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <div className="sticky top-20 z-30 -mx-6 mb-8 flex flex-wrap items-center justify-between gap-3 px-6 py-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => selectAll(selected.length !== works.length)}
              disabled={!works.length}
              className={buttonStyles("outline", "sm")}
            >
              {selected.length === works.length && works.length > 0 ? (
                <SquareDashed className="h-3.5 w-3.5" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              {selected.length === works.length && works.length > 0 ? "Seçimi kaldır" : "Tümünü seç"}
            </button>
            <Link href="/studio" className={buttonStyles("ghost", "sm")}>
              <Plus className="h-3.5 w-3.5" />
              Yeni eser
            </Link>
          </div>

          <Link
            href="/present"
            className={cn(buttonStyles("default", "sm"), !selected.length && "pointer-events-none opacity-40")}
          >
            <Play className="h-3 w-3 fill-current" />
            Sunumu başlat
          </Link>
        </div>

        {error && (
          <p className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-[0.95rem] text-destructive">
            {error}
          </p>
        )}

        {/* The way to publish should be in front of whoever has something
            unpublished, not hidden behind an unlabelled key in the nav. */}
        {unpublished > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/40 px-4 py-3">
            <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
              {unpublished} eser yalnızca bu cihazda duruyor.{" "}
              {isAdmin
                ? "Herkesin görmesi için kartın sağ üstündeki bulut simgesine basın."
                : "Herkesin görebilmesi için yönetici girişi yapın."}
            </p>
            {!isAdmin && (
              <button onClick={openAdmin} className={buttonStyles("outline", "sm")}>
                <KeyRound className="h-3.5 w-3.5" />
                Yönetici girişi
              </button>
            )}
          </div>
        )}

        {ready && works.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((w, i) => (
              <Card
                key={w.id}
                work={w}
                index={i}
                selected={isSelected(w.id)}
                busy={busy === w.id}
                canPublish={isAdmin && w.origin === "local" && !w.pendingPublish}
                canDelete={w.origin === "local" || isAdmin}
                onToggle={() => toggle(w.id)}
                onOpen={() => setOpen(w)}
                onPublish={() => act(() => publish(w))}
                onDelete={() => act(() => remove(w))}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <Lightbox
            work={open}
            canDelete={open.origin === "local" || isAdmin}
            onClose={() => setOpen(null)}
            onDelete={() => {
              const target = open;
              setOpen(null);
              act(() => remove(target));
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function Card({
  work,
  index,
  selected,
  busy,
  canPublish,
  canDelete,
  onToggle,
  onOpen,
  onPublish,
  onDelete,
}: {
  work: GalleryWork;
  index: number;
  selected: boolean;
  busy: boolean;
  canPublish: boolean;
  canDelete: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const status = statusOf(work.status);
  const [confirm, setConfirm] = React.useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card/40 transition-all duration-300",
        selected ? "border-primary/50 ring-glow" : "border-border hover:border-foreground/25",
      )}
    >
      <button onClick={onOpen} className="block w-full cursor-zoom-in" aria-label={`${work.title} posterini aç`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-background/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={work.poster}
            alt={work.title}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span
            className="absolute left-3 top-3 rounded-full px-2 py-0.5 font-mono text-[0.75rem] text-background"
            style={{ background: status.tone }}
            title={status.label}
          >
            {status.short}
          </span>

          {work.origin === "local" && (
            <span className="absolute bottom-3 left-3 rounded-full border border-border bg-background/80 px-2.5 py-1 font-mono text-[0.72rem] text-muted-foreground backdrop-blur">
              {work.pendingPublish ? "yayınlanıyor…" : "yalnızca bu cihazda"}
            </span>
          )}
        </div>
      </button>

      <div className="flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium tracking-tight">{work.title}</h3>
          <p className="truncate font-display text-[0.95rem] italic text-muted-foreground">
            {work.latin || work.region || "—"}
          </p>
        </div>
        <span className="tabular shrink-0 font-mono text-xl leading-none text-primary">
          {formatCount(work.count)}
        </span>
      </div>

      {/* Actions ride in on hover so they never cover the poster at rest —
          except where there is no hover to ride in on: on a touch screen
          they would simply be unreachable, so there they stay put. */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        <IconAction
          onClick={onToggle}
          active={selected}
          title={selected ? "Sunumdan çıkar" : "Sunuma ekle"}
        >
          {selected ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </IconAction>

        <Link href={`/studio?id=${work.id}`} className={iconClass(false)} title="Stüdyoda aç">
          <Pencil className="h-3.5 w-3.5" />
        </Link>

        {canPublish && (
          <IconAction onClick={onPublish} title="Yayınla — herkes görsün" disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
          </IconAction>
        )}

        {canDelete && (
          // Two taps, and the second one says what it will do: a single
          // mis-tap should never be able to destroy a work.
          <button
            onClick={() => (confirm ? onDelete() : setConfirm(true))}
            onBlur={() => setConfirm(false)}
            disabled={busy}
            title={confirm ? "Silmek için tekrar dokun" : work.origin === "published" ? "Yayından kaldır" : "Sil"}
            className={cn(
              iconClass(false, confirm),
              confirm && "w-auto gap-1.5 px-3 text-[0.78rem] font-medium",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirm && <span>{work.origin === "published" ? "Kaldır?" : "Sil?"}</span>}
          </button>
        )}
      </div>
    </motion.article>
  );
}

function iconClass(active: boolean, danger = false) {
  return cn(
    "flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition-colors disabled:opacity-50",
    danger
      ? "border-destructive/50 bg-destructive/20 text-destructive"
      : active
        ? "border-primary/60 bg-primary/20 text-primary"
        : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
  );
}

function IconAction({
  children,
  active = false,
  danger = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean; danger?: boolean }) {
  return (
    <button className={iconClass(active, danger)} {...props}>
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-border bg-card/20 px-6 py-24 text-center">
      <p className="font-display text-3xl tracking-tight">Galeri henüz boş</p>
      <p className="max-w-md text-base leading-relaxed text-muted-foreground">
        Stüdyoda bir görsel ve kalan birey sayısı verin; ürettiğiniz her poster buraya
        düşsün, yayınlananları herkes görsün.
      </p>
      <Link href="/studio" className={buttonStyles("default", "lg")}>
        <Plus className="h-4 w-4" />
        İlk eseri üret
      </Link>
    </div>
  );
}

function Lightbox({
  work,
  canDelete,
  onClose,
  onDelete,
}: {
  work: GalleryWork;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [showSource, setShowSource] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const status = statusOf(work.status);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-6 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative grid w-full max-w-5xl gap-8 md:grid-cols-[1.2fr_0.8fr]"
      >
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card/40"
          onMouseEnter={() => setShowSource(true)}
          onMouseLeave={() => setShowSource(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={work.poster} alt={work.title} className="h-full w-full object-contain" />
          {/* Hovering reveals the photograph underneath — the piece is only
              legible as a loss once you've seen what it was. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={work.source}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
              showSource ? "opacity-100" : "opacity-0",
            )}
          />
          <span className="eyebrow-sm pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/70 px-3 py-1 text-muted-foreground backdrop-blur">
            {showSource ? "kaynak" : "üstüne gel: kaynak"}
          </span>
        </div>

        <div className="flex flex-col justify-center gap-6">
          <div>
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[0.75rem] text-background"
              style={{ background: status.tone }}
            >
              {status.short} · {status.label}
            </span>
            <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight">{work.title}</h2>
            {work.latin && (
              <p className="mt-1 font-display text-lg italic text-muted-foreground">{work.latin}</p>
            )}
          </div>

          <div className="space-y-1">
            <span className="tabular block font-mono text-5xl text-ember-gradient">
              {formatCount(work.count)}
            </span>
            <span className="eyebrow-sm text-muted-foreground">kalan birey = piksel</span>
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
            <Meta label="Bölge" value={work.region || "—"} />
            <Meta label="Izgara" value={`${work.cols} × ${work.rows}`} />
            <Meta label="Çözüm" value={work.settings.mode === "subject" ? "Konu" : "Tam kare"} />
            <Meta
              label="Durum"
              value={
                work.origin === "published"
                  ? "Yayında"
                  : work.pendingPublish
                    ? "Yayınlanıyor"
                    : "Bu cihazda"
              }
            />
          </dl>

          {work.note && <p className="text-base leading-relaxed text-muted-foreground">{work.note}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/studio?id=${work.id}`} className={buttonStyles("outline", "sm")}>
              <Pencil className="h-3.5 w-3.5" />
              Stüdyoda aç
            </Link>
            <Link href="/present" className={buttonStyles("default", "sm")}>
              <Play className="h-3 w-3 fill-current" />
              Sunumda göster
            </Link>
            {canDelete && (
              <button
                onClick={() => (confirm ? onDelete() : setConfirm(true))}
                onBlur={() => setConfirm(false)}
                className={buttonStyles("destructive", "sm", "ml-auto")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirm
                  ? "Emin misin?"
                  : work.origin === "published"
                    ? "Yayından kaldır"
                    : "Sil"}
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute -top-2 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:text-foreground md:-right-12 md:top-0"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 tabular">{value}</dd>
    </div>
  );
}
