// script.module.js — ES Module version of core Funebra pieces
// Pure ESM (no globals). Uses local THREE import. Default export exposes the namespace.
// Usage:
//   import Funebra, { makeParametric3D, surfaces } from './script.module.js';
//   import * as THREE from 'three';
//   const geo = makeParametric3D(surfaces.torus({R:1.2,r:0.4}), {nu:256,nv:128});

import * as THREE from 'three';

// ──────────────────────────────────────────────────────────────────────────────
// constants + tiny helpers
// ──────────────────────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;

const _normStep = (o, steps) => {
  const s = (steps|0) > 0 ? (steps|0) : 1;
  return { t: (o % s) / s, s };
};

// ──────────────────────────────────────────────────────────────────────────────
// Core Funebra line helpers
// ──────────────────────────────────────────────────────────────────────────────
export function lineX(o, centerX, radius, direction, stepsPerEdge) {
  const t = (o % stepsPerEdge) / stepsPerEdge;
  return centerX + Math.cos(direction) * radius * t;
}
export function lineY(o, centerY, radius, direction, stepsPerEdge) {
  const t = (o % stepsPerEdge) / stepsPerEdge;
  return centerY + Math.sin(direction) * radius * t;
}

// ──────────────────────────────────────────────────────────────────────────────
// Circles / Ellipses
// ──────────────────────────────────────────────────────────────────────────────
export function circleX(o, radius, centerX, totalSteps, offset = 0) {
  const theta = ((o % totalSteps) / totalSteps) * TAU + offset;
  return centerX + Math.cos(theta) * radius;
}
export function circleY(o, radius, centerY, totalSteps, offset = 0) {
  const theta = ((o % totalSteps) / totalSteps) * TAU + offset;
  return centerY + Math.sin(theta) * radius;
}

// Ellipse with independent radii, rotation (radians) + angular offset
export function ellipseX(o, rx, ry, centerX, centerY, totalSteps, rotation = 0, offset = 0) {
  const { t } = _normStep(o, totalSteps);
  const th = t * TAU + offset;
  const cs = Math.cos(th), sn = Math.sin(th);
  const xr = rx * cs,      yr = ry * sn;
  const cr = Math.cos(rotation), sr = Math.sin(rotation);
  return centerX + xr * cr - yr * sr;
}
export function ellipseY(o, rx, ry, centerX, centerY, totalSteps, rotation = 0, offset = 0) {
  const { t } = _normStep(o, totalSteps);
  const th = t * TAU + offset;
  const cs = Math.cos(th), sn = Math.sin(th);
  const xr = rx * cs,      yr = ry * sn;
  const cr = Math.cos(rotation), sr = Math.sin(rotation);
  return centerY + xr * sr + yr * cr;
}

// Line segments
export function lineSegmentX(o, steps, ax, ay, bx, by) { const { t } = _normStep(o, steps); return ax + (bx - ax) * t; }
export function lineSegmentY(o, steps, ax, ay, bx, by) { const { t } = _normStep(o, steps); return ay + (by - ay) * t; }

// ──────────────────────────────────────────────────────────────────────────────
/** Generic Bézier math */
// ──────────────────────────────────────────────────────────────────────────────
export function bezierPoint1D(t, pts) {
  let a = pts.slice();
  for (let k = a.length - 1; k > 0; k--) {
    for (let i = 0; i < k; i++) a[i] = (1 - t) * a[i] + t * a[i + 1];
  }
  return a[0];
}
export function bezierPoint2D(t, pts) {
  let tmp = pts.map(p => [p[0], p[1]]);
  for (let k = tmp.length - 1; k > 0; k--) {
    for (let i = 0; i < k; i++) {
      tmp[i][0] = (1 - t) * tmp[i][0] + t * tmp[i + 1][0];
      tmp[i][1] = (1 - t) * tmp[i][1] + t * tmp[i + 1][1];
    }
  }
  return tmp[0];
}

