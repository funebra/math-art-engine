
// script.module.js — ES Module version of core Funebra pieces
// - Pure ESM (no globals).
// - Uses local THREE import instead of root.THREE.
// - Exports named helpers + a default { ... } object.
//
// Usage:
//   <script type="module">
//     import Funebra, { makeParametric3D, surfaces } from '/path/script.module.js';
//     import * as THREE from 'three';
//     const geo = makeParametric3D(surfaces.torus({R:1.2,r:0.4}), {nu:256,nv:128});
//   </script>

import * as THREE from 'three';

// ----- math + helpers (ported unchanged) -----
export function polygonX(o, sides, radius, centerX, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  return (1-t) * (Math.cos(a1)*radius + centerX) + t * (Math.cos(a2)*radius + centerX);
}
export function polygonY(o, sides, radius, centerY, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  return (1-t) * (Math.sin(a1)*radius + centerY) + t * (Math.sin(a2)*radius + centerY);
}

export function starX(o, sides, outerR, innerR, centerX, stepsPerEdge){
  const total = sides*2, edge = Math.floor(o/stepsPerEdge), t=(o%stepsPerEdge)/stepsPerEdge;
  const a1=(edge*2*Math.PI)/total, a2=((edge+1)*2*Math.PI)/total;
  const r1 = edge%2===0 ? outerR : innerR;
  const r2 = (edge+1)%2===0 ? outerR : innerR;
  return (1-t)*(Math.cos(a1)*r1 + centerX) + t*(Math.cos(a2)*r2 + centerX);
}
export function starY(o, sides, outerR, innerR, centerY, stepsPerEdge){
  const total = sides*2, edge = Math.floor(o/stepsPerEdge), t=(o%stepsPerEdge)/stepsPerEdge;
  const a1=(edge*2*Math.PI)/total, a2=((edge+1)*2*Math.PI)/total;
  const r1 = edge%2===0 ? outerR : innerR;
  const r2 = (edge+1)%2===0 ? outerR : innerR;
  return (1-t)*(Math.sin(a1)*r1 + centerY) + t*(Math.sin(a2)*r2 + centerY);
}

export function squareWave(t, A, period, cy=0){ return ((t%period) < period/2 ? A : -A) + cy; }
export function wave(type, t, A, period, cy=0){
  const ph=(t%period)/period;
  if(type==="sine")     return Math.sin(ph*2*Math.PI)*A + cy;
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
  const t = (o/steps)*2*Math.PI;
  return cx + s*16*Math.pow(Math.sin(t),3);
}
export function heart2D_y(o, steps=360, s=6, cy=0){
  const t = (o/steps)*2*Math.PI;
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
  const {i,j}=_ij(o,U,V); const u=(i/U)*Math.PI, phi=(j/V)*2*Math.PI;
  const r=Math.max(_heartProfile(u,scale).x,0);
  return r*Math.cos(phi);
}
export function heart3D_y(o, steps, scale=0.30, U=140, V=96){
  const {i}=_ij(o,U,V); const u=(i/U)*Math.PI;
  return _heartProfile(u,scale).y;
}
export function heart3D_z(o, steps, scale=0.30, U=140, V=96){
  const {i,j}=_ij(o,U,V); const u=(i/U)*Math.PI, phi=(j/V)*2*Math.PI;
  const r=Math.max(_heartProfile(u,scale).x,0);
  return r*Math.sin(phi);
}

// Cross (Latin)
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
const TAU = Math.PI * 2;
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
  // uses pyramidX/Y values; assumes caller keeps parameters consistent
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

// Convert raw to THREE.BufferGeometry (optional helper)
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

// ---- Parametric surfaces core (ESM) ----
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

  // If THREE is present, return a ready geometry
  if (THREE?.BufferGeometry) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv",       new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.userData.funebra = { nu, nv, wrapU, wrapV, fnName: fn.name || "anonymous" };
    return geo;
  }

  // Otherwise return raw buffers + indices
  // (Normals are omitted for brevity; compute in your pipeline if needed)
  return {
    positions: Array.from(positions),
    uvs:       Array.from(uvs),
    indices:   idx
  };
}

// ---------- NEW: 2D pipeline used by legacy demos ----------

/**
 * makeParametric — create a 2D parametric path description.
 * @param {Object} spec
 *   x(i): number generator
 *   y(i): number generator
 *   steps: integer sample count (required)
 *   close: boolean (default false)
 *   color: fill color (optional)
 *   stroke: stroke color (optional)
 *   lineWidth: number (optional)
 */
export function makeParametric(spec={}){
  const { x, y, steps=0, close=false, color, stroke, lineWidth } = spec;
  if (typeof x !== 'function' || typeof y !== 'function')
    throw new Error('makeParametric: x and y must be functions');
  if (!Number.isFinite(steps) || steps <= 0)
    throw new Error('makeParametric: steps must be a positive integer');
  return { kind:'param2d', x, y, steps: Math.floor(steps), close, color, stroke, lineWidth };
}

/**
 * render — draw one or more 2D parametric paths to a canvas.
 * @param {Array} items array of values returned by makeParametric()
 * @param {Object} opts  { canvas, clear=true, fill=true, stroke='#000', lineWidth=1 }
 */
export function render(items=[], opts={}){
  const canvas = opts.canvas || document.querySelector('canvas') || (()=>{
    const c = document.createElement('canvas');
    document.body.appendChild(c);
    return c;
  })();
  const ctx = canvas.getContext('2d');
  // auto-fit to viewport when it looks like a full-screen overlay
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

    // stroke
    const strokeColor = it.stroke ?? opts.stroke;
    const lw          = it.lineWidth ?? opts.lineWidth ?? 1;
    if (strokeColor){
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lw;
      ctx.stroke(p);
    }

    // fill
    const fillFlag = it.color ?? opts.fill;
    if (doFill(fillFlag)){
      ctx.fillStyle = typeof fillFlag === 'string' ? fillFlag : (opts.fillStyle || '#000');
      ctx.fill(p);
    }
  }
}

// ---- Existing example surface ----
export const surfaces = {
  torus({R=1.15, r=0.44} = {}){
    return (u, v) => {
      const U = u * Math.PI * 2;
      const V = v * Math.PI * 2;
      const cx = Math.cos(U), sx = Math.sin(U);
      const cv = Math.cos(V), sv = Math.sin(V);
      return { x: (R + r*cv) * cx, y: (R + r*cv) * sx, z: r * sv };
    };
  }
};

// Default export: namespaced bundle (nice DX)
const Funebra = {
  // 2D
  makeParametric,
  render,

  // 3D
  makeParametric3D,
  surfaces,

  // helpers
  polygonX, polygonY, starX, starY,
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
