"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Download,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  TriangleAlert,
} from "lucide-react";
import { PixelCanvas } from "@/components/studio/pixel-canvas";
import { Button } from "@/components/ui/button";
import { Input, Label, Segmented, Slider, Switch, Textarea } from "@/components/ui/field";
import {
  DEFAULT_SETTINGS,
  MAX_CELLS,
  capacityOf,
  fileToDataUrl,
  loadImage,
  mosaicToDataUrl,
  prepareImage,
  solveMosaic,
  type Mosaic,
  type PixelMode,
  type PixelSettings,
  type PixelShape,
  type PreparedImage,
} from "@/lib/pixelate";
import { STATUSES, useWorks } from "@/lib/works-store";
import type { Work } from "@/lib/db";
import { cn, formatCount, uid } from "@/lib/utils";

/** Counts are the point of the piece, so a few real ones are one tap away. */
const PRESETS = [
  { title: "Vaquita", latin: "Phocoena sinus", count: 10, status: "CR", region: "Kaliforniya Körfezi" },
  { title: "Amur Leoparı", latin: "Panthera pardus orientalis", count: 120, status: "CR", region: "Rusya Uzak Doğu" },
  { title: "Java Gergedanı", latin: "Rhinoceros sondaicus", count: 76, status: "CR", region: "Ujung Kulon" },
  { title: "Kakapo", latin: "Strigops habroptilus", count: 247, status: "CR", region: "Yeni Zelanda" },
  { title: "Sumatra Kaplanı", latin: "Panthera tigris sumatrae", count: 400, status: "CR", region: "Sumatra" },
  { title: "Dev Panda", latin: "Ailuropoda melanoleuca", count: 1864, status: "VU", region: "Çin" },
  { title: "Vahşi Kaplan", latin: "Panthera tigris", count: 3200, status: "EN", region: "Asya" },
];

export default function StudioPage() {
  return (
    <React.Suspense fallback={null}>
      <Studio />
    </React.Suspense>
  );
}