// even-arc-length resample for any f(t)->[x,y]
export function resampleEven(f, N = 256) {
  const M = Math.max(64, N * 8);
  const xs = new Float32Array(M);
  const ys = new Float32Array(M);
  const ls = new Float32Array(M);
  let L = 0, px = 0, py = 0;

  for (let i = 0; i < M; i++) {
    const t = i / (M - 1);
    const [x, y] = f(t);
    xs[i] = x; ys[i] = y;
    if (i) L += Math.hypot(x - px, y - py);
    ls[i] = L; px = x; py = y;
  }
  const out = new Array(N);
  for (let k = 0; k < N; k++) {
    const target = (k / (N - 1)) * L;
    let lo = 0, hi = M - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; (ls[mid] < target) ? (lo = mid + 1) : (hi = mid); }
    const i1 = Math.max(1, lo), i0 = i1 - 1;
    const segL = ls[i1] - ls[i0] || 1;
    const a = (target - ls[i0]) / segL;
    out[k] = [ xs[i0] + a * (xs[i1] - xs[i0]), ys[i0] + a * (ys[i1] - ys[i0]) ];
  }
  return out;
}

// SVG path for poly-Bézier
export function polyBezierToSVGPath(segments) {
  if (!segments?.length) return '';
  const s0 = segments[0];
  let d = `M ${s0.A[0]} ${s0.A[1]}`;
  for (const s of segments) {
    if (s.type === 'quad') d += ` Q ${s.B[0]} ${s.B[1]} ${s.C[0]} ${s.C[1]}`;
    else                   d += ` C ${s.B[0]} ${s.B[1]} ${s.C[0]} ${s.C[1]} ${s.D[0]} ${s.D[1]}`;
  }
  return d;
}

// Quadratic / Cubic convenience
export function bezierQuadX(o, steps, Ax, Ay, Bx, By, Cx, Cy) { const t = (o % steps) / steps; return (1-t)*(1-t)*Ax + 2*(1-t)*t*Bx + t*t*Cx; }
export function bezierQuadY(o, steps, Ax, Ay, Bx, By, Cx, Cy) { const t = (o % steps) / steps; return (1-t)*(1-t)*Ay + 2*(1-t)*t*By + t*t*Cy; }
export function bezierCubicX(o, steps, Ax, Ay, Bx, By, Cx, Cy, Dx, Dy) { const t = (o % steps) / steps, u = 1 - t; return u*u*u*Ax + 3*u*u*t*Bx + 3*u*t*t*Cx + t*t*t*Dx; }
export function bezierCubicY(o, steps, Ax, Ay, Bx, By, Cx, Cy, Dx, Dy) { const t = (o % steps) / steps, u = 1 - t; return u*u*u*Ay + 3*u*u*t*By + 3*u*t*t*Cy + t*t*t*Dy; }

// Poly-Bézier sampler
export function polyBezierX(o, segments) {
  let acc = 0;
  for (const s of segments) {
    const n = s.steps|0; if (o < acc + n) {
      const i = o - acc;
      return (s.type === 'quad')
        ? bezierQuadX(i, n, s.A[0], s.A[1], s.B[0], s.B[1], s.C[0], s.C[1])
        : bezierCubicX(i, n, s.A[0], s.A[1], s.B[0], s.B[1], s.C[0], s.C[1], s.D[0], s.D[1]);
    }
    acc += n;
  }
  const last = segments[segments.length-1];
  return (last.type==='quad'? last.C[0] : last.D[0]);
}
export function polyBezierY(o, segments) {
  let acc = 0;
  for (const s of segments) {
    const n = s.steps|0; if (o < acc + n) {
      const i = o - acc;
      return (s.type === 'quad')
        ? bezierQuadY(i, n, s.A[0], s.A[1], s.B[0], s.B[1], s.C[0], s.C[1])
        : bezierCubicY(i, n, s.A[0], s.A[1], s.B[0], s.B[1], s.C[0], s.C[1], s.D[0], s.D[1]);
    }
    acc += n;
  }
  const last = segments[segments.length-1];
  return (last.type==='quad'? last.C[1] : last.D[1]);
}

