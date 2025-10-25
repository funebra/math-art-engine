/*
 * Funebra Math‑Art Engine — Shapes Module (Full Library)
 * Version: 1.0.0 (2025-10-25)
 * Author: pLabs Entertainment · Funebra™
 *
 * What this module provides
 * -------------------------
 * 1) A canonical registry of 41 common shapes (2D & 3D) with ids, names, type, tags
 * 2) Pure JS geometry factories:
 *    - For 2D: returns either SVG <path> data (d) or a ready <svg> string via toSVG()
 *    - For 3D: returns a Three.js BufferGeometry if THREE is available, otherwise a JSON recipe you can feed later
 * 3) Utilities to make regular polygons, stars, rings, hearts, crescents, arrows, crosses, kites, trapezoids, etc.
 * 4) Prism & pyramid constructors for any n‑gon base
 *
 * Usage
 * -----
 * import {
 *   SHAPES, shapeByName, draw2D, build3D, toSVG, regularPolygonPath,
 *   starPath, ringPath, heartPath, crescentPath, trapezoidPath, kitePath
 * } from './script.module.js';
 *
 * // 2D example (SVG path d)
 * const d = regularPolygonPath({ sides: 6, r: 50 }); // hexagon path
 * const svg = toSVG(d, 120, 120); // <svg> string
 *
 * // 3D example (Three.js)
 * const geom = build3D('Hexagonal prism', { radius: 1, height: 2 });
 * const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0xffffff }));
 *
 * Notes
 * -----
 * - All angles are in radians
 * - 2D coordinate system is centered at (0,0) by default, y positive downward (SVG standard)
 * - 3D units are arbitrary; scale as you like
 */

// -------------------------
// Helper math
// -------------------------
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Polar to cartesian in SVG coords (y down)
function polar(r, a) {
  return [r * Math.cos(a), r * Math.sin(a)];
}

// Path helpers
function moveTo(x, y) { return `M ${x.toFixed(3)} ${y.toFixed(3)}`; }
function lineTo(x, y) { return `L ${x.toFixed(3)} ${y.toFixed(3)}`; }
function closePath() { return 'Z'; }

// Convert path commands to <svg> string
export function toSVG(d, w = 200, h = 200, stroke = '#fff', fill = 'none', strokeWidth = 2, viewBoxPad = 4) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${-w/2 - viewBoxPad} ${-h/2 - viewBoxPad} ${w + viewBoxPad*2} ${h + viewBoxPad*2}">\n  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>\n</svg>`;
}

// Regular polygon path (centered)
export function regularPolygonPath({ sides = 5, r = 50, phase = -Math.PI / 2 } = {}) {
  const n = Math.max(3, Math.floor(sides));
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = phase + TAU * (i / n);
    const [x, y] = polar(r, a);
    d += (i === 0 ? moveTo(x, y) : lineTo(x, y));
  }
  return d + closePath();
}

// Star polygon path (e.g., 5‑point star)
export function starPath({ points = 5, rOuter = 50, rInner = 22, phase = -Math.PI / 2 } = {}) {
  const n = Math.max(3, Math.floor(points));
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = (i % 2 === 0) ? rOuter : rInner;
    const a = phase + TAU * (i / (n * 2));
    const [x, y] = polar(r, a);
    d += (i === 0 ? moveTo(x, y) : lineTo(x, y));
  }
  return d + closePath();
}

// Ring/annulus path using two circles (uses even-odd fill rule)
export function ringPath({ rOuter = 50, rInner = 30 } = {}) {
  const rO = Math.max(rOuter, rInner);
  const rI = Math.min(rOuter, rInner);
  // Circles approximated by SVG circle commands via arc; simpler: use circles in a group
  // Here: path with two arcs and evenodd fill
  const c = (r) => `M ${(-r).toFixed(3)} 0 a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0`;
  return `${c(rO)} ${c(rI)}`; // Remember to set fill-rule: evenodd in consumer if you fill it
}

