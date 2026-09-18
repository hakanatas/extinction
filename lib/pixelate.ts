/* ── population by pixel ─────────────────────────────────────────
 * The 2008 WWF Japan prints put one pixel on the page for every
 * animal left alive. This module is that idea as an algorithm: given
 * a photograph and a population count N, it finds the mosaic whose
 * visible pixel count is *exactly* N.
 *
 * It takes two steps, because no single knob lands on an arbitrary
 * integer:
 *
 * 1. Grid density. Cells are square, so the grid is one number —
 *    `cols`. A binary search finds the *smallest* density whose
 *    silhouette can still hold N cells. Smallest on purpose: the cells
 *    come out as large as the count allows, which is what makes a tiny
 *    population read as a picture breaking apart. This lands near N,
 *    almost never on it, since a step in `cols` moves the count by a
 *    whole rank of cells.
 * 2. Selection. Take every cell the subject touches, rank them by how
 *    much of the cell the subject covers, and keep exactly the top N.
 *    The count is then exact by construction, and what falls away is
 *    the faintest fringe of the silhouette — where a photograph is
 *    least certain anyway.
 *
 * Both steps need the subject's area inside arbitrary rectangles,
 * thousands of times over. A summed-area table of the mask (and of the
 * masked colour channels) makes each query O(1), which is what keeps
 * the solve interactive on a full-size photo.
 * ─────────────────────────────────────────────────────────────── */

import { clamp } from "@/lib/utils";

/** Upper bound on drawn cells. Past this the canvas stops being a poster. */
export const MAX_CELLS = 260_000;
/** Resolution the analysis runs at. Bigger buys nothing but latency. */
const ANALYSIS_MAX = 900;

export type PixelMode = "subject" | "frame";
export type PixelShape = "square" | "round" | "dot";

export interface PixelSettings {
  /** `subject` keeps the silhouette and drops the background; `frame` tiles the whole picture. */
  mode: PixelMode;
  /** How far a colour may sit from the sampled background and still count as background (0–100). */
  tolerance: number;
  /** Space between cells, as a fraction of cell size (0–0.45). */
  gap: number;
  /** Cell corner rounding, as a fraction of cell size (0–0.5). */
  radius: number;
  shape: PixelShape;
  /** Colour punch applied to each cell's average colour. */
  contrast: number;
  saturation: number;
  brightness: number;
  /** Paint every cell in one colour instead of the photo's own. */
  monochrome: string | null;
  /** Poster background. `null` renders transparent. */
  background: string | null;
  /** Soft bloom behind the mosaic. */
  glow: boolean;
}

export const DEFAULT_SETTINGS: PixelSettings = {
  mode: "subject",
  tolerance: 26,
  gap: 0.16,
  radius: 0.5,
  shape: "round",
  contrast: 1.08,
  saturation: 1.12,
  brightness: 1.04,
  monochrome: null,
  background: null,
  glow: true,
};

export interface PixelCell {
  /** Grid coordinates, not pixels. */
  col: number;
  row: number;
  /** The region's average colour, ungraded — the colour sliders are applied
   *  at paint time so moving one doesn't re-run the solve. */
  r: number;
  g: number;
  b: number;
  /** Stable shuffle key, so the reveal animation is the same on every replay. */
  order: number;
}

export interface Mosaic {
  cols: number;
  rows: number;
  /** Grid box the painted cells actually occupy, so the poster can be framed
   *  on the subject rather than on the source photo's empty margins. */
  bounds: { minCol: number; minRow: number; maxCol: number; maxRow: number };
  cells: PixelCell[];
  /** Cells actually drawn — the population made visible. */
  count: number;
  /** What the user asked for. */
  target: number;
  /** Set when the picture simply cannot carry that many pixels. */
  warning: string | null;
  /** Source aspect ratio (w / h), so callers can size a canvas. */
  aspect: number;
}

/* ── image plumbing ─────────────────────────────────────────── */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi."));
    img.src = src;
  });
}