// ──────────────────────────────────────────────────────────────────────────────
// Polygons / Stars / Waves / Triangles
// ──────────────────────────────────────────────────────────────────────────────
export function polygonX(o, sides, radius, centerX, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * TAU) / sides;
  const a2   = ((edge+1) * TAU) / sides;
  return (1-t) * (Math.cos(a1)*radius + centerX) + t * (Math.cos(a2)*radius + centerX);
}
export function polygonY(o, sides, radius, centerY, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * TAU) / sides;
  const a2   = ((edge+1) * TAU) / sides;
  return (1-t) * (Math.sin(a1)*radius + centerY) + t * (Math.sin(a2)*radius + centerY);
}
export function starX(o, sides, outerR, innerR, centerX, stepsPerEdge){
  const total = sides*2, edge = Math.floor(o/stepsPerEdge), t=(o%stepsPerEdge)/stepsPerEdge;
  const a1=(edge*TAU)/total, a2=((edge+1)*TAU)/total;
  const r1 = edge%2===0 ? outerR : innerR;
  const r2 = (edge+1)%2===0 ? outerR : innerR;
  return (1-t)*(Math.cos(a1)*r1 + centerX) + t*(Math.cos(a2)*r2 + centerX);
}
export function starY(o, sides, outerR, innerR, centerY, stepsPerEdge){
  const total = sides*2, edge = Math.floor(o/stepsPerEdge), t=(o%stepsPerEdge)/stepsPerEdge;
  const a1=(edge*TAU)/total, a2=((edge+1)*TAU)/total;
  const r1 = edge%2===0 ? outerR : innerR;
  const r2 = (edge+1)%2===0 ? outerR : innerR;
  return (1-t)*(Math.sin(a1)*r1 + centerY) + t*(Math.sin(a2)*r2 + centerY);
}

export function squareWave(t, A, period, cy=0){ return ((t%period) < period/2 ? A : -A) + cy; }
export function wave(type, t, A, period, cy=0){
  const ph=(t%period)/period;
  if(type==="sine")     return Math.sin(ph*TAU)*A + cy;
  if(type==="square")   return (ph<.5?A:-A) + cy;
  if(type==="triangle") return (4*A*Math.abs(ph-.5)-A) + cy;
  if(type==="sawtooth") return (2*A*(ph-.5)) + cy;
  return cy;
}
export function waveX(o, step){ return o*step; }
export function waveY(o, type, A, period, cy){ return wave(type, o, A, period, cy); }

export function curwaveX(i, step){ return i*step; }
export function curwaveY(rate, minRate, maxRate, height, centerY){
  const n = (rate - minRate) / (maxRate - minRate || 1);
  return centerY + height/2 - n*height;
}

export function triX(o, verts, stepsPerEdge){
  const e=Math.floor(o/stepsPerEdge)%3, t=(o%stepsPerEdge)/stepsPerEdge;
  return (1-t)*verts[e][0] + t*verts[(e+1)%3][0];
}
export function triY(o, verts, stepsPerEdge){
  const e=Math.floor(o/stepsPerEdge)%3, t=(o%stepsPerEdge)/stepsPerEdge;
  return (1-t)*verts[e][1] + t*verts[(e+1)%3][1];
}

// ──────────────────────────────────────────────────────────────────────────────
// Simple cube projection
// ──────────────────────────────────────────────────────────────────────────────
export function cube(o, size, cx=0, cy=0, stepsPerEdge=10){
  const h=size/2, V=[[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]];
  const E=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const ei=Math.floor(o/stepsPerEdge)%E.length, t=(o%stepsPerEdge)/stepsPerEdge;
  const [a,b]=E[ei], [x1,y1,z1]=V[a], [x2,y2,z2]=V[b];
  const x=x1+(x2-x1)*t, y=y1+(y2-y1)*t, z=z1+(z2-z1)*t;
  return { x: cx + x + 0.5*z, y: cy - y - 0.3*z };
}

