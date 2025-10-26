// script.module.js — Funebra unified ESM (Core + Numeric Shapes + Compat + 3D)
// - Pure ESM (no globals).
// - Local THREE import.
// - All numeric 2D, Bézier, heart, waves, projected pyramid, 3D builders,
//   parametric 2D/3D pipelines, and FunebraShapesCompat.
// - Default export: Funebra namespace; plus rich named exports.

import * as THREE from 'three';

// ──────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ──────────────────────────────────────────────────────────────────────────────
export const TAU = Math.PI * 2;

const _normStep = (o, steps) => {
  const s = (steps|0) > 0 ? (steps|0) : 1;
  return { t: (o % s) / s, s };
};

// Small vector helpers (for polygon pipelines)
function _rot(v, th){ const c=Math.cos(th), s=Math.sin(th); return v.map(([x,y])=>[x*c - y*s, x*s + y*c]); }
function _tx(v, cx, cy){ return v.map(([x,y])=>[x+cx,y+cy]); }

// ──────────────────────────────────────────────────────────────────────────────
// Core Funebra 2D numerics (lines, circles, ellipses, polygons, stars)
// ──────────────────────────────────────────────────────────────────────────────
export function lineX(o, centerX, radius, direction, stepsPerEdge){
  const t = (o % stepsPerEdge) / stepsPerEdge;
  return centerX + Math.cos(direction) * radius * t;
}
export function lineY(o, centerY, radius, direction, stepsPerEdge){
  const t = (o % stepsPerEdge) / stepsPerEdge;
  return centerY + Math.sin(direction) * radius * t;
}

// Segment (for connecting two points)
export function lineSegmentX(o, steps = 100, ax = 0, ay = 0, bx = 100, by = 0) {
  const { t } = _normStep(o, steps);
  return ax + (bx - ax) * t;
}
export function lineSegmentY(o, steps = 100, ax = 0, ay = 0, bx = 100, by = 0) {
  const { t } = _normStep(o, steps);
  return ay + (by - ay) * t;
}

export function circleX(o, radius, centerX=0, totalSteps=360, offset=0){
  const th = ((o % totalSteps) / totalSteps) * TAU + offset;
  return centerX + Math.cos(th) * radius;
}
export function circleY(o, radius, centerY=0, totalSteps=360, offset=0){
  const th = ((o % totalSteps) / totalSteps) * TAU + offset;
  return centerY + Math.sin(th) * radius;
}

export function ellipseX(o, rx, ry, centerX=0, centerY=0, totalSteps=360, rotation=0, offset=0){
  const { t } = _normStep(o, totalSteps);
  const th = t * TAU + offset;
  const cs = Math.cos(th), sn = Math.sin(th);
  const xr = rx * cs, yr = ry * sn;
  const cr = Math.cos(rotation), sr = Math.sin(rotation);
  return centerX + xr * cr - yr * sr;
}
export function ellipseY(o, rx, ry, centerX=0, centerY=0, totalSteps=360, rotation=0, offset=0){
  const { t } = _normStep(o, totalSteps);
  const th = t * TAU + offset;
  const cs = Math.cos(th), sn = Math.sin(th);
  const xr = rx * cs, yr = ry * sn;
  const cr = Math.cos(rotation), sr = Math.sin(rotation);
  return centerY + xr * sr + yr * cr;
}

// Regular polygon edge-walker
function _regularPolyX(o, sides, r, cx=0, stepsPerEdge=20, phase=-Math.PI/2){
  const n = Math.max(3, sides|0);
  const e = Math.floor(o / stepsPerEdge);
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = phase + (e     * TAU) / n;
  const a2 = phase + ((e+1) * TAU) / n;
  return (1-t) * (cx + r*Math.cos(a1)) + t * (cx + r*Math.cos(a2));
}
function _regularPolyY(o, sides, r, cy=0, stepsPerEdge=20, phase=-Math.PI/2){
  const n = Math.max(3, sides|0);
  const e = Math.floor(o / stepsPerEdge);
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = phase + (e     * TAU) / n;
  const a2 = phase + ((e+1) * TAU) / n;
  return (1-t) * (cy + r*Math.sin(a1)) + t * (cy + r*Math.sin(a2));
}
export function polygonX(o, sides, radius, centerX=0, stepsPerEdge=20, phase=-Math.PI/2){
  return _regularPolyX(o, sides, radius, centerX, stepsPerEdge, phase);
}
export function polygonY(o, sides, radius, centerY=0, stepsPerEdge=20, phase=-Math.PI/2){
  return _regularPolyY(o, sides, radius, centerY, stepsPerEdge, phase);
}