/** Read a picked file as a data URL, downscaled so it survives storage. */
export async function fileToDataUrl(file: File, maxSide = 1400): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });

  const img = await loadImage(raw);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  if (scale === 1 && raw.length < 1_800_000) return raw;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // PNG keeps transparency, which `subject` mode relies on when it exists.
  const hasAlpha = /^data:image\/(png|webp|gif)/i.test(raw);
  return canvas.toDataURL(hasAlpha ? "image/png" : "image/jpeg", 0.88);
}

/* ── the solve ──────────────────────────────────────────────── */

interface Analysis {
  w: number;
  h: number;
  /** Summed-area tables, all (w+1) * (h+1). */
  maskSat: Float64Array;
  rSat: Float64Array;
  gSat: Float64Array;
  bSat: Float64Array;
}

function rect(sat: Float64Array, w: number, x0: number, y0: number, x1: number, y1: number) {
  const s = w + 1;
  return sat[y1 * s + x1] - sat[y0 * s + x1] - sat[y1 * s + x0] + sat[y0 * s + x0];
}

/** Sample the frame's border to guess what "background" means in this photo. */
function sampleBackground(data: Uint8ClampedArray, w: number, h: number) {
  const picks: number[][] = [];
  const step = Math.max(1, Math.floor(Math.min(w, h) / 48));
  for (let x = 0; x < w; x += step) {
    for (const y of [0, h - 1]) {
      const i = (y * w + x) * 4;
      picks.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  for (let y = 0; y < h; y += step) {
    for (const x of [0, w - 1]) {
      const i = (y * w + x) * 4;
      picks.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  // Median per channel: one bright corner or a signature shouldn't move it.
  const med = (k: number) => {
    const vals = picks.map((p) => p[k]).sort((a, b) => a - b);
    return vals[vals.length >> 1] ?? 0;
  };
  return [med(0), med(1), med(2)] as const;
}

function analyse(img: HTMLImageElement, settings: PixelSettings): Analysis {
  const scale = Math.min(1, ANALYSIS_MAX / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Transparency, when the source has it, is a far better silhouette than
  // any colour distance — so it wins outright.
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 200) transparent++;
  const useAlpha = transparent > (w * h) / 60;

  const [br, bg, bb] = sampleBackground(data, w, h);
  // Tolerance is authored 0–100 but compared in RGB distance.
  const cutoff = (settings.tolerance / 100) * 300;

  const s = w + 1;
  const maskSat = new Float64Array(s * (h + 1));
  const rSat = new Float64Array(s * (h + 1));
  const gSat = new Float64Array(s * (h + 1));
  const bSat = new Float64Array(s * (h + 1));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      let on = 1;
      if (settings.mode === "subject") {
        if (useAlpha) {
          on = a > 140 ? 1 : 0;
        } else {
          const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
          on = d > cutoff ? 1 : 0;
        }
      } else {
        on = a > 16 ? 1 : 0;
      }

      const p = (y + 1) * s + (x + 1);
      const up = y * s + (x + 1);
      const left = (y + 1) * s + x;
      const diag = y * s + x;
      maskSat[p] = on + maskSat[up] + maskSat[left] - maskSat[diag];
      rSat[p] = r * on + rSat[up] + rSat[left] - rSat[diag];
      gSat[p] = g * on + gSat[up] + gSat[left] - gSat[diag];
      bSat[p] = b * on + bSat[up] + bSat[left] - bSat[diag];
    }
  }

  return { w, h, maskSat, rSat, gSat, bSat };
}

function boundsOf(cells: PixelCell[], cols: number, rows: number): Mosaic["bounds"] {
  if (!cells.length) return { minCol: 0, minRow: 0, maxCol: cols - 1, maxRow: rows - 1 };
  let minCol = Infinity;
  let minRow = Infinity;
  let maxCol = -Infinity;
  let maxRow = -Infinity;
  for (const c of cells) {
    if (c.col < minCol) minCol = c.col;
    if (c.col > maxCol) maxCol = c.col;
    if (c.row < minRow) minRow = c.row;
    if (c.row > maxRow) maxRow = c.row;
  }
  return { minCol, minRow, maxCol, maxRow };
}

function rowsFor(cols: number, w: number, h: number) {
  return Math.max(1, Math.round((cols * h) / w));
}

/** Subject cells at a given density and coverage threshold. */
function countCells(a: Analysis, cols: number, coverage: number) {
  const rows = rowsFor(cols, a.w, a.h);
  let n = 0;
  for (let row = 0; row < rows; row++) {
    const y0 = Math.round((row * a.h) / rows);
    const y1 = Math.round(((row + 1) * a.h) / rows);
    if (y1 <= y0) continue;
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round((col * a.w) / cols);
      const x1 = Math.round(((col + 1) * a.w) / cols);
      if (x1 <= x0) continue;
      const area = (x1 - x0) * (y1 - y0);
      if (rect(a.maskSat, a.w, x0, y0, x1, y1) >= area * coverage) n++;
    }
  }
  return n;
}

interface Candidate extends PixelCell {
  /** Share of the cell covered by the subject, 0–1. */
  ratio: number;
}

/** Every cell the subject touches at all, with how much of it it touches. */
function candidates(a: Analysis, cols: number, floor = 0.06): Candidate[] {
  const rows = rowsFor(cols, a.w, a.h);
  const out: Candidate[] = [];
  for (let row = 0; row < rows; row++) {
    const y0 = Math.round((row * a.h) / rows);
    const y1 = Math.round(((row + 1) * a.h) / rows);
    if (y1 <= y0) continue;
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round((col * a.w) / cols);
      const x1 = Math.round(((col + 1) * a.w) / cols);
      if (x1 <= x0) continue;
      const area = (x1 - x0) * (y1 - y0);
      const on = rect(a.maskSat, a.w, x0, y0, x1, y1);
      const ratio = on / area;
      if (ratio < floor) continue;
      out.push({
        col,
        row,
        ratio,
        r: rect(a.rSat, a.w, x0, y0, x1, y1) / on,
        g: rect(a.gSat, a.w, x0, y0, x1, y1) / on,
        b: rect(a.bSat, a.w, x0, y0, x1, y1) / on,
        order: hash(col * 73_856_093 + row * 19_349_663),
      });
    }
  }
  return out;
}