// ──────────────────────────────────────────────────────────────────────────────
/** Hearts 2D/3D */
// ──────────────────────────────────────────────────────────────────────────────
export function heart2D_x(o, steps=360, s=6, cx=0){
  const t = (o/steps)*TAU;
  return cx + s*16*Math.pow(Math.sin(t),3);
}
export function heart2D_y(o, steps=360, s=6, cy=0){
  const t = (o/steps)*TAU;
  return cy - s*(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t));
}
export function heart3D_steps(U=140, V=96){ return (U+1)*(V+1); }
function _heartProfile(u, scale){
  return {
    x: scale*16*Math.pow(Math.sin(u),3),
    y: scale*(13*Math.cos(u) - 5*Math.cos(2*u) - 2*Math.cos(3*u) - Math.cos(4*u))
  };
}
function _ij(o,U,V){ const cols=V+1; return { i:Math.floor(o/cols), j:o%cols }; }
export function heart3D_x(o, steps, scale=0.30, U=140, V=96){
  const {i,j}=_ij(o,U,V); const u=(i/U)*Math.PI, phi=(j/V)*TAU;
  const r=Math.max(_heartProfile(u,scale).x,0);
  return r*Math.cos(phi);
}
export function heart3D_y(o, steps, scale=0.30, U=140, V=96){
  const {i}=_ij(o,U,V); const u=(i/U)*Math.PI;
  return _heartProfile(u,scale).y;
}
export function heart3D_z(o, steps, scale=0.30, U=140, V=96){
  const {i,j}=_ij(o,U,V); const u=(i/U)*Math.PI, phi=(j/V)*TAU;
  const r=Math.max(_heartProfile(u,scale).x,0);
  return r*Math.sin(phi);
}

// ──────────────────────────────────────────────────────────────────────────────
/** Cross (Latin) */
// ──────────────────────────────────────────────────────────────────────────────
export function latinCrossVertices(
  cx = 300, cy = 360,
  H = 240, stemW = 60,
  barW = 200, barT = 60,
  barCenterY = -H/6, theta = 0
){
  const H2 = H/2, s = stemW/2, b = barW/2, th = barT/2, yb = barCenterY;
  const raw = [
    [-s, -H2],[ s, -H2],[ s, yb - th],[ b, yb - th],
    [ b,  yb + th],[ s,  yb + th],[ s,  H2],[-s,  H2],
    [-s,  yb + th],[-b, yb + th],[-b, yb - th],[-s, yb - th],
  ];
  const c = Math.cos(theta), sn = Math.sin(theta);
  return raw.map(([x,y]) => [ cx + x*c - y*sn, cy + x*sn + y*c ]);
}
export function crossX(o, stepsPerEdge = 30, ...cfg){
  const v = latinCrossVertices(...cfg), n = v.length;
  const edge = Math.floor(o / stepsPerEdge) % n;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [x1] = v[edge], [x2] = v[(edge+1) % n];
  return (1 - t) * x1 + t * x2;
}
export function crossY(o, stepsPerEdge = 30, ...cfg){
  const v = latinCrossVertices(...cfg), n = v.length;
  const edge = Math.floor(o / stepsPerEdge) % n;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [,y1] = v[edge], [,y2] = v[(edge+1) % n];
  return (1 - t) * y1 + t * y2;
}
export function crossZ(
  o, steps,
  cx, cy,
  hLen, hThick,
  vLen, vThick,
  amp = 0, phase = 0,
  zCenter = 0, pitch = 0
){
  const t = (o / steps) * TAU;
  return zCenter + amp * Math.sin(t + phase) + pitch * (t / TAU);
}
export const crossZFlat = () => 0;

// ──────────────────────────────────────────────────────────────────────────────
/** Pyramid wireframe (projected)
 *  Backward compatible with your positional params AND a safer config object:
 *  _pyramidProjectedPoint(o, stepsPerEdge, { cx, cy, base, height, rx, ry, rz, dist, scale })
 */
