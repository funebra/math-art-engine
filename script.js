
/* ========= GLOBALS ========= */
let eurXVals = [], eurYVals = [], ready = false;

/* ========= MATH HELPERS (non-module) ========= */
function polygonX(o, sides, radius, centerX, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  return (1-t) * (Math.cos(a1)*radius + centerX) + t * (Math.cos(a2)*radius + centerX);
}
function polygonY(o, sides, radius, centerY, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  return (1-t) * (Math.sin(a1)*radius + centerY) + t * (Math.sin(a2)*radius + centerY);
}

function starX(o, sides, outerR, innerR, centerX, stepsPerEdge){
  const total = sides*2, edge = Math.floor(o/stepsPerEdge), t=(o%stepsPerEdge)/stepsPerEdge;
  const a1=(edge*2*Math.PI)/total, a2=((edge+1)*2*Math.PI)/total;
  const r1 = edge%2===0 ? outerR : innerR;
  const r2 = (edge+1)%2===0 ? outerR : innerR;
  return (1-t)*(Math.cos(a1)*r1 + centerX) + t*(Math.cos(a2)*r2 + centerX);
}
function starY(o, sides, outerR, innerR, centerY, stepsPerEdge){
  const total = sides*2, edge = Math.floor(o/stepsPerEdge), t=(o%stepsPerEdge)/stepsPerEdge;
  const a1=(edge*2*Math.PI)/total, a2=((edge+1)*2*Math.PI)/total;
  const r1 = edge%2===0 ? outerR : innerR;
  const r2 = (edge+1)%2===0 ? outerR : innerR;
  return (1-t)*(Math.sin(a1)*r1 + centerY) + t*(Math.sin(a2)*r2 + centerY);
}

function squareWave(t, A, period, cy=0){ return ((t%period) < period/2 ? A : -A) + cy; }
function wave(type, t, A, period, cy=0){
  const ph=(t%period)/period;
  if(type==="sine")     return Math.sin(ph*2*Math.PI)*A + cy;
  if(type==="square")   return (ph<.5?A:-A) + cy;
  if(type==="triangle") return (4*A*Math.abs(ph-.5)-A) + cy;
  if(type==="sawtooth") return (2*A*(ph-.5)) + cy;
  return cy;
}
function waveX(o, step){ return o*step; }
function waveY(o, type, A, period, cy){ return wave(type, o, A, period, cy); }

/* Currency helpers (use THESE with EUR data) */
function curwaveX(i, step){ return i*step; }
function curwaveY(rate, minRate, maxRate, height, centerY){
  const n = (rate - minRate) / (maxRate - minRate || 1);
  return centerY + height/2 - n*height; // screen Y (0 top)
}

/* ========= TRIANGLE EDGES ========= */
function triX(o, verts, stepsPerEdge){
  const e=Math.floor(o/stepsPerEdge)%3, t=(o%stepsPerEdge)/stepsPerEdge;
  return (1-t)*verts[e][0] + t*verts[(e+1)%3][0];
}
function triY(o, verts, stepsPerEdge){
  const e=Math.floor(o/stepsPerEdge)%3, t=(o%stepsPerEdge)/stepsPerEdge;
  return (1-t)*verts[e][1] + t*verts[(e+1)%3][1];
}

/* ========= SIMPLE 3D CUBE → 2D PROJ ========= */
function cube(o, size, cx=0, cy=0, stepsPerEdge=10){
  const h=size/2, V=[[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]];
  const E=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const ei=Math.floor(o/stepsPerEdge)%E.length, t=(o%stepsPerEdge)/stepsPerEdge;
  const [a,b]=E[ei], [x1,y1,z1]=V[a], [x2,y2,z2]=V[b];
  const x=x1+(x2-x1)*t, y=y1+(y2-y1)*t, z=z1+(z2-z1)*t;
  return { x: cx + x + 0.5*z, y: cy - y - 0.3*z };
}

/* ========= EUR DATA (Frankfurter) ========= */
async function getLastMonthRates(){
  const today = new Date().toISOString().slice(0,10);
  const startD = new Date(); startD.setDate(startD.getDate()-30);
  const start = startD.toISOString().slice(0,10);
  const url = `https://api.frankfurter.app/${start}..${today}?from=USD&to=EUR`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Object.entries(json.rates).map(([date,obj]) => ({ date, rate: obj.EUR }));
}