/** Deterministic 0–1 shuffle key, so a reveal replays identically. */
function hash(n: number) {
  let x = n | 0;
  x = (x ^ 61) ^ (x >>> 16);
  x = x + (x << 3);
  x = x ^ (x >>> 4);
  x = Math.imul(x, 0x27d4eb2d);
  x = x ^ (x >>> 15);
  return ((x >>> 0) % 100_000) / 100_000;
}

function grade(r: number, g: number, b: number, s: PixelSettings): [number, number, number] {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const out = [r, g, b].map((c) => {
    let v = lum + (c - lum) * s.saturation;
    v = 128 + (v - 128) * s.contrast;
    v *= s.brightness;
    return clamp(Math.round(v), 0, 255);
  });
  return [out[0], out[1], out[2]];
}

/**
 * Build the mosaic whose visible cell count equals `target` as closely as
 * the picture allows. See the note at the top for why it takes two searches.
 */
export function buildMosaic(
  img: HTMLImageElement,
  target: number,
  settings: PixelSettings,
): Mosaic {
  const a = analyse(img, settings);
  const aspect = a.w / a.h;
  const wanted = Math.max(1, Math.round(target));

  if (settings.mode === "frame") {
    // No silhouette to trim, so the count is cols * rows: walk a small
    // neighbourhood of the ideal aspect-matched grid and take the best product.
    const ideal = Math.max(1, Math.round(Math.sqrt(wanted * aspect)));
    let best = { cols: ideal, rows: Math.max(1, Math.round(wanted / ideal)), miss: Infinity };
    for (let cols = Math.max(1, ideal - 8); cols <= ideal + 8; cols++) {
      const rows = Math.max(1, Math.round(wanted / cols));
      const miss = Math.abs(cols * rows - wanted);
      if (miss < best.miss) best = { cols, rows, miss };
      if (miss === 0) break;
    }
    const capped = best.cols * best.rows > MAX_CELLS;
    const cols = capped ? Math.max(1, Math.round(Math.sqrt(MAX_CELLS * aspect))) : best.cols;
    const rows = capped ? Math.max(1, Math.round(MAX_CELLS / cols)) : best.rows;
    const cells = collectGrid(a, cols, rows);
    return {
      cols,
      rows,
      bounds: boundsOf(cells, cols, rows),
      cells,
      count: cells.length,
      target: wanted,
      aspect,
      warning: capped
        ? `Bu sayı tek bir tuvale sığmıyor; ${MAX_CELLS.toLocaleString("tr-TR")} pikselde sınırlandı.`
        : cells.length === wanted
          ? null
          : "Görselin şeffaf bölgeleri ızgaradan düştü; sayı tam oturmadı.",
    };
  }

  const maxCols = Math.max(2, Math.floor(Math.sqrt(MAX_CELLS * aspect)));

  // Smallest density whose silhouette can hold the target. Deliberately the
  // smallest: the cells are then as large as the count allows, which is what
  // makes a small population read as a coarse, breaking-up picture.
  let lo = 2;
  let hi = maxCols;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (countCells(a, mid, 0.5) >= wanted) hi = mid;
    else lo = mid + 1;
  }
  const cols = lo;
  const rows = rowsFor(cols, a.w, a.h);

  // Density alone lands near the target, never on it — a step in `cols` moves
  // the count by a whole rank of cells. So take every cell the subject touches
  // and keep exactly `wanted` of them, the most-covered first. The count is
  // then exact by construction, and what gets dropped is the faintest fringe
  // of the silhouette, which is where a photograph is least sure anyway.
  const pool = candidates(a, cols);
  const short = pool.length < wanted;

  if (!short) {
    // Ties are ordinary — interior cells are all fully covered — so break them
    // by distance from the subject's centre. Dropping an outer cell thins the
    // outline; dropping an inner one would punch a hole in the middle.
    let cx = 0;
    let cy = 0;
    for (const c of pool) {
      cx += c.col;
      cy += c.row;
    }
    cx /= pool.length;
    cy /= pool.length;
    pool.sort((p, q) => {
      if (q.ratio !== p.ratio) return q.ratio - p.ratio;
      return Math.hypot(p.col - cx, p.row - cy) - Math.hypot(q.col - cx, q.row - cy);
    });
    pool.length = wanted;
  }

  return {
    cols,
    rows,
    bounds: boundsOf(pool, cols, rows),
    cells: pool,
    count: pool.length,
    target: wanted,
    aspect,
    warning: short
      ? "Konu alanı bu kadar pikseli taşıyamıyor. Daha dolgun bir görsel seçin ya da arka plan eşiğini düşürün."
      : null,
  };
}