// Star (alternating radii)
export function starX(o, points, rOuter, rInner, cx=0, stepsPerEdge=20, phase=-Math.PI/2){
  const totalEdges = Math.max(3, points|0) * 2;
  const e = Math.floor(o / stepsPerEdge) % totalEdges;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = phase + (e       * TAU) / totalEdges;
  const a2 = phase + ((e + 1) * TAU) / totalEdges;
  const r1 = (e % 2 === 0) ? rOuter : rInner;
  const r2 = ((e+1) % 2 === 0) ? rOuter : rInner;
  return (1-t) * (cx + r1*Math.cos(a1)) + t * (cx + r2*Math.cos(a2));
}
export function starY(o, points, rOuter, rInner, cy=0, stepsPerEdge=20, phase=-Math.PI/2){
  const totalEdges = Math.max(3, points|0) * 2;
  const e = Math.floor(o / stepsPerEdge) % totalEdges;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = phase + (e       * TAU) / totalEdges;
  const a2 = phase + ((e + 1) * TAU) / totalEdges;
  const r1 = (e % 2 === 0) ? rOuter : rInner;
  const r2 = ((e+1) % 2 === 0) ? rOuter : rInner;
  return (1-t) * (cy + r1*Math.sin(a1)) + t * (cy + r2*Math.sin(a2));
}

// Generic polyline walkers
function _polyPathX(o, verts, stepsPerEdge){
  const n = verts.length;
  const e = Math.floor(o / stepsPerEdge) % n;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [x1] = verts[e];
  const [x2] = verts[(e+1) % n];
  return (1-t)*x1 + t*x2;
}
function _polyPathY(o, verts, stepsPerEdge){
  const n = verts.length;
  const e = Math.floor(o / stepsPerEdge) % n;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [,y1] = verts[e];
  const [,y2] = verts[(e+1) % n];
  return (1-t)*y1 + t*y2;
}

