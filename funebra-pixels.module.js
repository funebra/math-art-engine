// funebra-pixels.module.js — Funebra → CSS pixel-sprite toolkit (ESM)
// Self-contained: generates indexed pixel matrices from math curves/fields
// and applies them to a 1×1 CSS sprite using box-shadow (works with htmlPixels.css).
//
// Exports:
// - makeMatrix, boxShadowFromMatrix, applyPixels
// - pset, line, mapToGrid, drawPolyline
// - fieldToMatrix, mergeUnder
// - roseToPixels, spiroToPixels, heartToPixels, starToPixels
// - project
//
// Usage example:
// import * as FP from './funebra-pixels.module.js';
// const { matrix, palette } = FP.roseToPixels();
// const el = document.querySelector('.pixels');
// FP.applyPixels(el, matrix, palette, { title: 'Funebra Rose' });

// ─────────────────────────────────────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────────────────────────────────────
export function makeMatrix(width, height, fill = -1) {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

export function boxShadowFromMatrix(matrix, palette) {
  if (!Array.isArray(matrix) || matrix.length === 0) return '';
  const h = matrix.length, w = matrix[0].length;
  const out = [];
  for (let y = 0; y < h; y++) {
    const row = matrix[y];
    for (let x = 0; x < w; x++) {
      const idx = row[x];
      if (idx == null || idx === -1) continue;
      const color = palette[idx];
      if (!color || color === 'transparent') continue;
      out.push(`${x}px ${y}px 0 0 ${color}`);
    }
  }
  return out.join(',\n');
}

export function applyPixels(el, matrix, palette, { title } = {}) {
  if (!el) throw new Error('applyPixels: element is required');
  const css = boxShadowFromMatrix(matrix, palette);
  el.style.boxShadow = css;
  if (title) el.setAttribute('aria-label', title);
  return css;
}




// ──────────────────────────────────────────────────────────────
// funebra-pixels.module.js — add-on helpers + 16-bit palette
// (Keep your existing exports. Append the following.)
// ──────────────────────────────────────────────────────────────

/** 16-bit SNES-ish palette (16 colors; index 0 is "ink"). */
export const PALETTE_16BIT = [
  '#0c0f12', // 0 ink (very dark)
  '#2b1a0f', // 1 dark brown
  '#5a3820', // 2 mid brown
  '#8a5a33', // 3 light brown
  '#b16a2e', // 4 leather
  '#c05922', // 5 red shadow
  '#d43a26', // 6 red base
  '#ff6a4a', // 7 red highlight
  '#0f2a73', // 8 blue shadow
  '#1f53b2', // 9 blue base
  '#4e7ff3', // 10 blue highlight
  '#e1b07a', // 11 skin shadow
  '#f4c896', // 12 skin base
  '#ffe2bd', // 13 skin highlight
  '#f8d33b', // 14 gold
  '#ffffff', // 15 spec
];

/** Build a 2D matrix H×W prefilled with val. 
export function makeMatrix(w, h, val = -1){
  return Array.from({length:h}, ()=>Array.from({length:w}, ()=>val));
}
 */
/** Parse a token-art grid (array of rows with space-separated tokens)
 *  using a token→index map K. `.` (dot) is treated as transparent (-1).
 */
export function tokensToMatrix(tokenRows, K){
  const H = tokenRows.length;
  const W = tokenRows[0].trim().split(/\s+/).length;
  const m = makeMatrix(W, H, -1);
  for (let y=0; y<H; y++){
    const cells = tokenRows[y].trim().split(/\s+/);
    for (let x=0; x<W; x++){
      const c = cells[x];
      m[y][x] = (c === '.' ? -1 : (K[c] ?? -1));
    }
  }
  return m;
}

/** Apply a 1px CSS "sprite" from an index-matrix + palette to a DOM element.
 *  (No-op in Node; keep for browser demos.)
 */
export function applyPixels(el, matrix, palette, { title } = {}){
  if (!el || typeof document === 'undefined') return;
  const H = matrix.length, W = matrix[0].length;
  const px = [];
  for (let y=0; y<H; y++){
    for (let x=0; x<W; x++){
      const idx = matrix[y][x];
      if (idx >= 0) px.push(`${x}px ${y}px 0 ${palette[idx]}`);
    }
  }
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.boxShadow = px.join(', ');
  if (title) el.title = title;
  el.setAttribute('aria-label', title || 'funebra-pixels');
}




// ─────────────────────────────────────────────────────────────────────────────
// Rasterization primitives
// ─────────────────────────────────────────────────────────────────────────────
export function pset(m, x, y, colorIndex) {
  if (!m || !m.length) return;
  if (y >= 0 && y < m.length && x >= 0 && x < m[0].length) m[y][x] = colorIndex;
}

export function line(m, x0, y0, x1, y1, colorIndex) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    pset(m, x0, y0, colorIndex);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function mapToGrid(x, y, { xmin, xmax, ymin, ymax, width, height }) {
  const gx = Math.round((x - xmin) / (xmax - xmin) * (width - 1));
  const gy = Math.round((1 - (y - ymin) / (ymax - ymin)) * (height - 1));
  return [gx, gy];
}

export function drawPolyline(matrix, xs, ys, opts) {
  const color = opts.lineColorIndex ?? 0;
  for (let i = 1; i < xs.length; i++) {
    const [x0, y0] = mapToGrid(xs[i - 1], ys[i - 1], opts);
    const [x1, y1] = mapToGrid(xs[i], ys[i], opts);
    line(matrix, x0, y0, x1, y1, color);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fields and composition
// ─────────────────────────────────────────────────────────────────────────────
export function fieldToMatrix(width, height, domain, f, stops) {
  // stops: [{ t: 0, colorIndex: -1 }, { t: 0.4, colorIndex: 3 }, ...]
  const m = makeMatrix(width, height, -1);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = domain.xmin + (i / (width - 1)) * (domain.xmax - domain.xmin);
      const y = domain.ymin + ((height - 1 - j) / (height - 1)) * (domain.ymax - domain.ymin);
      const t = Math.max(0, Math.min(1, f(x, y)));
      let idx = stops[stops.length - 1].colorIndex;
      for (const s of stops) { if (t <= s.t) { idx = s.colorIndex; break; } }
      if (idx !== -1) m[j][i] = idx;
    }
  }
  return m;
}

export function mergeUnder(top, under) {
  const h = top.length, w = top[0].length;
  const out = makeMatrix(w, h, -1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[y][x] = top[y][x] === -1 ? under[y][x] : top[y][x];
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generators (curves → pixel matrices)
// ─────────────────────────────────────────────────────────────────────────────
export function roseToPixels({
  width = 64,
  height = 64,
  domain = { xmin: -1.2, xmax: 1.2, ymin: -1.2, ymax: 1.2 },
  k = 5,
  steps = 720,
  lineColorIndex = 2,
  glow = true,
  glowStops = [
    { t: 0.20, colorIndex: -1 },
    { t: 0.35, colorIndex: 3 },
    { t: 0.60, colorIndex: 0 },
    { t: 1.00, colorIndex: 0 },
  ],
  palette = [ '#ffffff', '#222831', '#ff7a18', '#2bd4cf' ],
} = {}) {
  const m = makeMatrix(width, height, -1);
  const xs = new Array(steps), ys = new Array(steps);
  for (let u = 0; u < steps; u++) {
    const t = (u / steps) * Math.PI * 2;
    const r = Math.cos(k * t);
    xs[u] = r * Math.cos(t);
    ys[u] = r * Math.sin(t);
  }
  drawPolyline(m, xs, ys, { ...domain, width, height, lineColorIndex });

  if (!glow) return { matrix: m, palette };

  const field = (x, y) => {
    const d = Math.hypot(x, y);
    return Math.exp(-3 * d * d) * (0.5 + 0.5 * Math.cos(10 * d));
  };
  const g = fieldToMatrix(width, height, { ...domain }, field, glowStops);
  return { matrix: mergeUnder(m, g), palette };
}

export function spiroToPixels({
  width = 96,
  height = 96,
  domain = { xmin: -1.5, xmax: 1.5, ymin: -1.5, ymax: 1.5 },
  R = 5, r = 3, d = 5, // hypotrochoid params (proportional)
  steps = 2000,
  lineColorIndex = 2,
  palette = [ '#ffffff', '#222831', '#ff7a18', '#2bd4cf' ],
} = {}) {
  const m = makeMatrix(width, height, -1);
  const xs = new Array(steps), ys = new Array(steps);
  // Normalize params to unit space
  const kR = 1.0, kr = r / R, kd = d / R;
  for (let u = 0; u < steps; u++) {
    const t = (u / steps) * Math.PI * 2 * 4; // multiple laps
    const x = (kR - kr) * Math.cos(t) + kd * Math.cos(((kR - kr) / kr) * t);
    const y = (kR - kr) * Math.sin(t) - kd * Math.sin(((kR - kr) / kr) * t);
    xs[u] = x;
    ys[u] = y;
  }
  drawPolyline(m, xs, ys, { ...domain, width, height, lineColorIndex });
  return { matrix: m, palette };
}

export function heartToPixels({
  width = 72,
  height = 64,
  domain = { xmin: -1.8, xmax: 1.8, ymin: -1.5, ymax: 1.5 },
  iso = 0.0,
  lineColorIndex = 2,
  palette = [ '#ffffff', '#222831', '#ff7a18', '#2bd4cf' ],
} = {}) {
  // Use implicit heart: (x^2 + y^2 - 1)^3 - x^2 y^3 = 0 → contour
  const m = makeMatrix(width, height, -1);
  const f = (x, y) => Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
  // March along iso-contour by sampling grid cells and drawing edges where sign changes
  const gx = 140, gy = 120; // marching resolution (not pixels)
  const sign = (v) => (v >= iso ? 1 : -1);
  const val = [];
  for (let j = 0; j <= gy; j++) {
    const row = [];
    for (let i = 0; i <= gx; i++) {
      const x = domain.xmin + (i / gx) * (domain.xmax - domain.xmin);
      const y = domain.ymin + (j / gy) * (domain.ymax - domain.ymin);
      row.push(f(x, y));
    }
    val.push(row);
  }
  // Simple edge tracing by comparing neighbors
  for (let j = 1; j <= gy; j++) {
    for (let i = 1; i <= gx; i++) {
      const s00 = sign(val[j - 1][i - 1]);
      const s10 = sign(val[j - 1][i]);
      const s01 = sign(val[j][i - 1]);
      const s11 = sign(val[j][i]);
      if (s00 !== s10 || s00 !== s01 || s11 !== s10 || s11 !== s01) {
        // Map cell center to grid and draw a tiny segment
        const xc = domain.xmin + ((i - 0.5) / gx) * (domain.xmax - domain.xmin);
        const yc = domain.ymin + ((j - 0.5) / gy) * (domain.ymax - domain.ymin);
        const [gx0, gy0] = mapToGrid(xc - (domain.xmax - domain.xmin) / gx / 2, yc, { ...domain, width, height });
        const [gx1, gy1] = mapToGrid(xc + (domain.xmax - domain.xmin) / gx / 2, yc, { ...domain, width, height });
        line(m, gx0, gy0, gx1, gy1, lineColorIndex);
      }
    }
  }
  return { matrix: m, palette };
}

export function starToPixels({
  width = 64,
  height = 64,
  domain = { xmin: -1.2, xmax: 1.2, ymin: -1.2, ymax: 1.2 },
  points = 5,
  inner = 0.45,
  outer = 1.0,
  stepsPerEdge = 20,
  lineColorIndex = 2,
  palette = [ '#ffffff', '#222831', '#ff7a18', '#2bd4cf' ],
} = {}) {
  const verts = [];
  const N = points * 2;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 === 0) ? outer : inner;
    verts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  verts.push(verts[0]);
  const xs = [], ys = [];
  for (let i = 1; i < verts.length; i++) {
    const [x0, y0] = verts[i - 1];
    const [x1, y1] = verts[i];
    for (let k = 0; k <= stepsPerEdge; k++) {
      const t = k / stepsPerEdge;
      xs.push(x0 + (x1 - x0) * t);
      ys.push(y0 + (y1 - y0) * t);
    }
  }
  const m = makeMatrix(width, height, -1);
  drawPolyline(m, xs, ys, { ...domain, width, height, lineColorIndex });
  return { matrix: m, palette };
}

// ─────────────────────────────────────────────────────────────────────────────
// Projection (for simple 3D → 2D traces before rasterizing)
// ─────────────────────────────────────────────────────────────────────────────
export function project([x, y, z], fov = 2.2, camZ = 3) {
  const zf = fov / (camZ - z);
  return [x * zf, y * zf];
}