function collectGrid(a: Analysis, cols: number, rows: number) {
  const cells: PixelCell[] = [];
  for (let row = 0; row < rows; row++) {
    const y0 = Math.round((row * a.h) / rows);
    const y1 = Math.max(y0 + 1, Math.round(((row + 1) * a.h) / rows));
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round((col * a.w) / cols);
      const x1 = Math.max(x0 + 1, Math.round(((col + 1) * a.w) / cols));
      const area = (x1 - x0) * (y1 - y0);
      const on = Math.max(1, rect(a.maskSat, a.w, x0, y0, x1, y1));
      if (on < area * 0.35) continue;
      cells.push({
        col,
        row,
        r: rect(a.rSat, a.w, x0, y0, x1, y1) / on,
        g: rect(a.gSat, a.w, x0, y0, x1, y1) / on,
        b: rect(a.bSat, a.w, x0, y0, x1, y1) / on,
        order: hash(col * 73_856_093 + row * 19_349_663),
      });
    }
  }
  return cells;
}

/* ── painting ───────────────────────────────────────────────── */

export interface RenderOptions {
  /** 0–1. Below 1 only that share of the mosaic is painted, in shuffle order. */
  progress?: number;
  /** Device pixel ratio to render at. */
  dpr?: number;
  padding?: number;
  /** Explicit CSS-pixel box; defaults to the canvas's own layout box. */
  box?: { w: number; h: number };
}