// ──────────────────────────────────────────────────────────────────────────────
function _pyramidProjectedPoint(o, stepsPerEdge = 40, ...rest){
  // detect legacy vs object call
  let cfg;
  if (typeof rest[0] === 'object') {
    cfg = { cx:300, cy:360, base:220, height:220, rx:-0.3, ry:0.6, rz:0, dist:700, scale:1, ...rest[0] };
  } else {
    const [cx=300, cy=360, base=220, height=220, rx=-0.3, ry=0.6, rz=0.0, dist=700, scale=1] = rest;
    cfg = { cx, cy, base, height, rx, ry, rz, dist, scale };
  }

  const b = cfg.base / 2;
  const V = [[-b,0,-b],[ b,0,-b],[ b,0, b],[-b,0, b],[0,-cfg.height,0]];
  const E = [[0,1],[1,2],[2,3],[3,0],[4,0],[4,1],[4,2],[4,3]];
  const nE = E.length;

  const edge = Math.floor(o / stepsPerEdge) % nE;
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const [i1, i2] = E[edge];
  let [x,y,z] = [0,0,0];
  {
    const [x1,y1,z1] = V[i1];
    const [x2,y2,z2] = V[i2];
    x = (1-t)*x1 + t*x2;
    y = (1-t)*y1 + t*y2;
    z = (1-t)*z1 + t*z2;
  }

  // rotations
  {
    const cxX = Math.cos(cfg.rx), sxX = Math.sin(cfg.rx);
    const yx =  y*cxX - z*sxX; const zx =  y*sxX + z*cxX; y = yx; z = zx;

    const cxY = Math.cos(cfg.ry), sxY = Math.sin(cfg.ry);
    const xy =  x*cxY + z*sxY;   const zy = -x*sxY + z*cxY; x = xy; z = zy;

    const cxZ = Math.cos(cfg.rz), sxZ = Math.sin(cfg.rz);
    const xz = x*cxZ - y*sxZ;    const yz = x*sxZ + y*cxZ;  x = xz; y = yz;
  }

  const k = cfg.dist / (z + cfg.dist);
  const X = cfg.cx + x * k * cfg.scale;
  const Y = cfg.cy + y * k * cfg.scale;
  return [X, Y];
}
export function pyramidX(o, stepsPerEdge = 40, ...cfg){ return _pyramidProjectedPoint(o, stepsPerEdge, ...cfg)[0]; }
export function pyramidY(o, stepsPerEdge = 40, ...cfg){ return _pyramidProjectedPoint(o, stepsPerEdge, ...cfg)[1]; }
export function pyramidZ(
  o, stepsPerEdge,
  cx, cy,
  base, height,
  rx, ry, rz, dist = 700, scale = 1,
  zBase = 0, expo = 1
){
  // Simple height profile based on projected X/Y distance from center
  const X = pyramidX(o, stepsPerEdge, cx, cy, base, height, rx, ry, rz, dist, scale);
  const Y = pyramidY(o, stepsPerEdge, cx, cy, base, height, rx, ry, rz, dist, scale);

  const dx = (X - cx) / (base/2);
  const dy = (Y - cy) / (base/2);
  const taper = Math.max(0, 1 - Math.max(Math.abs(dx), Math.abs(dy)));
  return zBase + height * Math.pow(taper, expo);
}

// ──────────────────────────────────────────────────────────────────────────────
/** THREE helpers */
// ──────────────────────────────────────────────────────────────────────────────
export function toThreeGeometry(raw){
  if (raw && raw.isBufferGeometry) return raw;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position",
    new THREE.BufferAttribute(new Float32Array(raw.positions), 3));
  if (raw.uvs)
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(raw.uvs), 2));
  if (raw.indices) geo.setIndex(raw.indices);
  if (raw.normals)
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(raw.normals), 3));
  else
    geo.computeVertexNormals();
  return geo;
}

// ──────────────────────────────────────────────────────────────────────────────
/** Parametric surfaces (3D) */
// ──────────────────────────────────────────────────────────────────────────────
export function makeParametric3D(fn, opts={}){
  const { nu = 128, nv = 64, wrapU = true, wrapV = true } = opts;

  const N = nu * nv;
  const positions = new Float32Array(N * 3);
  const uvs       = new Float32Array(N * 2);

  let pk = 0, tk = 0;
  for (let j = 0; j < nv; j++){
    const vv = wrapV ? (j / nv) : (j/(nv-1));
    for (let i = 0; i < nu; i++){
      const uu = wrapU ? (i / nu) : (i/(nu-1));
      const p = fn(uu, vv) || {x:0,y:0,z:0};
      positions[pk++] = p.x; positions[pk++] = p.y; positions[pk++] = p.z;
      uvs[tk++] = uu; uvs[tk++] = vv;
    }
  }

  const wrapIdx = (i, n) => (i < 0 ? i + n : (i >= n ? i - n : i));
  const idx = [];
  const nuMax = nu - 1, nvMax = nv - 1;
  const lastU = wrapU ? nu : nuMax;
  const lastV = wrapV ? nv : nvMax;

  for (let j = 0; j < lastV; j++){
    const jn = wrapV ? wrapIdx(j+1, nv) : (j+1);
    if (!wrapV && j === nvMax) break;
    for (let i = 0; i < lastU; i++){
      const inx = wrapU ? wrapIdx(i+1, nu) : (i+1);
      if (!wrapU && i === nuMax) break;

      const a = j * nu + i;
      const b = j * nu + inx;
      const c = jn * nu + i;
      const d = jn * nu + inx;
      idx.push(a, c, b,  b, c, d);
    }
  }

  if (THREE?.BufferGeometry) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv",       new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.userData.funebra = { nu, nv, wrapU, wrapV, fnName: fn.name || "anonymous" };
    return geo;
  }
  return {
    positions: Array.from(positions),
    uvs:       Array.from(uvs),
    indices:   idx
  };
}