/* Build global arrays your UI can read: eurX(o), eurY(o) */
async function initEURWave(){
  const data = await getLastMonthRates();

  const step = 1;
  eurXVals = data.map((d,i)=>curwaveX(i, step));

  const rates = data.map(d=>d.rate);
  const minR = Math.min(...rates), maxR = Math.max(...rates);
  const height = 100, centerY = 50;

  // FIX: use curwaveY (not waveY)
  eurYVals = data.map(d => curwaveY(d.rate, minR, maxR, height, centerY));

  ready = true;

  // Optional preview
  const out = data.slice(0, 20).map((d,i)=>`(${eurXVals[i].toFixed(1)}, ${eurYVals[i].toFixed(1)}) = ${d.rate}`).join("\n");
  //const el = document.getElementById("bn1");
 // if(el) el.textContent = out;
}

/* Public readers for your plotter */
function eurX(o){ return ready ? (eurXVals[o] ?? 0) : 0; }
function eurY(o){ return ready ? (eurYVals[o] ?? 0) : 0; }

/* ========= HEARTS (non-module, global) ========= */
/* 2D classic heart (parametric) */
function heart2D_x(o, steps=360, s=6, cx=0){
  const t = (o/steps)*2*Math.PI;
  return cx + s*16*Math.pow(Math.sin(t),3);
}
function heart2D_y(o, steps=360, s=6, cy=0){
  const t = (o/steps)*2*Math.PI;
  return cy - s*(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t));
}

/* 3D puffy heart via lathe (single-index sampler) */
function heart3D_steps(U=140, V=96){ return (U+1)*(V+1); }
function _heartProfile(u, scale){
  return {
    x: scale*16*Math.pow(Math.sin(u),3),
    y: scale*(13*Math.cos(u) - 5*Math.cos(2*u) - 2*Math.cos(3*u) - Math.cos(4*u))
  };
}
function _ij(o,U,V){ const cols=V+1; return { i:Math.floor(o/cols), j:o%cols }; }

function heart3D_x(o, steps, scale=0.30, U=140, V=96){
  const {i,j}=_ij(o,U,V); const u=(i/U)*Math.PI, phi=(j/V)*2*Math.PI;
  const r=Math.max(_heartProfile(u,scale).x,0);
  return r*Math.cos(phi);
}
function heart3D_y(o, steps, scale=0.30, U=140, V=96){
  const {i}=_ij(o,U,V); const u=(i/U)*Math.PI;
  return _heartProfile(u,scale).y;
}
function heart3D_z(o, steps, scale=0.30, U=140, V=96){
  const {i,j}=_ij(o,U,V); const u=(i/U)*Math.PI, phi=(j/V)*2*Math.PI;
  const r=Math.max(_heartProfile(u,scale).x,0);
  return r*Math.sin(phi);
}

/* ========= OPTIONAL: kick off EUR fetch on click or load ========= */
// window.addEventListener('load', () => { initEURWave().catch(console.error); });


















// === Latin (Catholic) cross outline, traced as a 12-vertex polygon ===
// Center (cx,cy), total height H, stem width stemW,
// crossbar total width barW, crossbar thickness barT,
// bar center Y (relative to center; default = -H/6), rotation theta (radians).
function latinCrossVertices(
  cx = 300, cy = 360,
  H = 240, stemW = 60,
  barW = 200, barT = 60,
  barCenterY = -H/6, theta = 0
){
  const H2 = H/2, s = stemW/2, b = barW/2, th = barT/2, yb = barCenterY;
  const raw = [
    [-s, -H2], [ s, -H2],           // top edge of stem
    [ s,  yb - th],                 // down to bar top
    [ b,  yb - th],                 // bar right top
    [ b,  yb + th],                 // bar right bottom
    [ s,  yb + th],                 // back to stem right
    [ s,  H2],                      // down to bottom
    [-s,  H2],                      // bottom left
    [-s,  yb + th],                 // up to bar bottom
    [-b,  yb + th],                 // bar left bottom
    [-b,  yb - th],                 // bar left top
    [-s,  yb - th],                 // back to stem left
  ];
  const c = Math.cos(theta), sn = Math.sin(theta);
  return raw.map(([x,y]) => [ cx + x*c - y*sn, cy + x*sn + y*c ]);
}