/**
 * Paint a mosaic onto a canvas, sized to the canvas's CSS box. Cells are
 * drawn in a fixed shuffled order so `progress` reads as the picture
 * assembling itself rather than a wipe.
 */
export function renderMosaic(
  canvas: HTMLCanvasElement,
  mosaic: Mosaic,
  settings: PixelSettings,
  opts: RenderOptions = {},
) {
  const { progress = 1, padding = 0 } = opts;
  const dpr = opts.dpr ?? Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const cssW = opts.box?.w ?? canvas.clientWidth ?? canvas.width;
  const cssH = opts.box?.h ?? canvas.clientHeight ?? canvas.height;
  if (!cssW || !cssH) return;

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  if (settings.background) {
    ctx.fillStyle = settings.background;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  const innerW = cssW - padding * 2;
  const innerH = cssH - padding * 2;
  // Frame on the cells that exist. A subject sitting small in its source
  // photo should still fill the poster.
  const { minCol, minRow, maxCol, maxRow } = mosaic.bounds;
  const spanCols = maxCol - minCol + 1;
  const spanRows = maxRow - minRow + 1;
  const cell = Math.min(innerW / spanCols, innerH / spanRows);
  const offsetX = padding + (innerW - cell * spanCols) / 2 - minCol * cell;
  const offsetY = padding + (innerH - cell * spanRows) / 2 - minRow * cell;

  const gap = cell * clamp(settings.gap, 0, 0.45);
  const size = Math.max(0.6, cell - gap);
  const radius =
    settings.shape === "dot"
      ? size / 2
      : settings.shape === "round"
        ? size * clamp(settings.radius, 0, 0.5)
        : 0;

  if (settings.glow) {
    ctx.shadowColor = "rgba(255, 190, 110, 0.35)";
    ctx.shadowBlur = Math.max(2, size * 0.9);
  }

  const reveal = clamp(progress, 0, 1);
  // Rounded corners cost real time once there are tens of thousands of cells.
  const rounded = radius > 0.4 && mosaic.cells.length <= 90_000;

  for (let i = 0; i < mosaic.cells.length; i++) {
    const c = mosaic.cells[i];
    // `order` is a stable per-cell key in 0–1, so a rising `progress`
    // sprinkles the picture in rather than wiping across it.
    if (reveal < 1 && c.order > reveal) continue;

    const x = offsetX + c.col * cell + gap / 2;
    const y = offsetY + c.row * cell + gap / 2;
    if (settings.monochrome) {
      ctx.fillStyle = settings.monochrome;
    } else {
      const [r, g, b] = grade(c.r, c.g, c.b, settings);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
    }

    if (rounded) {
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, size, size);
    }
  }

  ctx.shadowBlur = 0;
}

/** Off-screen poster render, used for thumbnails, exports and the gallery. */
export function mosaicToDataUrl(
  mosaic: Mosaic,
  settings: PixelSettings,
  width = 1200,
): string {
  const canvas = document.createElement("canvas");
  const spanCols = mosaic.bounds.maxCol - mosaic.bounds.minCol + 1;
  const spanRows = mosaic.bounds.maxRow - mosaic.bounds.minRow + 1;
  const height = Math.round((width * spanRows) / Math.max(1, spanCols));
  renderMosaic(canvas, mosaic, settings, {
    dpr: 1,
    padding: Math.round(width * 0.03),
    box: { w: width, h: height },
  });
  return canvas.toDataURL("image/png");
}