export const surfaces = {
  torus({R=1.15, r=0.44} = {}){
    return (u, v) => {
      const U = u * TAU, V = v * TAU;
      const cx = Math.cos(U), sx = Math.sin(U);
      const cv = Math.cos(V), sv = Math.sin(V);
      return { x: (R + r*cv) * cx, y: (R + r*cv) * sx, z: r * sv };
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────────
/** 2D pipeline used by legacy demos */
// ──────────────────────────────────────────────────────────────────────────────
export function makeParametric(spec={}){
  const { x, y, steps=0, close=false, color, stroke, lineWidth } = spec;
  if (typeof x !== 'function' || typeof y !== 'function')
    throw new Error('makeParametric: x and y must be functions');
  if (!Number.isFinite(steps) || steps <= 0)
    throw new Error('makeParametric: steps must be a positive integer');
  return { kind:'param2d', x, y, steps: Math.floor(steps), close, color, stroke, lineWidth };
}

export function render(items=[], opts={}){
  const canvas = opts.canvas || document.querySelector('canvas') || (()=>{ const c = document.createElement('canvas'); document.body.appendChild(c); return c; })();
  const ctx = canvas.getContext('2d');

  // auto-fit to viewport when overlay-ish
  if (canvas === opts.canvas && (canvas.style.position === 'fixed' || canvas.style.position === 'absolute')){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = (opts.width  ?? window.innerWidth);
    const h = (opts.height ?? window.innerHeight);
    const bw = Math.floor(w * dpr), bh = Math.floor(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw; canvas.height = bh;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  if (opts.clear !== false) ctx.clearRect(0, 0, canvas.width, canvas.height);

  const doFill = (v)=> v === true || typeof v === 'string';
  for (const it of items){
    if (!it || it.kind !== 'param2d') continue;
    const p = new Path2D();
    for (let i=0;i<it.steps;i++){
      const X = it.x(i); const Y = it.y(i);
      if (i===0) p.moveTo(X, Y); else p.lineTo(X, Y);
    }
    if (it.close) p.closePath();

    const strokeColor = it.stroke ?? opts.stroke;
    const lw          = it.lineWidth ?? opts.lineWidth ?? 1;
    if (strokeColor){ ctx.strokeStyle = strokeColor; ctx.lineWidth = lw; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke(p); }

    const fillFlag = it.color ?? opts.fill;
    if (doFill(fillFlag)){ ctx.fillStyle = (typeof fillFlag === 'string') ? fillFlag : (opts.fillStyle || '#000'); ctx.fill(p); }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Default export bundle
// ──────────────────────────────────────────────────────────────────────────────
const Funebra = {
  // 2D
  makeParametric, render,
  // 3D
  makeParametric3D, surfaces,
  // helpers
  lineX, lineY, lineSegmentX, lineSegmentY,
  circleX, circleY, ellipseX, ellipseY,
  polygonX, polygonY, starX, starY,
  bezierPoint1D, bezierPoint2D,
  bezierQuadX, bezierQuadY,
  bezierCubicX, bezierCubicY,
  polyBezierX, polyBezierY, polyBezierToSVGPath,
  resampleEven,
  squareWave, wave, waveX, waveY,
  curwaveX, curwaveY,
  triX, triY,
  cube,
  heart2D_x, heart2D_y, heart3D_steps, heart3D_x, heart3D_y, heart3D_z,
  latinCrossVertices, crossX, crossY, crossZ, crossZFlat,
  pyramidX, pyramidY, pyramidZ,
  toThreeGeometry,
};
export default Funebra;