// Rect / Square
export function rectangleVertices(w, h, cx=0, cy=0, theta=0){
  const rx=w/2, ry=h/2; let v=[[-rx,-ry],[rx,-ry],[rx,ry],[-rx,ry]]; if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function rectangleX(o, w, h, cx=0, cy=0, stepsPerEdge=20, theta=0){ return _polyPathX(o, rectangleVertices(w,h,cx,cy,theta), stepsPerEdge); }
export function rectangleY(o, w, h, cx=0, cy=0, stepsPerEdge=20, theta=0){ return _polyPathY(o, rectangleVertices(w,h,cx,cy,theta), stepsPerEdge); }
export function squareX(o, size, cx=0, cy=0, stepsPerEdge=20, theta=0){ return rectangleX(o, size, size, cx, cy, stepsPerEdge, theta); }
export function squareY(o, size, cx=0, cy=0, stepsPerEdge=20, theta=0){ return rectangleY(o, size, size, cx, cy, stepsPerEdge, theta); }

// Right triangle
export function rightTriangleVertices(w, h, cx=0, cy=0, theta=0){
  let v=[[-w/2, h/2], [-w/2, -h/2], [w/2, h/2]];
  if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function rightTriangleX(o, w, h, cx=0, cy=0, stepsPerEdge=30, theta=0){ return _polyPathX(o, rightTriangleVertices(w,h,cx,cy,theta), stepsPerEdge); }
export function rightTriangleY(o, w, h, cx=0, cy=0, stepsPerEdge=30, theta=0){ return _polyPathY(o, rightTriangleVertices(w,h,cx,cy,theta), stepsPerEdge); }

// Parallelogram
export function parallelogramVertices(w, h, skew=0.25, cx=0, cy=0, theta=0){
  const dx = w*skew*0.5;
  let v=[[-w/2+dx,-h/2],[w/2+dx,-h/2],[w/2-dx,h/2],[-w/2-dx,h/2]];
  if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function parallelogramX(o, w, h, skew=0.25, cx=0, cy=0, stepsPerEdge=24, theta=0){ return _polyPathX(o, parallelogramVertices(w,h,skew,cx,cy,theta), stepsPerEdge); }
export function parallelogramY(o, w, h, skew=0.25, cx=0, cy=0, stepsPerEdge=24, theta=0){ return _polyPathY(o, parallelogramVertices(w,h,skew,cx,cy,theta), stepsPerEdge); }

// Rhombus
export function rhombusVertices(w, h, cx=0, cy=0, theta=0){
  let v=[[0,-h/2],[w/2,0],[0,h/2],[-w/2,0]]; if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function rhombusX(o, w, h, cx=0, cy=0, stepsPerEdge=24, theta=0){ return _polyPathX(o, rhombusVertices(w,h,cx,cy,theta), stepsPerEdge); }
export function rhombusY(o, w, h, cx=0, cy=0, stepsPerEdge=24, theta=0){ return _polyPathY(o, rhombusVertices(w,h,cx,cy,theta), stepsPerEdge); }

// Trapezoid / Trapezium
export function trapezoidVertices(topW, bottomW, h, cx=0, cy=0, theta=0){
  const t=topW/2, b=bottomW/2, ry=h/2;
  let v=[[-t,-ry],[t,-ry],[b,ry],[-b,ry]]; if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function trapezoidX(o, topW, bottomW, h, cx=0, cy=0, stepsPerEdge=22, theta=0){
  return _polyPathX(o, trapezoidVertices(topW,bottomW,h,cx,cy,theta), stepsPerEdge);
}
export function trapezoidY(o, topW, bottomW, h, cx=0, cy=0, stepsPerEdge=22, theta=0){
  return _polyPathY(o, trapezoidVertices(topW,bottomW,h,cx,cy,theta), stepsPerEdge);
}
export const trapeziumX = trapezoidX;
export const trapeziumY = trapezoidY;

// Kite
export function kiteVertices(w, h, midY=0.1, cx=0, cy=0, theta=0){
  const rx=w/2, ry=h/2;
  let v=[[0,-ry],[rx,midY*h-ry],[0,ry],[-rx,midY*h-ry]];
  if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function kiteX(o, w, h, midY=0.1, cx=0, cy=0, stepsPerEdge=20, theta=0){ return _polyPathX(o, kiteVertices(w,h,midY,cx,cy,theta), stepsPerEdge); }
export function kiteY(o, w, h, midY=0.1, cx=0, cy=0, stepsPerEdge=20, theta=0){ return _polyPathY(o, kiteVertices(w,h,midY,cx,cy,theta), stepsPerEdge); }

// Arrow
export function arrowVertices(w, h, head=0.45, cx=0, cy=0, theta=0){
  const rx=w/2, ry=h/2, hh=Math.max(0.2,Math.min(0.8,head)), shaft=(1-hh)*w;
  let v=[[-rx,-ry*0.3],[-rx+shaft,-ry*0.3],[-rx+shaft,-ry],[rx,0],[-rx+shaft,ry],[-rx+shaft,ry*0.3],[-rx,ry*0.3]];
  if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function arrowX(o, w, h, head=0.45, cx=0, cy=0, stepsPerEdge=18, theta=0){ return _polyPathX(o, arrowVertices(w,h,head,cx,cy,theta), stepsPerEdge); }
export function arrowY(o, w, h, head=0.45, cx=0, cy=0, stepsPerEdge=18, theta=0){ return _polyPathY(o, arrowVertices(w,h,head,cx,cy,theta), stepsPerEdge); }

// Semicircle (arc + chord)
export function semicircleX(o, r, cx=0, cy=0, totalSteps=180, up=false){
  if (o < totalSteps){ const th=(o/totalSteps)*Math.PI; const a=up?Math.PI - th: th; return cx + r*Math.cos(a); }
  const t=(o-totalSteps)/totalSteps; return cx + (1-t)*r + t*(-r);
}
export function semicircleY(o, r, cx=0, cy=0, totalSteps=180, up=false){
  if (o < totalSteps){ const th=(o/totalSteps)*Math.PI; const a=up?Math.PI - th: th; return cy + r*Math.sin(up?-a:a); }
  return cy;
}

// Oval alias
export function ovalX(o, rx, ry, cx=0, cy=0, totalSteps=360, rotation=0, offset=0){ return ellipseX(o, rx, ry, cx, cy, totalSteps, rotation, offset); }
export function ovalY(o, rx, ry, cx=0, cy=0, totalSteps=360, rotation=0, offset=0){ return ellipseY(o, rx, ry, cx, cy, totalSteps, rotation, offset); }

// Ring (outer then inner reversed)
export function ringX(o, rOuter, rInner, cx=0, cy=0, totalSteps=720){
  const half = totalSteps>>1;
  return (o < half) ? circleX(o, rOuter, cx, half, 0)
                    : circleX(half-1-(o-half), rInner, cx, half, 0);
}
export function ringY(o, rOuter, rInner, cx=0, cy=0, totalSteps=720){
  const half = totalSteps>>1;
  return (o < half) ? circleY(o, rOuter, cy, half, 0)
                    : circleY(half-1-(o-half), rInner, cy, half, 0);
}

// Crescent (outer arc + inner arc with x-offset)
export function crescentX(o, r=60, offset=20, cx=0, cy=0, totalSteps=512){
  const half=totalSteps>>1; if(o<half) return circleX(o, r, cx, half, 0);
  const r2=Math.abs(r-offset); return circleX(half-1-(o-half), r2, cx - offset, half, 0);
}
export function crescentY(o, r=60, offset=20, cx=0, cy=0, totalSteps=512){
  const half=totalSteps>>1; if(o<half) return circleY(o, r, cy, half, 0);
  const r2=Math.abs(r-offset); return circleY(half-1-(o-half), r2, cy, half, 0);
}

// Latin cross (rectilinear)
export function crossVertices(cx=0, cy=0, H=240, stemW=60, barW=200, barT=60, barCenterY=-H/6, theta=0){
  const H2=H/2, s=stemW/2, b=barW/2, th=barT/2, yb=barCenterY;
  const raw=[[-s,-H2],[ s,-H2],[ s,yb-th],[ b,yb-th],[ b,yb+th],[ s,yb+th],[ s, H2],[-s, H2],[-s,yb+th],[-b,yb+th],[-b,yb-th],[-s,yb-th]];
  const c=Math.cos(theta), sn=Math.sin(theta);
  return raw.map(([x,y])=>[cx + x*c - y*sn, cy + x*sn + y*c]);
}
export const latinCrossVertices = (cx=300, cy=360, H=240, stemW=60, barW=200, barT=60, barCenterY=-H/6, theta=0) =>
  crossVertices(cx, cy, H, stemW, barW, barT, barCenterY, theta);

export function crossX(o, stepsPerEdge=18, ...cfg){ return _polyPathX(o, crossVertices(...cfg), stepsPerEdge); }
export function crossY(o, stepsPerEdge=18, ...cfg){ return _polyPathY(o, crossVertices(...cfg), stepsPerEdge); }

// Extra named polygon wrappers
export const triangleX  = (o, r, cx=0, s=20)=>_regularPolyX(o,3,r,cx,s);
export const triangleY  = (o, r, cy=0, s=20)=>_regularPolyY(o,3,r,cy,s);
export const pentagonX  = (o, r, cx=0, s=20)=>_regularPolyX(o,5,r,cx,s);
export const pentagonY  = (o, r, cy=0, s=20)=>_regularPolyY(o,5,r,cy,s);
export const hexagonX   = (o, r, cx=0, s=20)=>_regularPolyX(o,6,r,cx,s);
export const hexagonY   = (o, r, cy=0, s=20)=>_regularPolyY(o,6,r,cy,s);
export const heptagonX  = (o, r, cx=0, s=20)=>_regularPolyX(o,7,r,cx,s);
export const heptagonY  = (o, r, cy=0, s=20)=>_regularPolyY(o,7,r,cy,s);
export const octagonX   = (o, r, cx=0, s=20)=>_regularPolyX(o,8,r,cx,s);
export const octagonY   = (o, r, cy=0, s=20)=>_regularPolyY(o,8,r,cy,s);
export const nonagonX   = (o, r, cx=0, s=20)=>_regularPolyX(o,9,r,cx,s);
export const nonagonY   = (o, r, cy=0, s=20)=>_regularPolyY(o,9,r,cy,s);
export const decagonX   = (o, r, cx=0, s=20)=>_regularPolyX(o,10,r,cx,s);
export const decagonY   = (o, r, cy=0, s=20)=>_regularPolyY(o,10,r,cy,s);

// ──────────────────────────────────────────────────────────────────────────────
// Bézier utilities + even resampling + poly-Bézier samplers
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
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ls[mid] < target) lo = mid + 1; else hi = mid;
    }
    const i1 = Math.max(1, lo), i0 = i1 - 1;
    const segL = ls[i1] - ls[i0] || 1;
    const a = (target - ls[i0]) / segL;
    out[k] = [ xs[i0] + a * (xs[i1] - xs[i0]), ys[i0] + a * (ys[i1] - ys[i0]) ];
  }
  return out;
}

export function polyBezierToSVGPath(segments) {
  if (!segments?.length) return '';
  const s0 = segments[0];
  let d = `M ${s0.A[0]} ${s0.A[1]}`;
  for (const s of segments) {
    if (s.type === 'quad') {
      d += ` Q ${s.B[0]} ${s.B[1]} ${s.C[0]} ${s.C[1]}`;
    } else {
      d += ` C ${s.B[0]} ${s.B[1]} ${s.C[0]} ${s.C[1]} ${s.D[0]} ${s.D[1]}`;
    }
  }
  return d;
}

export function bezierQuadX(o, steps, Ax, Ay, Bx, By, Cx, Cy) {
  const t = (o % steps) / steps;
  return (1-t)*(1-t)*Ax + 2*(1-t)*t*Bx + t*t*Cx;
}
export function bezierQuadY(o, steps, Ax, Ay, Bx, By, Cx, Cy) {
  const t = (o % steps) / steps;
  return (1-t)*(1-t)*Ay + 2*(1-t)*t*By + t*t*Cy;
}
export function bezierCubicX(o, steps, Ax, Ay, Bx, By, Cx, Cy, Dx, Dy) {
  const t = (o % steps) / steps, u = 1 - t;
  return u*u*u*Ax + 3*u*u*t*Bx + 3*u*t*t*Cx + t*t*t*Dx;
}
export function bezierCubicY(o, steps, Ax, Ay, Bx, By, Cx, Cy, Dx, Dy) {
  const t = (o % steps) / steps, u = 1 - t;
  return u*u*u*Ay + 3*u*u*t*By + 3*u*t*t*Cy + t*t*t*Dy;
}
export function polyBezierX(o, segments) {
  let acc = 0;
  for (const s of segments) {
    const n = s.steps|0; if (o < acc + n) {
      const i = o - acc;
      return s.type === 'quad'
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
      return s.type === 'quad'
        ? bezierQuadY(i, n, s.A[0], s.A[1], s.B[0], s.B[1], s.C[0], s.C[1])
        : bezierCubicY(i, n, s.A[0], s.A[1], s.B[0], s.B[1], s.C[0], s.C[1], s.D[0], s.D[1]);
    }
    acc += n;
  }
  const last = segments[segments.length-1];
  return (last.type==='quad'? last.C[1] : last.D[1]);
}

// ──────────────────────────────────────────────────────────────────────────────
// Waves, grids, and misc samplers
// ──────────────────────────────────────────────────────────────────────────────
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

// Cube wireframe projection
export function cube(o, size, cx=0, cy=0, stepsPerEdge=10){
  const h=size/2, V=[[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]];
  const E=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const ei=Math.floor(o/stepsPerEdge)%E.length, t=(o%stepsPerEdge)/stepsPerEdge;
  const [a,b]=E[ei], [x1,y1,z1]=V[a], [x2,y2,z2]=V[b];
  const x=x1+(x2-x1)*t, y=y1+(y2-y1)*t, z=z1+(z2-z1)*t;
  return { x: cx + x + 0.5*z, y: cy - y - 0.3*z };
}

// Hearts 2D/3D
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

// Cross Z samplers
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

// Pyramid wireframe (projected)
function _pyramidProjectedPoint(o, stepsPerEdge = 40,
  cx = 300, cy = 360,
  base = 220, height = 220,
  rx = -0.3, ry = 0.6, rz = 0.0,
  dist = 700, scale = 1
){
  const b = base / 2;
  const V = [[-b,0,-b],[ b,0,-b],[ b,0, b],[-b,0, b],[0,-height,0]];
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
    const cxX = Math.cos(rx), sxX = Math.sin(rx);
    const yx =  y*cxX - z*sxX;
    const zx =  y*sxX + z*cxX;
    y = yx; z = zx;

    const cxY = Math.cos(ry), sxY = Math.sin(ry);
    const xy =  x*cxY + z*sxY;
    const zy = -x*sxY + z*cxY;
    x = xy; z = zy;

    const cxZ = Math.cos(rz), sxZ = Math.sin(rz);
    const xz = x*cxZ - y*sxZ;
    const yz = x*sxZ + y*cxZ;
    x = xz; y = yz;
  }

  const k = dist / (z + dist);
  const X = cx + x * k * scale;
  const Y = cy + y * k * scale;
  return [X, Y];
}
export function pyramidX(o, stepsPerEdge = 40, ...cfg){
  return _pyramidProjectedPoint(o, stepsPerEdge, ...cfg)[0];
}
export function pyramidY(o, stepsPerEdge = 40, ...cfg){
  return _pyramidProjectedPoint(o, stepsPerEdge, ...cfg)[1];
}
export function pyramidZ(
  o, stepsPerEdge,
  cx, cy,
  sx, sy,
  shx, shy, rot,
  height, expo,
  zBase = 0
){
  const x = pyramidX(o, stepsPerEdge, cx, cy, sx, sy, shx, shy, rot, height, expo);
  const y = pyramidY(o, stepsPerEdge, cx, cy, sx, sy, shx, shy, rot, height, expo);

  let lx = x - cx, ly = y - cy;

  const cs = Math.cos(-rot), sn = Math.sin(-rot);
  let rx = lx * cs - ly * sn;
  let ry = lx * sn + ly * cs;

  rx /= (sx || 1);
  ry /= (sy || 1);

  const det = 1 - shx * shy;
  if (Math.abs(det) > 1e-8) {
    const tx = (rx - shx * ry) / det;
    const ty = (-shy * rx + ry) / det;
    rx = tx; ry = ty;
  }

  const taper = Math.max(0, 1 - Math.max(Math.abs(rx), Math.abs(ry)));
  return zBase + height * Math.pow(taper, expo);
}

// ──────────────────────────────────────────────────────────────────────────────
// THREE helpers & parametric 3D
// ──────────────────────────────────────────────────────────────────────────────
function _hasTHREE(){ return !!(THREE && THREE.BufferGeometry); }

function buildPrism({ sides=6, radius=1, height=1 }){
  if(!_hasTHREE()) return { kind:'prism', sides, radius, height };
  const shape = new THREE.Shape();
  for(let i=0;i<sides;i++){
    const a = -Math.PI/2 + TAU*(i/sides);
    const x = radius*Math.cos(a), y = radius*Math.sin(a);
    (i? shape.lineTo(x,y) : shape.moveTo(x,y));
  }
  const geom = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled:false });
  geom.translate(0,0,-height/2);
  return geom;
}
function buildPyramid({ sides=4, radius=1, height=1 }){
  if(!_hasTHREE()) return { kind:'pyramid', sides, radius, height };
  return new THREE.ConeGeometry(radius, height, Math.max(3, sides));
}
function buildHemisphere({ radius=1, widthSegments=32, heightSegments=16 }){
  if(!_hasTHREE()) return { kind:'hemisphere', radius, widthSegments, heightSegments };
  return new THREE.SphereGeometry(radius, widthSegments, heightSegments, 0, TAU, 0, Math.PI/2);
}
export function build3D(name, opts={}){
  switch((name||'').toLowerCase()){
    case 'cube': return _hasTHREE()? new THREE.BoxGeometry(opts.size??1, opts.size??1, opts.size??1) : {kind:'box',...opts};
    case 'cuboid':
    case 'rectangular prism': return _hasTHREE()? new THREE.BoxGeometry(opts.w??1.2, opts.h??0.8, opts.d??1) : {kind:'box',...opts};
    case 'cylinder': return _hasTHREE()? new THREE.CylinderGeometry(opts.r??0.6, opts.r??0.6, opts.height??1.2, opts.segments??32) : {kind:'cylinder',...opts};
    case 'sphere': return _hasTHREE()? new THREE.SphereGeometry(opts.r??0.7, opts.widthSegments??32, opts.heightSegments??18) : {kind:'sphere',...opts};
    case 'hemisphere': return buildHemisphere(opts);
    case 'cone': return _hasTHREE()? new THREE.ConeGeometry(opts.r??0.6, opts.height??1.2, opts.segments??32) : {kind:'cone',...opts};
    case 'tetrahedron': return _hasTHREE()? new THREE.TetrahedronGeometry(opts.r??0.8) : {kind:'tetra',...opts};
    case 'octahedron': return _hasTHREE()? new THREE.OctahedronGeometry(opts.r??0.8) : {kind:'octa',...opts};
    case 'pyramid':
    case 'square pyramid': return buildPyramid({ sides:4, radius:opts.r??0.7, height:opts.height??1.2 });
    case 'hexagonal pyramid': return buildPyramid({ sides:6, radius:opts.r??0.7, height:opts.height??1.2 });
    case 'triangular prism': return buildPrism({ sides:3, radius:opts.radius??0.7, height:opts.height??1.2 });
    case 'pentagonal prism': return buildPrism({ sides:5, radius:opts.radius??0.7, height:opts.height??1.2 });
    case 'prism': return buildPrism({ sides:opts.sides??6, radius:opts.radius??0.7, height:opts.height??1.2 });
    default: return { kind:'unknown', name, opts };
  }
}

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
      positions[pk++] = p.x;
      positions[pk++] = p.y;
      positions[pk++] = p.z;
      uvs[tk++] = uu;
      uvs[tk++] = vv;
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

  if (_hasTHREE()) {
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

// ──────────────────────────────────────────────────────────────────────────────
// 2D pipeline (legacy demos support)
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
  if (canvas === opts.canvas && (canvas.style.position === 'fixed' || canvas.style.position === 'absolute')){
    const w = (opts.width  ?? window.innerWidth);
    const h = (opts.height ?? window.innerHeight);
    if (canvas.width !== w)  canvas.width  = w;
    if (canvas.height !== h) canvas.height = h;
  }
  if (opts.clear !== false) ctx.clearRect(0, 0, canvas.width, canvas.height);

  const doFill = (v)=> v === true || typeof v === 'string';
  for (const it of items){
    if (!it || it.kind !== 'param2d') continue;
    const p = new Path2D();
    for (let i=0;i<it.steps;i++){
      const X = it.x(i);
      const Y = it.y(i);
      if (i===0) p.moveTo(X, Y);
      else       p.lineTo(X, Y);
    }
    if (it.close) p.closePath();

    const strokeColor = it.stroke ?? opts.stroke;
    const lw          = it.lineWidth ?? opts.lineWidth ?? 1;
    if (strokeColor){
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lw;
      ctx.stroke(p);
    }

    const fillFlag = it.color ?? opts.fill;
    if (doFill(fillFlag)){
      ctx.fillStyle = typeof fillFlag === 'string' ? fillFlag : (opts.fillStyle || '#000');
      ctx.fill(p);
    }
  }
}

