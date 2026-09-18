/* Placeholder posters for the corridor before anyone has made a work.
 *
 * They are pixel mosaics of a generic four-legged creature — the same
 * silhouette the app builds from real photographs — so the empty state
 * already shows the idea instead of decorating around it. Re-run with
 * `node scripts/generate-samples.mjs`. */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("public/samples");
mkdirSync(OUT, { recursive: true });

/** Each entry bends the same body plan into a different animal. */
const SPECIES = [
  { name: "vaquita", hue: 196, body: 0.3, head: 0.1, neck: 0.02, legs: 0, tail: 0.16, cells: 44 },
  { name: "amur", hue: 42, body: 0.28, head: 0.1, neck: 0.05, legs: 0.2, tail: 0.2, cells: 46 },
  { name: "kakapo", hue: 128, body: 0.24, head: 0.12, neck: 0.03, legs: 0.12, tail: 0.1, cells: 38 },
  { name: "rhino", hue: 24, body: 0.33, head: 0.12, neck: 0.04, legs: 0.22, tail: 0.08, cells: 52 },
  { name: "saola", hue: 68, body: 0.25, head: 0.09, neck: 0.12, legs: 0.26, tail: 0.1, cells: 42 },
  { name: "axolotl", hue: 336, body: 0.27, head: 0.11, neck: 0.02, legs: 0.1, tail: 0.24, cells: 40 },
  { name: "condor", hue: 286, body: 0.22, head: 0.09, neck: 0.1, legs: 0.14, tail: 0.18, cells: 36 },
  { name: "pangolin", hue: 52, body: 0.29, head: 0.08, neck: 0.06, legs: 0.16, tail: 0.26, cells: 48 },
];

const ellipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

function inside(x, y, s) {
  if (ellipse(x, y, 0.46, 0.56, s.body, s.body * 0.55)) return true;
  if (ellipse(x, y, 0.74, 0.56 - s.neck * 2, s.head, s.head)) return true;
  if (s.neck > 0.04 && ellipse(x, y, 0.7, 0.56 - s.neck, s.head * 0.45, s.neck * 1.6)) return true;
  if (ellipse(x, y, 0.2 - s.tail * 0.3, 0.5, s.tail, s.tail * 0.3)) return true;
  if (s.legs > 0) {
    for (const lx of [0.34, 0.46, 0.58, 0.66]) {
      if (Math.abs(x - lx) < 0.035 && y > 0.56 && y < 0.56 + s.legs + s.body * 0.4) return true;
    }
  }
  return false;
}

for (const s of SPECIES) {
  const cols = s.cells;
  const rows = Math.round(cols * 1.25);
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) / cols;
      const y = (r + 0.5) / rows;
      if (!inside(x, y, s)) continue;
      // Light falls from the upper left, so the mosaic keeps some volume.
      const shade = 0.45 + 0.55 * (1 - Math.hypot(x - 0.35, y - 0.35));
      const light = 42 + shade * 34;
      dots.push(
        `<circle cx="${(x * 100).toFixed(2)}%" cy="${(y * 100).toFixed(2)}%" r="${(38 / cols).toFixed(3)}%" fill="hsl(${s.hue} ${55 + shade * 25}% ${light.toFixed(0)}%)"/>`,
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750">
<defs><radialGradient id="g" cx="38%" cy="32%" r="78%">
<stop offset="0%" stop-color="hsl(${s.hue} 30% 15%)"/>
<stop offset="100%" stop-color="hsl(${(s.hue + 40) % 360} 35% 6%)"/>
</radialGradient></defs>
<rect width="600" height="750" fill="url(#g)"/>
<g opacity="0.95">${dots.join("")}</g>
</svg>`;

  writeFileSync(resolve(OUT, `${s.name}.svg`), svg);
}

console.log(`${SPECIES.length} örnek poster üretildi.`);