// LERP along edges (like your polygonX/Y)
function crossX(o, stepsPerEdge = 30, ...cfg){
  const v = latinCrossVertices(...cfg), n = v.length;
  const edge = Math.floor(o / stepsPerEdge) % n;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [x1] = v[edge], [x2] = v[(edge+1) % n];
  return (1 - t) * x1 + t * x2;
}
function crossY(o, stepsPerEdge = 30, ...cfg){
  const v = latinCrossVertices(...cfg), n = v.length;
  const edge = Math.floor(o / stepsPerEdge) % n;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [,y1] = v[edge], [,y2] = v[(edge+1) % n];
  return (1 - t) * y1 + t * y2;
}

/* Example (outline, rotated 22.5°):
for (let o = 0; o < 12 * 30; o++) {
  plot(
    crossX(o, 30, 300,360, 240,60, 200,60, -240/6, Math.PI/8),
    crossY(o, 30, 300,360, 240,60, 200,60, -240/6, Math.PI/8)
  );
}
*/
const TAU = Math.PI * 2;

/**
 * Z for the Latin cross outline.
 * Signature mirrors crossX/crossY so your existing calls still work.
 *
 * @param {number} o        step index
 * @param {number} steps    total steps
 * @param {number} cx, cy   (kept for parity; not used in Z)
 * @param {number} hLen,hThick   horizontal arm (parity)
 * @param {number} vLen,vThick   vertical arm (parity)
 * @param {number} amp      sinus amplitude in Z
 * @param {number} phase    sinus phase (radians)
 * @param {number} zCenter  Z offset (default 0)
 * @param {number} pitch    helical pitch per full loop (ΔZ per 2π), default 0
 */
function crossZ(
  o, steps,
  cx, cy,
  hLen, hThick,
  vLen, vThick,
  amp = 0, phase = 0,
  zCenter = 0, pitch = 0
){
  const t = (o / steps) * TAU;
  // sinusoidal “breathing” + optional linear helix
  return zCenter + amp * Math.sin(t + phase) + pitch * (t / TAU);
}

// Flat/outline version (always Z=0) if you need it:
const crossZFlat = () => 0;



























// === Square Pyramid (wireframe) — step/edge LERP like your polygons ===
// Edges: base square (4) + sides to apex (4) = 8 edges total.

function _pyramidProjectedPoint(o, stepsPerEdge = 40,
  cx = 300, cy = 360,              // screen center
  base = 220, height = 220,        // base width & pyramid height
  rx = -0.3, ry = 0.6, rz = 0.0,   // rotations (radians)
  dist = 700, scale = 1            // perspective & scale
){
  // --- 3D vertices (Y up; apex above base) ---
  const b = base / 2;
  const V = [
    [-b, 0, -b],  // 0 base
    [ b, 0, -b],  // 1
    [ b, 0,  b],  // 2
    [-b, 0,  b],  // 3
    [ 0, -height, 0], // 4 apex (negative Y = up on screen)
  ];
  // --- edges (pairs of vertex indices) ---
  const E = [
    [0,1],[1,2],[2,3],[3,0], // base
    [4,0],[4,1],[4,2],[4,3], // sides
  ];
  const nE = E.length;

  // which edge & how far along it
  const edge = Math.floor(o / stepsPerEdge) % nE;
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const [i1, i2] = E[edge];
  const [x1,y1,z1] = V[i1];
  const [x2,y2,z2] = V[i2];

  // LERP in 3D along the current edge
  let x = (1-t)*x1 + t*x2;
  let y = (1-t)*y1 + t*y2;
  let z = (1-t)*z1 + t*z2;

  // --- rotate (Rx → Ry → Rz) ---
  const cxX = Math.cos(rx), sxX = Math.sin(rx);
  let yx =  y*cxX - z*sxX;
  let zx =  y*sxX + z*cxX;
  y = yx; z = zx;

  const cxY = Math.cos(ry), sxY = Math.sin(ry);
  let xy =  x*cxY + z*sxY;
  let zy = -x*sxY + z*cxY;
  x = xy; z = zy;

  const cxZ = Math.cos(rz), sxZ = Math.sin(rz);
  let xz = x*cxZ - y*sxZ;
  let yz = x*sxZ + y*cxZ;
  x = xz; y = yz;

  // --- weak perspective projection ---
  const k = dist / (z + dist);
  const X = cx + x * k * scale;
  const Y = cy + y * k * scale;

  return [X, Y];
}