// Example 3D surface
export const surfaces = {
  torus({R=1.15, r=0.44} = {}){
    return (u, v) => {
      const U = u * TAU;
      const V = v * TAU;
      const cx = Math.cos(U), sx = Math.sin(U);
      const cv = Math.cos(V), sv = Math.sin(V);
      return { x: (R + r*cv) * cx, y: (R + r*cv) * sx, z: r * sv };
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Compat object-arg API + minimal SVG path generators
// ──────────────────────────────────────────────────────────────────────────────
function _pointsRegularPolygon(n, r, phase=-Math.PI/2){
  const out=[]; const nn=Math.max(3, n|0);
  for(let i=0;i<nn;i++){ const a=phase + TAU*(i/nn); out.push({x:r*Math.cos(a), y:r*Math.sin(a)}); }
  return out;
}
function _mt(x,y){ return `M ${x} ${y}`; }
function _lt(x,y){ return `L ${x} ${y}`; }
function _cz(){ return 'Z'; }
function _regularPolygonPath({sides=5, r=60, phase=-Math.PI/2}={}){
  const n=Math.max(3, sides|0); let d='';
  for(let i=0;i<n;i++){ const a=phase + TAU*(i/n); const x=r*Math.cos(a), y=r*Math.sin(a); d+= (i? _lt(x,y) : _mt(x,y)); }
  return d+_cz();
}
function _circlePath({r=50}={}){ return `M ${-r} 0 a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0`; }
function _ellipsePath({rx=60, ry=40}={}){ return `M ${-rx} 0 a ${rx} ${ry} 0 1 0 ${2*rx} 0 a ${rx} ${ry} 0 1 0 ${-2*rx} 0`; }
function _trapezoidPath({top=70, bottom=110, height=80}={}){ const t=top/2, b=bottom/2, h=height/2; return [_mt(-t,-h),_lt(t,-h),_lt(b,h),_lt(-b,h),_cz()].join(' '); }

export const FunebraShapesCompat = {
  polygonX: (p)=>_pointsRegularPolygon((p&&p.sides)||5, (p&&p.r)||60),
  polygonY: (p)=>_regularPolygonPath({sides:(p&&p.sides)||5, r:(p&&p.r)||60}),

  circleX:  (p)=>{ const r=(p&&p.r)||50, N=(p&&p.samples)||96; const out=[]; for(let i=0;i<N;i++){const a=TAU*(i/N); out.push({x:r*Math.cos(a), y:r*Math.sin(a)});} return out; },
  circleY:  (p)=>_circlePath({ r:(p&&p.r)||50 }),

  ovalX:    (p)=>{ const rx=(p&&p.rx)||60, ry=(p&&p.ry)||40, N=(p&&p.samples)||96; const out=[]; for(let i=0;i<N;i++){const a=TAU*(i/N); out.push({x:rx*Math.cos(a), y:ry*Math.sin(a)});} return out; },
  ovalY:    (p)=>_ellipsePath({ rx:(p&&p.rx)||60, ry:(p&&p.ry)||40 }),

  ringX:    (p)=>{ const rO=(p&&p.rOuter)||60, rI=(p&&p.rInner)||40, N=(p&&p.samples)||128; const out=[]; for(let i=0;i<N;i++){const a=TAU*(i/N); out.push({x:rO*Math.cos(a), y:rO*Math.sin(a)});} for(let i=N;i>=0;i--){const a=TAU*(i/N); out.push({x:rI*Math.cos(a), y:rI*Math.sin(a)});} return out; },
  ringY:    (p)=>{ const rO=(p&&p.rOuter)||60, rI=(p&&p.rInner)||40; const c=(r)=>`M ${-r} 0 a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0`; return `${c(rO)} ${c(rI)}`; },

  trapezoidX: (p)=>{ const t=((p&&p.top)||70)/2, b=((p&&p.bottom)||110)/2, h=((p&&p.height)||80)/2; return [{x:-t,y:-h},{x:t,y:-h},{x:b,y:h},{x:-b,y:h}]; },
  trapezoidY: (p)=>_trapezoidPath({ top:(p&&p.top)||70, bottom:(p&&p.bottom)||110, height:(p&&p.height)||80 }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Default export namespace
// ──────────────────────────────────────────────────────────────────────────────
const Funebra = {
  // 2D pipeline
  makeParametric, render,

  // 3D pipeline
  makeParametric3D, surfaces, build3D, toThreeGeometry,

  // Numeric 2D
  lineX, lineY, lineSegmentX, lineSegmentY,
  circleX, circleY, ellipseX, ellipseY,
  polygonX, polygonY, starX, starY,
  rectangleX, rectangleY, squareX, squareY,
  rightTriangleX, rightTriangleY,
  parallelogramX, parallelogramY,
  rhombusX, rhombusY,
  trapezoidX, trapezoidY, trapeziumX, trapeziumY,
  kiteX, kiteY,
  arrowX, arrowY,
  semicircleX, semicircleY,
  ovalX, ovalY,
  ringX, ringY,
  crescentX, crescentY,
  crossX, crossY,
  triangleX, triangleY,
  pentagonX, pentagonY,
  hexagonX, hexagonY,
  heptagonX, heptagonY,
  octagonX, octagonY,
  nonagonX, nonagonY,
  decagonX, decagonY,

  // Geometry helpers / projections
  cube,
  pyramidX, pyramidY, pyramidZ,

  // Cross/heart extras
  latinCrossVertices, crossVertices, crossZ, crossZFlat,
  heart2D_x, heart2D_y, heart3D_steps, heart3D_x, heart3D_y, heart3D_z,

  // Bézier & resampling
  bezierPoint1D, bezierPoint2D,
  bezierQuadX, bezierQuadY,
  bezierCubicX, bezierCubicY,
  polyBezierX, polyBezierY, polyBezierToSVGPath,
  resampleEven,

  // Waves & utils
  squareWave, wave, waveX, waveY,
  curwaveX, curwaveY,

  // Compat namespace
  FunebraShapesCompat,

  // constants
  TAU,
};

export default Funebra;