// Heart (parametric, smoothed)
export function heartPath({ w = 100, h = 90 } = {}) {
  const rx = w / 2, ry = h / 2;
  // cubic Bezier approximation
  const top = [0, -ry * 0.25];
  const left = [-rx, -ry * 0.1];
  const right = [rx, -ry * 0.1];
  const bottom = [0, ry];
  const c1 = [-rx * 0.8, -ry];
  const c2 = [-rx, ry * 0.4];
  const c3 = [rx, ry * 0.4];
  const c4 = [rx * 0.8, -ry];
  return [
    moveTo(...top),
    `C ${c1[0]} ${c1[1]} ${left[0]} ${left[1]} 0 0`,
    `C ${right[0]} ${right[1]} ${c4[0]} ${c4[1]} ${top[0]} ${top[1]}`,
    `C ${c1[0]} ${c1[1]} ${-rx} ${ry * 0.4} ${bottom[0]} ${bottom[1]}`,
    `C ${rx} ${ry * 0.4} ${c4[0]} ${c4[1]} ${top[0]} ${top[1]}`,
    closePath()
  ].join(' ');
}

// Crescent (difference of circles)
export function crescentPath({ r = 50, offset = 20 } = {}) {
  const R = r, o = clamp(offset, -R, R);
  const left = `M ${-R} 0 a ${R} ${R} 0 1 0 ${2*R} 0 a ${R} ${R} 0 1 0 ${-2*R} 0`;
  const r2 = Math.abs(R - o);
  const right = `M ${-o - r2} 0 a ${r2} ${r2} 0 1 1 ${2*r2} 0 a ${r2} ${r2} 0 1 1 ${-2*r2} 0`;
  return `${left} ${right}`; // Use fill-rule:evenodd to punch the hole
}

// Trapezoid (US) / Trapezium (UK alt); we expose both
export function trapezoidPath({ top = 60, bottom = 100, height = 70 } = {}) {
  const t = top / 2, b = bottom / 2, h = height / 2;
  return [
    moveTo(-t, -h), lineTo(t, -h), lineTo(b, h), lineTo(-b, h), closePath()
  ].join(' ');
}

export function kitePath({ w = 100, h = 120, midY = 0.1 } = {}) {
  const rx = w / 2, ry = h / 2;
  return [
    moveTo(0, -ry),
    lineTo(rx, midY * h - ry),
    lineTo(0, ry),
    lineTo(-rx, midY * h - ry),
    closePath()
  ].join(' ');
}

export function arrowPath({ w = 120, h = 80, head = 0.45 } = {}) {
  const rx = w / 2, ry = h / 2, hh = clamp(head, 0.2, 0.8);
  const shaft = (1 - hh) * w;
  return [
    moveTo(-rx, -ry * 0.3),
    lineTo(-rx + shaft, -ry * 0.3),
    lineTo(-rx + shaft, -ry),
    lineTo(rx, 0),
    lineTo(-rx + shaft, ry),
    lineTo(-rx + shaft, ry * 0.3),
    lineTo(-rx, ry * 0.3),
    closePath()
  ].join(' ');
}

export function crossPath({ w = 90, h = 120, bar = 0.28 } = {}) {
  const rx = w / 2, ry = h / 2, b = clamp(bar, 0.15, 0.45);
  const bw = w * b, bh = h * b;
  return [
    moveTo(-bw/2, -ry), lineTo(bw/2, -ry), lineTo(bw/2, -bh/2), lineTo(rx, -bh/2),
    lineTo(rx, bh/2), lineTo(bw/2, bh/2), lineTo(bw/2, ry), lineTo(-bw/2, ry),
    lineTo(-bw/2, bh/2), lineTo(-rx, bh/2), lineTo(-rx, -bh/2), lineTo(-bw/2, -bh/2),
    closePath()
  ].join(' ');
}

// Circle / ellipse
export function circlePath({ r = 50 } = {}) {
  return `M ${-r} 0 a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0`;
}
export function ellipsePath({ rx = 60, ry = 40 } = {}) {
  return `M ${-rx} 0 a ${rx} ${ry} 0 1 0 ${2*rx} 0 a ${rx} ${ry} 0 1 0 ${-2*rx} 0`;
}

