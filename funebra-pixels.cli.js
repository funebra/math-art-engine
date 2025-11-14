#!/usr/bin/env node
// funebra-pixels.cli.js — PNG-only CLI (no native deps)
// Requires Node 18+
// npm i pngjs

import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import * as FP from "./funebra-pixels.module.js"; // adjust path if you keep it in a subfolder

// --- arg utils ---
const args = process.argv.slice(2);
const cmd = args[0];
function flag(name, def) {
  const i = args.findIndex(a => a === `--${name}` || a === `-${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
function bool(name) {
  return args.includes(`--${name}`) || args.includes(`-${name}`);
}

// --- help ---
if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(`
Funebra Pixels CLI (PNGJS)
──────────────────────────
Usage:
  node funebra-pixels.cli.js <type> [options]

Types:
  rose      Render rose curve        (k petals)
  spiro     Render spirograph
  heart     Render implicit heart
  star      Render n-pointed star

Common options:
  --w, --width <n>          image width  (default 64)
  --h, --height <n>         image height (default 64)
  --png <file>              output PNG path (default out.png)
  --json <file>             also write matrix JSON (optional)
  --palette <hex,...>       comma-list of colors (#RRGGBB or #RRGGBBAA)

Shape options:
  rose:  --k <n>            petals (default 5)
  star:  --points <n>       points (default 5)

Examples:
  node funebra-pixels.cli.js rose --k 7 --png rose7.png
  node funebra-pixels.cli.js star --points 8 --w 64 --h 64 --png star8.png
`); process.exit(0);
}





// funebra-pixels.cli.js  (add this somewhere after your other helpers)

// Turn an image into a flat Funebra pixel list: [x,y,z, x,y,z, ...]
async function funebraPixelsFromImage(
  url,
  {
    targetHeight = 150,   // final pixel-art height (C3: fairly detailed)
    threshold = 210,      // 0..255 — lower = more points (keep darker ink)
    invert = false,       // true if you want to detect light on dark
    step = 1,             // spacing between points in Funebra space
    sampleStride = 1,     // 1 = every pixel, 2 = every 2nd pixel (thins points)
    x0 = 0,
    y0 = 0,
    z0 = 0,
  } = {}
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Scale image to targetHeight, preserving aspect
      const scale = targetHeight / img.height;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = targetHeight;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      const { data } = ctx.getImageData(0, 0, w, h);

      const pts = []; // flat [x,y,z, x,y,z, ...]

      for (let y = 0; y < h; y += sampleStride) {
        for (let x = 0; x < w; x += sampleStride) {
          const idx = (y * w + x) * 4;
          const r = data[idx + 0];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a < 10) continue; // transparent, skip

          // luminance (perceived brightness)
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          // For black-on-white line art:
          const isInk = invert ? lum > threshold : lum < threshold;

          if (isInk) {
            const X = x0 + x * step;
            const Y = y0 + y * step;
            const Z = z0;
            pts.push(X, Y, Z);
          }
        }
      }

      resolve(pts);
    };

    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

// Make it reachable from console / other modules
window.funebraPixelsFromImage = funebraPixelsFromImage;







// --- parse shared flags ---
const width   = parseInt(flag("w", flag("width", 64)));
const height  = parseInt(flag("h", flag("height", 64)));
const outPNG  = flag("png", "out.png");
const outJSON = flag("json", null);
const paletteStrings = (flag("palette", "#ffffff,#222831,#ff7a18,#2bd4cf")).split(",");

// --- select generator ---
let gen;
switch (cmd) {
  case "rose": {
    const k = parseInt(flag("k", 5));
    gen = FP.roseToPixels({ width, height, k, palette: paletteStrings });
    break;
  }
  case "spiro": {
    gen = FP.spiroToPixels({ width, height, palette: paletteStrings });
    break;
  }
  case "heart": {
    gen = FP.heartToPixels({ width, height, palette: paletteStrings });
    break;
  }
  case "star": {
    const points = parseInt(flag("points", 5));
    gen = FP.starToPixels({ width, height, points, palette: paletteStrings });
    break;
  }
  default:
    console.error("Unknown type:", cmd);
    process.exit(1);
}

const { matrix, palette } = gen;

// --- optional JSON dump ---
if (outJSON) {
  fs.writeFileSync(outJSON, JSON.stringify(matrix));
  console.log("✔ matrix saved:", path.resolve(outJSON));
}

// --- color helpers ---
function hexToRGBA(hex) {
  let s = hex.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.length === 3) s = s.split("").map(ch => ch+ch).join("") + "FF";
  if (s.length === 6) s = s + "FF";
  const r = parseInt(s.slice(0,2),16);
  const g = parseInt(s.slice(2,4),16);
  const b = parseInt(s.slice(4,6),16);
  const a = parseInt(s.slice(6,8),16);
  return { r, g, b, a };
}
const pal = palette.map(hexToRGBA);

// --- write PNG 1:1 (each matrix cell = 1 pixel) ---
const png = new PNG({ width, height });
for (let y=0; y<height; y++) {
  for (let x=0; x<width; x++) {
    const idx = matrix[y][x];
    const off = (width * y + x) << 2;
    if (idx == null || idx === -1 || !pal[idx]) {
      png.data[off+0] = 0;
      png.data[off+1] = 0;
      png.data[off+2] = 0;
      png.data[off+3] = 0; // transparent
    } else {
      const c = pal[idx];
      png.data[off+0] = c.r;
      png.data[off+1] = c.g;
      png.data[off+2] = c.b;
      png.data[off+3] = c.a;
    }
  }
}

png.pack().pipe(fs.createWriteStream(outPNG))
  .on("close", () => console.log("✔ PNG saved:", path.resolve(outPNG)))
  .on("error", (e) => { console.error("PNG write error:", e); process.exit(1); });