function pyramidX(o, stepsPerEdge = 40, ...cfg){
  return _pyramidProjectedPoint(o, stepsPerEdge, ...cfg)[0];
}
function pyramidY(o, stepsPerEdge = 40, ...cfg){
  return _pyramidProjectedPoint(o, stepsPerEdge, ...cfg)[1];
}

/* Usage (wireframe outline):
const edges = 8, stepsPerEdge = 40;
for (let o = 0; o < edges * stepsPerEdge; o++) {
  plot(
    pyramidX(o, stepsPerEdge, 300,360, 220,220, -0.3,0.7,0.0, 700,1.1),
    pyramidY(o, stepsPerEdge, 300,360, 220,220, -0.3,0.7,0.0, 700,1.1)
  );
}
*/

// To animate spin, increment rx/ry/rz over time (e.g., ry += 0.01).
const TAU = Math.PI * 2;

/**
 * Height field for a (possibly rotated/sheared) square pyramid.
 * Matches pyramidX/pyramidY signature; uses your actual X,Y at step `o`
 * so the three stay in lockstep.
 *
 * Params (same order as your call):
 * o, stepsPerEdge,
 * cx, cy,          // center
 * sx, sy,          // half-size (extent in x/y)
 * shx, shy, rot,   // shear x/y, rotation (radians)
 * height, expo,    // peak height, easing exponent
 * zBase=0          // base Z offset (optional)
 */
function pyramidZ(
  o, stepsPerEdge,
  cx, cy,
  sx, sy,
  shx, shy, rot,
  height, expo,
  zBase = 0
){
  // 1) get the actual XY the same way you already do
  const x = pyramidX(o, stepsPerEdge, cx, cy, sx, sy, shx, shy, rot, height, expo);
  const y = pyramidY(o, stepsPerEdge, cx, cy, sx, sy, shx, shy, rot, height, expo);

  // 2) transform XY back to local, axis-aligned, un-sheared space
  let lx = x - cx, ly = y - cy;

  // inverse rotation
  const cs = Math.cos(-rot), sn = Math.sin(-rot);
  let rx = lx * cs - ly * sn;
  let ry = lx * sn + ly * cs;

  // inverse scale (protect zero)
  let ux = rx / (sx || 1);
  let uy = ry / (sy || 1);

  // inverse shear: S = [[1, shx],[shy, 1]]  =>  S^{-1} = (1/det) * [[1, -shx],[-shy, 1]]
  const det = 1 - shx * shy;
  if (Math.abs(det) > 1e-8) {
    const tx = (ux - shx * uy) / det;
    const ty = (-shy * ux + uy) / det;
    ux = tx; uy = ty;
  }

  // 3) square-pyramid profile: height tapers linearly to 0 at |u|=1 or |v|=1
  const taper = Math.max(0, 1 - Math.max(Math.abs(ux), Math.abs(uy)));
  return zBase + height * Math.pow(taper, expo);
}















































function pyramid2DVertices(cx=300, cy=360, base=240, top=60, height=200, theta=0){
  const b = base/2, t = top/2, h = height/2;
  const raw = [
    [-b,  h], [ b,  h],   // bottom
    [ t,  0],             // right shoulder
    [ 0, -h],             // apex
    [-t,  0],             // left shoulder
  ];
  const c = Math.cos(theta), s = Math.sin(theta);
  return raw.map(([x,y]) => [cx + x*c - y*s, cy + x*s + y*c]);
}

function pyramid2DX(o, stepsPerEdge=30, ...cfg){
  const v = pyramid2DVertices(...cfg), n=v.length;
  const e = Math.floor(o/stepsPerEdge)%n, t=(o%stepsPerEdge)/stepsPerEdge;
  const [x1,y1]=v[e], [x2,y2]=v[(e+1)%n];
  return (1-t)*x1 + t*x2;
}
function pyramid2DY(o, stepsPerEdge=30, ...cfg){
  const v = pyramid2DVertices(...cfg), n=v.length;
  const e = Math.floor(o/stepsPerEdge)%n, t=(o%stepsPerEdge)/stepsPerEdge;
  const [x1,y1]=v[e], [x2,y2]=v[(e+1)%n];
  return (1-t)*y1 + t*y2;
}