// Rectangle / rounded rect
export function rectPath({ w = 100, h = 60 } = {}) {
  const rx = w/2, ry = h/2;
  return [moveTo(-rx, -ry), lineTo(rx, -ry), lineTo(rx, ry), lineTo(-rx, ry), closePath()].join(' ');
}

// Right triangle
export function rightTrianglePath({ w = 100, h = 80 } = {}) {
  const rx = w/2, ry = h/2;
  return [moveTo(-rx, -ry), lineTo(rx, -ry), lineTo(-rx, ry), closePath()].join(' ');
}

// Parallelogram
export function parallelogramPath({ w = 120, h = 70, skew = 0.25 } = {}) {
  const rx = w/2, ry = h/2, dx = w * skew * 0.5;
  return [moveTo(-rx+dx, -ry), lineTo(rx+dx, -ry), lineTo(rx-dx, ry), lineTo(-rx-dx, ry), closePath()].join(' ');
}

// Rhombus (diamond)
export function rhombusPath({ w = 90, h = 90 } = {}) {
  const rx = w/2, ry = h/2;
  return [moveTo(0, -ry), lineTo(rx, 0), lineTo(0, ry), lineTo(-rx, 0), closePath()].join(' ');
}

// Semicircle
export function semicirclePath({ r = 50, up = false } = {}) {
  const sign = up ? -1 : 1;
  return `M ${-r} 0 a ${r} ${r} 0 0 ${up?0:1} ${2*r} 0 L ${r} 0 L ${-r} 0 Z`;
}

// -------------------------
// 3D builders (Three.js if present)
// -------------------------
function hasTHREE() { return typeof THREE !== 'undefined' && THREE?.BufferGeometry; }

// Helper: prism from n‑gon (extrude)
function buildPrism({ sides = 6, radius = 1, height = 1 }) {
  if (!hasTHREE()) return { kind: 'prism', sides, radius, height };
  const shape = new THREE.Shape();
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI/2 + TAU * (i / sides);
    const x = radius * Math.cos(a);
    const y = radius * Math.sin(a);
    (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
  }
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geom.translate(0, 0, -height/2);
  return geom;
}

// Helper: pyramid from n‑gon base
function buildPyramid({ sides = 4, radius = 1, height = 1 }) {
  if (!hasTHREE()) return { kind: 'pyramid', sides, radius, height };
  const geom = new THREE.ConeGeometry(radius, height, Math.max(3, sides));
  return geom;
}

// Hemisphere
function buildHemisphere({ radius = 1, widthSegments = 32, heightSegments = 16 }) {
  if (!hasTHREE()) return { kind: 'hemisphere', radius, widthSegments, heightSegments };
  return new THREE.SphereGeometry(radius, widthSegments, heightSegments, 0, TAU, 0, Math.PI/2);
}

