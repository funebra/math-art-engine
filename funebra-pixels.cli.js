#!/usr/bin/env node
// funebra-pixels.cli.js — Node CLI for Funebra Pixels Engine
// Requires Node 18+ (ESM + fetch + canvas)

import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import * as FP from "./math-art-engine/funebra-pixels.module.js";

// Parse CLI arguments
const args = process.argv.slice(2);
const cmd = args[0];
if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(`
Funebra Pixels CLI
──────────────────
Usage:
  node funebra-pixels.cli.js <type> [options]

Types:
  rose      Render rose curve
  spiro     Render spirograph
  heart     Render implicit heart shape
  star      Render n-pointed star

Options:
  --w, --width <n>       Image width (default 64)
  --h, --height <n>      Image height (default 64)
  --k <n>                Rose petals (default 5)
  --points <n>           Star points (default 5)
  --out, --png <path>    Output PNG path
  --json <path>          Output JSON matrix path
  --palette <hex,...>    Comma-separated palette colors
Examples:
  node funebra-pixels.cli.js rose --k 7 --png rose7.png
  node funebra-pixels.cli.js star --points 8 --png star8.png
`);
  process.exit(0);
}

// Parse flags
function flag(name, def) {
  const idx = args.findIndex(a => a === `--${name}` || a === `-${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return def;
}

const width  = parseInt(flag("w", flag("width", 64)));
const height = parseInt(flag("h", flag("height", 64)));
const k      = parseInt(flag("k", 5));
const points = parseInt(flag("points", 5));
const outPNG = flag("png", flag("out", null));
const outJSON = flag("json", null);
const palette = (flag("palette", "#ffffff,#222831,#ff7a18,#2bd4cf")).split(",");

// Pick generator
let gen;
switch (cmd) {
  case "rose":
    gen = FP.roseToPixels({ width, height, k, palette });
    break;
  case "spiro":
    gen = FP.spiroToPixels({ width, height, palette });
    break;
  case "heart":
    gen = FP.heartToPixels({ width, height, palette });
    break;
  case "star":
    gen = FP.starToPixels({ width, height, points, palette });
    break;
  default:
    console.error("Unknown generator:", cmd);
    process.exit(1);
}
const { matrix } = gen;

// Export JSON matrix (optional)
if (outJSON) {
  fs.writeFileSync(outJSON, JSON.stringify(matrix, null, 2));
  console.log("✔ matrix saved to", outJSON);
}

// Render to PNG using Node canvas
const scale = 8;
const canvas = createCanvas(width * scale, height * scale);
const ctx = canvas.getContext("2d");
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = matrix[y][x];
    if (idx == null || idx === -1) continue;
    const color = palette[idx];
    if (!color || color === "transparent") continue;
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }
}

// Write PNG file
if (outPNG) {
  const outPath = path.resolve(outPNG);
  const buf = canvas.toBuffer("image/png");
  fs.writeFileSync(outPath, buf);
  console.log("✔ PNG saved to", outPath);
} else {
  console.log("ℹ No output file specified (--png <path>).");
}