function Studio() {
  const params = useSearchParams();
  const { save, byId, ready } = useWorks();

  const [source, setSource] = React.useState<string | null>(null);
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  const [target, setTarget] = React.useState(3200);
  const [settings, setSettings] = React.useState<PixelSettings>(DEFAULT_SETTINGS);
  const [meta, setMeta] = React.useState({ title: "", latin: "", region: "", status: "CR", note: "" });
  const [prepared, setPrepared] = React.useState<PreparedImage | null>(null);
  const [mosaic, setMosaic] = React.useState<Mosaic | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<string | null>(null);

  const patch = (p: Partial<PixelSettings>) => setSettings((s) => ({ ...s, ...p }));

  /* Re-open a saved work for another pass. */
  const editId = params.get("id");
  React.useEffect(() => {
    if (!editId || !ready) return;
    const work = byId(editId);
    if (!work) return;
    setEditing(work.id);
    setTarget(work.count);
    setSettings(work.settings);
    setMeta({
      title: work.title,
      latin: work.latin,
      region: work.region,
      status: work.status,
      note: work.note,
    });
    setSource(work.source);
  }, [editId, ready, byId]);

  React.useEffect(() => {
    if (!source) {
      setImg(null);
      setMosaic(null);
      return;
    }
    let live = true;
    loadImage(source)
      .then((el) => live && setImg(el))
      .catch(() => live && setError("Görsel açılamadı."));
    return () => {
      live = false;
    };
  }, [source]);

  /* Reading the pixels is the expensive half and it doesn't depend on the
   * count, so it happens once per picture (and per way of cutting the subject
   * out of it). Typing a new number then only re-runs the solve. */
  const { mode, tolerance } = settings;
  React.useEffect(() => {
    if (!img) {
      setPrepared(null);
      return;
    }
    setBusy(true);
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          setPrepared(prepareImage(img, { ...DEFAULT_SETTINGS, mode, tolerance }));
          setError(null);
        } catch {
          setError("Görsel çözümlenemedi.");
          setBusy(false);
        }
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [img, mode, tolerance]);

  /** What this picture can actually carry — the input is clamped to it. */
  const capacity = React.useMemo(
    () => (prepared ? Math.min(MAX_CELLS, capacityOf(prepared)) : MAX_CELLS),
    [prepared],
  );

  React.useEffect(() => {
    if (!prepared) return;
    setBusy(true);
    const timer = window.setTimeout(() => {
      // Yield a frame first, so the spinner paints before the synchronous
      // solve takes the thread.
      requestAnimationFrame(() => {
        try {
          setMosaic(solveMosaic(prepared, Math.min(target, capacity)));
          setError(null);
        } catch {
          setError("Piksel çözümü başarısız oldu.");
        } finally {
          setBusy(false);
          setSaved(false);
        }
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [prepared, target, capacity]);

  const onFile = React.useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Bu bir görsel dosyası değil.");
      return;
    }
    setError(null);
    setEditing(null);
    try {
      setSource(await fileToDataUrl(file));
    } catch {
      setError("Dosya okunamadı.");
    }
  }, []);

  const onSave = async () => {
    if (!mosaic || !source) return;
    const previous = editing ? byId(editing) : undefined;
    const work: Work = {
      id: editing ?? uid(),
      title: meta.title.trim() || "İsimsiz tür",
      latin: meta.latin.trim(),
      region: meta.region.trim(),
      status: meta.status,
      note: meta.note.trim(),
      count: mosaic.target,
      actual: mosaic.count,
      cols: mosaic.cols,
      rows: mosaic.rows,
      settings,
      source,
      poster: mosaicToDataUrl(mosaic, settings, 1100),
      createdAt: previous?.createdAt ?? Date.now(),
      selected: previous?.selected ?? true,
    };
    await save(work);
    setEditing(work.id);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  const onDownload = () => {
    if (!mosaic) return;
    const a = document.createElement("a");
    a.href = mosaicToDataUrl(mosaic, settings, 2400);
    a.download = `${(meta.title || "extinction").toLowerCase().replace(/\s+/g, "-")}-${target}px.png`;
    a.click();
  };

  return (
    <main className="flex min-h-screen flex-col pt-20 lg:h-screen lg:flex-row lg:overflow-hidden lg:pt-0">
      {/* ── stage ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[62svh] flex-1 items-center justify-center p-6 lg:min-h-0 lg:p-10 lg:pt-24">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.35]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_88%)]" />

        {!source ? (
          <Dropzone onFile={onFile} />
        ) : (
          <div className="relative flex h-full max-h-[78vh] w-full max-w-3xl flex-col">
            <div className="relative min-h-0 flex-1">
              <PixelCanvas mosaic={mosaic} settings={settings} />
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                </div>
              )}
            </div>
            <Readout mosaic={mosaic} target={Math.min(target, capacity)} />
          </div>
        )}

        {error && (
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            <TriangleAlert className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </section>

      {/* ── panel ─────────────────────────────────────────────── */}
      <aside className="glass flex w-full shrink-0 flex-col border-t border-border lg:h-full lg:w-[384px] lg:border-l lg:border-t-0">
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-6 lg:pt-24">
          <div>
            <h1 className="font-display text-3xl tracking-tight">Stüdyo</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Görseli bırak, kalan sayıyı yaz. Tuvale tam o kadar piksel düşer.
            </p>
          </div>

          <Group title="Kaynak">
            <FilePicker onFile={onFile} hasSource={!!source} />
          </Group>

          <Group title="Kalan birey">
            <div className="relative">
              <Input
                type="number"
                min={1}
                max={capacity}
                value={target}
                onChange={(e) =>
                  setTarget(Math.max(1, Math.min(MAX_CELLS, Number(e.target.value) || 1)))
                }
                className="h-16 pr-16 font-mono text-3xl tracking-tight"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[0.78rem] uppercase tracking-widest text-muted-foreground">
                piksel
              </span>
            </div>
            {target > capacity && (
              <p className="text-[0.85rem] leading-relaxed text-primary/90">
                Bu görselin konusu en fazla {formatCount(capacity)} piksel taşıyabiliyor;
                tuval o sayıda çözüldü. Daha büyük bir sayı için kadrajı daha dolu bir
                görsel seçin ya da “Tam kare” moduna geçin.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setTarget(p.count);
                    setMeta((m) => ({
                      ...m,
                      title: p.title,
                      latin: p.latin,
                      status: p.status,
                      region: p.region,
                    }));
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-[0.85rem] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {p.title}
                  <span className="tabular ml-1.5 text-foreground/50">{formatCount(p.count)}</span>
                </button>
              ))}
            </div>
          </Group>

          <Group title="Piksel çözümü">
            <Segmented<PixelMode>
              value={settings.mode}
              onValueChange={(mode) => patch({ mode })}
              options={[
                { value: "subject", label: "Konu" },
                { value: "frame", label: "Tam kare" },
              ]}
            />
            {settings.mode === "subject" ? (
              <>
                <Slider
                  label="Arka plan eşiği"
                  value={settings.tolerance}
                  min={2}
                  max={70}
                  step={1}
                  format={(v) => `${v}`}
                  onValueChange={(tolerance) => patch({ tolerance })}
                />
                <p className="text-[0.85rem] leading-relaxed text-muted-foreground">
                  Eşik, kenarlardan örneklenen arka plan rengine ne kadar yakın tonların
                  silineceğini belirler. Şeffaf PNG'lerde doğrudan alfa kanalı kullanılır.
                </p>
              </>
            ) : (
              <p className="text-[0.85rem] leading-relaxed text-muted-foreground">
                Tüm kare bir ızgaraya bölünür; sayı satır × sütun olarak karşılanır.
              </p>
            )}
          </Group>

          <Group title="Piksel biçimi">
            <Segmented<PixelShape>
              value={settings.shape}
              onValueChange={(shape) => patch({ shape })}
              options={[
                { value: "square", label: "Kare" },
                { value: "round", label: "Yuvarlak" },
                { value: "dot", label: "Nokta" },
              ]}
            />
            <Slider
              label="Aralık"
              value={settings.gap}
              min={0}
              max={0.45}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onValueChange={(gap) => patch({ gap })}
            />
            {settings.shape === "round" && (
              <Slider
                label="Köşe"
                value={settings.radius}
                min={0}
                max={0.5}
                step={0.01}
                format={(v) => `${Math.round(v * 200)}%`}
                onValueChange={(radius) => patch({ radius })}
              />
            )}
          </Group>

          <Group title="Renk">
            <Slider
              label="Kontrast"
              value={settings.contrast}
              min={0.6}
              max={1.8}
              step={0.02}
              onValueChange={(contrast) => patch({ contrast })}
            />
            <Slider
              label="Doygunluk"
              value={settings.saturation}
              min={0}
              max={2}
              step={0.02}
              onValueChange={(saturation) => patch({ saturation })}
            />
            <Slider
              label="Parlaklık"
              value={settings.brightness}
              min={0.6}
              max={1.6}
              step={0.02}
              onValueChange={(brightness) => patch({ brightness })}
            />
            <Switch
              label="Tek renk"
              checked={settings.monochrome !== null}
              onCheckedChange={(on) => patch({ monochrome: on ? "#f2b45a" : null })}
            />
            {settings.monochrome !== null && (
              <ColorRow value={settings.monochrome} onChange={(v) => patch({ monochrome: v })} />
            )}
            <Switch
              label="Zemin rengi"
              checked={settings.background !== null}
              onCheckedChange={(on) => patch({ background: on ? "#0d0c0b" : null })}
            />
            {settings.background !== null && (
              <ColorRow value={settings.background} onChange={(v) => patch({ background: v })} />
            )}
            <Switch label="Parıltı" checked={settings.glow} onCheckedChange={(glow) => patch({ glow })} />
          </Group>

          <Group title="Künye">
            <Field label="Tür" id="title">
              <Input
                id="title"
                value={meta.title}
                placeholder="Sumatra Kaplanı"
                onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              />
            </Field>
            <Field label="Bilimsel ad" id="latin">
              <Input
                id="latin"
                value={meta.latin}
                placeholder="Panthera tigris sumatrae"
                onChange={(e) => setMeta((m) => ({ ...m, latin: e.target.value }))}
              />
            </Field>
            <Field label="Bölge" id="region">
              <Input
                id="region"
                value={meta.region}
                placeholder="Sumatra, Endonezya"
                onChange={(e) => setMeta((m) => ({ ...m, region: e.target.value }))}
              />
            </Field>
            <div className="space-y-2">
              <Label>Koruma durumu</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setMeta((m) => ({ ...m, status: s.key }))}
                    className={cn(
                      "rounded-full border px-3 py-1.5 font-mono text-[0.82rem] transition-all",
                      meta.status === s.key
                        ? "border-transparent text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                    style={meta.status === s.key ? { background: s.tone } : undefined}
                    title={s.label}
                  >
                    {s.short}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Not" id="note">
              <Textarea
                id="note"
                rows={3}
                value={meta.note}
                placeholder="Sunumda posterin altında görünür."
                onChange={(e) => setMeta((m) => ({ ...m, note: e.target.value }))}
              />
            </Field>
          </Group>
        </div>

        {/* actions stay reachable while the panel scrolls */}
        <div className="glass flex shrink-0 items-center gap-2 border-t border-border p-4">
          <Button onClick={onSave} disabled={!mosaic} className="flex-1">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Kaydedildi" : editing ? "Güncelle" : "Galeriye ekle"}
          </Button>
          <Button variant="outline" size="icon" onClick={onDownload} disabled={!mosaic} title="PNG indir">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Görünüm ayarlarını sıfırla"
            onClick={() => setSettings({ ...DEFAULT_SETTINGS, mode: settings.mode })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    </main>
  );
}

/* ── panel pieces ──────────────────────────────────────────── */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3.5">
      <h2 className="font-mono text-[0.8rem] uppercase tracking-[0.2em] text-primary/80">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ColorRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        aria-label="Renk seç"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-xs" />
    </div>
  );
}

function FilePicker({ onFile, hasSource }: { onFile: (f: File) => void; hasSource: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" className="w-full" onClick={() => ref.current?.click()}>
        <ImagePlus className="h-4 w-4" />
        {hasSource ? "Görseli değiştir" : "Görsel seç"}
      </Button>
    </>
  );
}

function Dropzone({ onFile }: { onFile: (f: File) => void }) {
  const [over, setOver] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onClick={() => ref.current?.click()}
      className={cn(
        "relative z-10 flex aspect-[4/5] w-full max-w-md cursor-pointer flex-col items-center justify-center gap-5 rounded-3xl border border-dashed p-10 text-center transition-all duration-300",
        over
          ? "ring-glow scale-[1.01] border-primary bg-primary/5"
          : "border-border bg-card/30 hover:border-primary/50",
      )}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="bg-lattice pointer-events-none absolute inset-0 rounded-3xl opacity-25" />
      <ImagePlus className="relative h-8 w-8 text-primary" />
      <div className="relative space-y-1.5">
        <p className="text-base font-medium tracking-tight">Görseli buraya bırak</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          PNG, JPG ya da WebP. Şeffaf arka plan en keskin sonucu verir; düz fotoğrafta arka
          plan eşiğiyle oynayabilirsin.
        </p>
      </div>
    </div>
  );
}

function Readout({ mosaic, target }: { mosaic: Mosaic | null; target: number }) {
  if (!mosaic) return null;
  const exact = Math.abs(mosaic.count - target) <= Math.max(2, target * 0.005);
  return (
    <div className="relative mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[0.82rem] uppercase tracking-[0.16em] text-muted-foreground">
      <span className="tabular">
        <span className={cn(exact ? "text-primary" : "text-destructive")}>
          {formatCount(mosaic.count)}
        </span>{" "}
        / {formatCount(target)} piksel
      </span>
      <span className="hidden h-3 w-px bg-border sm:block" />
      <span className="tabular">
        {mosaic.cols} × {mosaic.rows} ızgara
      </span>
      {mosaic.warning && (
        <span className="w-full text-center normal-case tracking-normal text-destructive/80">
          {mosaic.warning}
        </span>
      )}
    </div>
  );
}