// Public 3D builder
export function build3D(name, opts = {}) {
  switch ((name||'').toLowerCase()) {
    case 'cube': return hasTHREE() ? new THREE.BoxGeometry(opts.size ?? 1, opts.size ?? 1, opts.size ?? 1) : { kind:'box', ...opts };
    case 'cuboid':
    case 'rectangular prism': return hasTHREE() ? new THREE.BoxGeometry(opts.w ?? 1.2, opts.h ?? 0.8, opts.d ?? 1) : { kind:'box', ...opts };
    case 'cylinder': return hasTHREE() ? new THREE.CylinderGeometry(opts.r ?? 0.6, opts.r ?? 0.6, opts.height ?? 1.2, opts.segments ?? 32) : { kind:'cylinder', ...opts };
    case 'sphere': return hasTHREE() ? new THREE.SphereGeometry(opts.r ?? 0.7, opts.widthSegments ?? 32, opts.heightSegments ?? 18) : { kind:'sphere', ...opts };
    case 'hemisphere': return buildHemisphere(opts);
    case 'cone': return hasTHREE() ? new THREE.ConeGeometry(opts.r ?? 0.6, opts.height ?? 1.2, opts.segments ?? 32) : { kind:'cone', ...opts };
    case 'tetrahedron': return hasTHREE() ? new THREE.TetrahedronGeometry(opts.r ?? 0.8) : { kind:'tetra', ...opts };
    case 'octahedron': return hasTHREE() ? new THREE.OctahedronGeometry(opts.r ?? 0.8) : { kind:'octa', ...opts };
    case 'pyramid':
    case 'square pyramid': return buildPyramid({ sides: 4, radius: opts.r ?? 0.7, height: opts.height ?? 1.2 });
    case 'hexagonal pyramid': return buildPyramid({ sides: 6, radius: opts.r ?? 0.7, height: opts.height ?? 1.2 });
    case 'triangular prism': return buildPrism({ sides: 3, radius: opts.radius ?? 0.7, height: opts.height ?? 1.2 });
    case 'pentagonal prism': return buildPrism({ sides: 5, radius: opts.radius ?? 0.7, height: opts.height ?? 1.2 });
    case 'prism': return buildPrism({ sides: opts.sides ?? 6, radius: opts.radius ?? 0.7, height: opts.height ?? 1.2 });
    default:
      return { kind: 'unknown', name, opts };
  }
}

// -------------------------
// 2D dispatcher by name -> path string
// -------------------------
export function draw2D(name, params = {}) {
  const key = (name||'').toLowerCase();
  switch (key) {
    case 'circle': return circlePath({ r: params.r ?? 50 });
    case 'semicircle': return semicirclePath({ r: params.r ?? 50, up: params.up ?? false });
    case 'oval': return ellipsePath({ rx: params.rx ?? 60, ry: params.ry ?? 40 });
    case 'ring': return ringPath({ rOuter: params.rOuter ?? 60, rInner: params.rInner ?? 40 });
    case 'square': return rectPath({ w: params.w ?? 90, h: params.h ?? 90 });
    case 'rectangle': return rectPath({ w: params.w ?? 120, h: params.h ?? 80 });
    case 'triangle': return regularPolygonPath({ sides: 3, r: params.r ?? 60 });
    case 'right triangle': return rightTrianglePath({ w: params.w ?? 120, h: params.h ?? 90 });
    case 'rhombus':
    case 'diamond': return rhombusPath({ w: params.w ?? 90, h: params.h ?? 90 });
    case 'parallelogram': return parallelogramPath({ w: params.w ?? 120, h: params.h ?? 70, skew: params.skew ?? 0.25 });
    case 'pentagon': return regularPolygonPath({ sides: 5, r: params.r ?? 60 });
    case 'hexagon': return regularPolygonPath({ sides: 6, r: params.r ?? 60 });
    case 'heptagon': return regularPolygonPath({ sides: 7, r: params.r ?? 60 });
    case 'octagon': return regularPolygonPath({ sides: 8, r: params.r ?? 60 });
    case 'nonagon': return regularPolygonPath({ sides: 9, r: params.r ?? 60 });
    case 'decagon': return regularPolygonPath({ sides: 10, r: params.r ?? 60 });
    case 'star': return starPath({ points: params.points ?? 5, rOuter: params.rOuter ?? 60, rInner: params.rInner ?? 26 });
    case 'heart': return heartPath({ w: params.w ?? 100, h: params.h ?? 90 });
    case 'semicircle': return semicirclePath({ r: params.r ?? 50, up: params.up ?? false });
    case 'quadrilateral': return regularPolygonPath({ sides: 4, r: params.r ?? 60 });
    case 'trapezoid': return trapezoidPath({ top: params.top ?? 70, bottom: params.bottom ?? 110, height: params.height ?? 80 });
    case 'trapezium': return trapezoidPath({ top: params.top ?? 70, bottom: params.bottom ?? 110, height: params.height ?? 80 });
    case 'kite': return kitePath({ w: params.w ?? 100, h: params.h ?? 120, midY: params.midY ?? 0.1 });
    case 'arrow': return arrowPath({ w: params.w ?? 120, h: params.h ?? 80, head: params.head ?? 0.45 });
    case 'cross': return crossPath({ w: params.w ?? 90, h: params.h ?? 120, bar: params.bar ?? 0.28 });
    case 'crescent': return crescentPath({ r: params.r ?? 55, offset: params.offset ?? 20 });
    default: return '';
  }
}

// -------------------------
// Registry
// -------------------------
export const SHAPES = [
  { id: 1,  name: 'Circle', type: '2d', tags: ['round','curve'] },
  { id: 2,  name: 'Square', type: '2d', tags: ['polygon','4'] },
  { id: 3,  name: 'Rectangle', type: '2d', tags: ['quad'] },
  { id: 4,  name: 'Triangle', type: '2d', tags: ['polygon','3'] },
  { id: 5,  name: 'Right triangle', type: '2d', tags: ['polygon','3','right'] },
  { id: 6,  name: 'Rhombus', type: '2d', tags: ['diamond','quad'] },
  { id: 7,  name: 'Parallelogram', type: '2d', tags: ['quad'] },
  { id: 8,  name: 'Cube', type: '3d', tags: ['box'] },
  { id: 9,  name: 'Cuboid', type: '3d', tags: ['rectangular prism'] },
  { id:10,  name: 'Cylinder', type: '3d', tags: ['round'] },
  { id:11,  name: 'Sphere', type: '3d', tags: ['round'] },
  { id:12,  name: 'Hemisphere', type: '3d', tags: ['round'] },
  { id:13,  name: 'Cone', type: '3d', tags: [] },
  { id:14,  name: 'Diamond', type: '2d', tags: ['rhombus'] },
  { id:15,  name: 'Star', type: '2d', tags: ['polygon'] },
  { id:16,  name: 'Heart', type: '2d', tags: [] },
  { id:17,  name: 'Pentagon', type: '2d', tags: ['polygon','5'] },
  { id:18,  name: 'Hexagon', type: '2d', tags: ['polygon','6'] },
  { id:19,  name: 'Heptagon', type: '2d', tags: ['polygon','7'] },
  { id:20,  name: 'Octagon', type: '2d', tags: ['polygon','8'] },
  { id:21,  name: 'Nonagon', type: '2d', tags: ['polygon','9'] },
  { id:22,  name: 'Decagon', type: '2d', tags: ['polygon','10'] },
  { id:23,  name: 'Semicircle', type: '2d', tags: ['half circle'] },
  { id:24,  name: 'Quadrilateral', type: '2d', tags: ['polygon','4'] },
  { id:25,  name: 'Pyramid', type: '3d', tags: ['generic'] },
  { id:26,  name: 'Prism', type: '3d', tags: ['generic'] },
  { id:27,  name: 'Trapezium', type: '2d', tags: ['UK','quad'] },
  { id:28,  name: 'Trapezoid', type: '2d', tags: ['US','quad'] },
  { id:29,  name: 'Oval', type: '2d', tags: ['ellipse'] },
  { id:30,  name: 'Ring', type: '2d', tags: ['annulus'] },
  { id:31,  name: 'Kite', type: '2d', tags: ['quad'] },
  { id:32,  name: 'Arrow', type: '2d', tags: ['symbol'] },
  { id:33,  name: 'Cross', type: '2d', tags: ['symbol'] },
  { id:34,  name: 'Crescent', type: '2d', tags: ['moon'] },
  { id:35,  name: 'Tetrahedron', type: '3d', tags: ['polyhedron'] },
  { id:36,  name: 'Octahedron', type: '3d', tags: ['polyhedron'] },
  { id:37,  name: 'Square pyramid', type: '3d', tags: ['pyramid'] },
  { id:38,  name: 'Hexagonal pyramid', type: '3d', tags: ['pyramid'] },
  { id:39,  name: 'Triangular prism', type: '3d', tags: ['prism'] },
  { id:40,  name: 'Rectangular prism', type: '3d', tags: ['prism'] },
  { id:41,  name: 'Pentagonal prism', type: '3d', tags: ['prism'] },
];

export function shapeByName(name) {
  const key = (name||'').toLowerCase();
  return SHAPES.find(s => s.name.toLowerCase() === key || s.tags?.some(t => t.toLowerCase() === key));
}

// -------------------------
// Pre-made thumbnails (SVG) for all 2D shapes
// -------------------------
export function makeShapeSVG(name, opts = {}, size = 160) {
  const d = draw2D(name, opts);
  if (!d) return '';
  return toSVG(d, size, size, '#fff', 'none', 3);
}

// Convenience: inline <svg> strings for a set of names
export function makeSVGIndex(names = SHAPES.filter(s=>s.type==='2d').map(s=>s.name)) {
  return names.map(n => ({ name: n, svg: makeShapeSVG(n) }));
}

// -------------------------
// Example factory presets (so callers can quickly build)
// -------------------------
export const PRESETS_2D = {
  Circle: { r: 56 },
  Square: { w: 110, h: 110 },
  Rectangle: { w: 140, h: 90 },
  Triangle: { r: 70 },
  'Right triangle': { w: 140, h: 100 },
  Rhombus: { w: 110, h: 110 },
  Parallelogram: { w: 150, h: 90, skew: 0.25 },
  Star: { points: 5, rOuter: 70, rInner: 28 },
  Heart: { w: 120, h: 96 },
  Pentagon: { r: 70 },
  Hexagon: { r: 70 },
  Heptagon: { r: 70 },
  Octagon: { r: 70 },
  Nonagon: { r: 70 },
  Decagon: { r: 70 },
  Semicircle: { r: 70, up: false },
  Quadrilateral: { r: 70 },
  Trapezoid: { top: 90, bottom: 140, height: 100 },
  Trapezium: { top: 90, bottom: 140, height: 100 },
  Oval: { rx: 80, ry: 52 },
  Ring: { rOuter: 80, rInner: 52 },
  Kite: { w: 120, h: 140, midY: 0.12 },
  Arrow: { w: 160, h: 100, head: 0.44 },
  Cross: { w: 110, h: 140, bar: 0.28 },
  Crescent: { r: 74, offset: 26 },
};

export const PRESETS_3D = {
  Cube: { size: 1 },
  Cuboid: { w: 1.4, h: 0.9, d: 1.1 },
  Cylinder: { r: 0.6, height: 1.2, segments: 32 },
  Sphere: { r: 0.7, widthSegments: 32, heightSegments: 18 },
  Hemisphere: { radius: 0.7, widthSegments: 32, heightSegments: 16 },
  Cone: { r: 0.6, height: 1.2, segments: 32 },
  Tetrahedron: { r: 0.8 },
  Octahedron: { r: 0.8 },
  Pyramid: { sides: 4, radius: 0.7, height: 1.2 },
  'Square pyramid': { sides: 4, radius: 0.7, height: 1.2 },
  'Hexagonal pyramid': { sides: 6, radius: 0.7, height: 1.2 },
  'Triangular prism': { sides: 3, radius: 0.7, height: 1.2 },
  Prism: { sides: 6, radius: 0.7, height: 1.2 },
  'Rectangular prism': { sides: 4, radius: 0.7, height: 1.2 },
  'Pentagonal prism': { sides: 5, radius: 0.7, height: 1.2 },
};

// -------------------------
// Minimal CSS (optional export string if embedding)
// -------------------------
export const SHAPE_CSS = `
svg { display: block; }
path { vector-effect: non-scaling-stroke; }
`;

// Default export (for convenience in simple imports)
export default {
  SHAPES,
  PRESETS_2D,
  PRESETS_3D,
  shapeByName,
  draw2D,
  build3D,
  toSVG,
  // path helpers
  regularPolygonPath,
  starPath,
  ringPath,
  heartPath,
  crescentPath,
  trapezoidPath,
  kitePath,
  arrowPath,
  crossPath,
  circlePath,
  ellipsePath,
  rectPath,
  rightTrianglePath,
  parallelogramPath,
  rhombusPath,
  semicirclePath,
  // utilities
  lerp, clamp, TAU,
};
