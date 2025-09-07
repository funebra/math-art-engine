/** @file math-art.js
 *  Lightweight math/plot helpers for pLabs viewers (no canvas required).
 *  Created: 2025-09-07
 */

/** @typedef {{x:number, y:number}} Point */
/** @typedef {{date:string, value:number}} SeriesPoint */

/* ----------------------------- Utilities ----------------------------- */

/**
 * Linear interpolation
 * @param {number} a
 * @param {number} b
 * @param {number} t 0..1
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Normalize v from [min,max] → [0,1]
 */
export const norm01 = (v, min, max) => (v - min) / (max - min || 1);

/**
 * Map value v from [min,max] to screen Y where 0 is top.
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @param {number} height
 * @param {number} centerY baseline (middle) in pixels
 */
export function normalizeToY(v, min, max, height, centerY) {
  const n = norm01(v, min, max);
  return centerY + height / 2 - n * height;
}

/* ------------------------- Parametric wrappers ----------------------- */

export function makeParametric(xFunc, yFunc) {
  return {
    /** @returns {number} */ x(o, steps, ...params) {
      const t = (o / steps) * 2 * Math.PI;
      return xFunc(t, ...params);
    },
    /** @returns {number} */ y(o, steps, ...params) {
      const t = (o / steps) * 2 * Math.PI;
      return yFunc(t, ...params);
    }
  };
}

export function makeParametric3D(xFunc, yFunc, zFunc) {
  return {
    x(o, steps, ...params) { const t = (o / steps) * 2 * Math.PI; return xFunc(t, ...params); },
    y(o, steps, ...params) { const t = (o / steps) * 2 * Math.PI; return yFunc(t, ...params); },
    z(o, steps, ...params) { const t = (o / steps) * 2 * Math.PI; return zFunc(t, ...params); }
  };
}

/* ----------------------------- Shapes -------------------------------- */

export function polygonX(o, sides, radius, centerX, stepsPerEdge) {
  const edge = Math.floor(o / stepsPerEdge) % sides;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = (edge * 2 * Math.PI) / sides;
  const a2 = ((edge + 1) * 2 * Math.PI) / sides;
  const x1 = Math.cos(a1) * radius + centerX;
  const x2 = Math.cos(a2) * radius + centerX;
  return lerp(x1, x2, t);
}
export function polygonY(o, sides, radius, centerY, stepsPerEdge) {
  const edge = Math.floor(o / stepsPerEdge) % sides;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = (edge * 2 * Math.PI) / sides;
  const a2 = ((edge + 1) * 2 * Math.PI) / sides;
  const y1 = Math.sin(a1) * radius + centerY;
  const y2 = Math.sin(a2) * radius + centerY;
  return lerp(y1, y2, t);
}

export function starX(o, sides, outerR, innerR, centerX, stepsPerEdge) {
  const total = sides * 2;
  const edge = Math.floor(o / stepsPerEdge) % total;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = (edge * 2 * Math.PI) / total;
  const a2 = ((edge + 1) * 2 * Math.PI) / total;
  const r1 = edge % 2 === 0 ? outerR : innerR;
  const r2 = (edge + 1) % 2 === 0 ? outerR : innerR;
  return lerp(Math.cos(a1) * r1 + centerX, Math.cos(a2) * r2 + centerX, t);
}
export function starY(o, sides, outerR, innerR, centerY, stepsPerEdge) {
  const total = sides * 2;
  const edge = Math.floor(o / stepsPerEdge) % total;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = (edge * 2 * Math.PI) / total;
  const a2 = ((edge + 1) * 2 * Math.PI) / total;
  const r1 = edge % 2 === 0 ? outerR : innerR;
  const r2 = (edge + 1) % 2 === 0 ? outerR : innerR;
  return lerp(Math.sin(a1) * r1 + centerY, Math.sin(a2) * r2 + centerY, t);
}

/** Triangle edge interpolation */
export function triX(o, vertices, stepsPerEdge) {
  const edge = Math.floor(o / stepsPerEdge) % 3;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [x1] = vertices[edge];
  const [x2] = vertices[(edge + 1) % 3];
  return lerp(x1, x2, t);
}
export function triY(o, vertices, stepsPerEdge) {
  const edge = Math.floor(o / stepsPerEdge) % 3;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [, y1] = vertices[edge];
  const [, y2] = vertices[(edge + 1) % 3];
  return lerp(y1, y2, t);
}

/* Common parametrics */
export const circle = makeParametric(
  (t, r, cx) => Math.cos(t) * r + cx,
  (t, r, cy) => Math.sin(t) * r + cy
);

export const rose = makeParametric(
  (t, k, r, cx) => r * Math.cos(k * t) * Math.cos(t) + cx,
  (t, k, r, cy) => r * Math.cos(k * t) * Math.sin(t) + cy
);

export const spiro = makeParametric(
  (t, R, r, d, cx) => (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t) + cx,
  (t, R, r, d, cy) => (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t) + cy
);

/* ------------------------------ Waves -------------------------------- */

export function wave(type, t, amplitude, period, centerY = 0) {
  const phase = (t % period) / period;
  switch (type) {
    case "sine":     return Math.sin(phase * 2 * Math.PI) * amplitude + centerY;
    case "square":   return (phase < 0.5 ? amplitude : -amplitude) + centerY;
    case "triangle": return (4 * amplitude * Math.abs(phase - 0.5) - amplitude) + centerY;
    case "sawtooth": return (2 * amplitude * (phase - 0.5)) + centerY;
    default:         return centerY;
  }
}
export const waveX = (o, stepSize) => o * stepSize;
export const waveY = (o, type, amplitude, period, centerY) =>
  wave(type, o, amplitude, period, centerY);

/* Currency helpers (normalized mapping) */
export const curwaveX = (i, stepSize) => i * stepSize;
/** Map a raw rate to Y using known min/max */
export function curwaveY(rate, minRate, maxRate, height, centerY) {
  return normalizeToY(rate, minRate, maxRate, height, centerY);
}

/* ---------------------------- Cube (2D proj) -------------------------- */

/**
 * Dotted wireframe cube projected to 2D.
 * @param {number} t  step index
 * @param {number} size
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} stepsPerEdge dots per edge
 * @param {number} px horizontal proj factor
 * @param {number} py vertical proj factor
 * @returns {Point}
 */
export function cubePoint(t, size, centerX=0, centerY=0, stepsPerEdge=10, px=0.5, py=0.3) {
  const half = size / 2;
  const V = [
    [-half,-half,-half],[ half,-half,-half],[ half, half,-half],[-half, half,-half],
    [-half,-half, half],[ half,-half, half],[ half, half, half],[-half, half, half],
  ];
  const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const ei = Math.floor(t / stepsPerEdge) % E.length;
  const localT = (t % stepsPerEdge) / stepsPerEdge;
  const [i1, i2] = E[ei];
  const [x1,y1,z1] = V[i1]; const [x2,y2,z2] = V[i2];
  const x3 = lerp(x1, x2, localT), y3 = lerp(y1, y2, localT), z3 = lerp(z1, z2, localT);
  return { x: centerX + x3 + px * z3, y: centerY - y3 - py * z3 };
}

/* ------------------------- EUR data (Frankfurter) --------------------- */

/**
 * Get last N days of USD→EUR rates (sorted asc by date).
 * @param {number} days
 * @returns {Promise<SeriesPoint[]>}
 */
export async function fetchUSDtoEUR(days = 30) {
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - days);
  const s = start.toISOString().slice(0, 10);
  const e = today.toISOString().slice(0, 10);
  const url = `https://api.frankfurter.app/${s}..${e}?from=USD&to=EUR`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  return Object.entries(json.rates)
    .map(([date, obj]) => ({ date, value: obj.EUR }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Convert a numeric series to screen points.
 * @param {SeriesPoint[]} series
 * @param {number} stepX
 * @param {number} height
 * @param {number} centerY
 * @returns {Point[]}
 */
export function seriesToPoints(series, stepX, height, centerY) {
  const values = series.map(s => s.value);
  const minV = Math.min(...values), maxV = Math.max(...values);
  return series.map((s, i) => ({
    x: curwaveX(i, stepX),
    y: curwaveY(s.value, minV, maxV, height, centerY)
  }));
}

/* ----------------------------- Presets -------------------------------- */

export const Presets = {
  // 5-point star polyline (outer=120, inner=60)
  star5(o, stepsPerEdge=24, cx=300, cy=220) {
    return {
      x: starX(o, 5, 120, 60, cx, stepsPerEdge),
      y: starY(o, 5, 120, 60, cy, stepsPerEdge),
    };
  },
  // Circle r=140
  circle(o, steps=360, r=140, cx=300, cy=220) {
    return { x: circle.x(o, steps, r, cx), y: circle.y(o, steps, r, cy) };
  }
};

























/* ========================== EXPORT HELPERS =========================== */

/** Download a plain-text file (OBJ, .gltf, etc.) */
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Close a polyline if needed */
function closedIndex(i, n, closed=true) {
  return closed ? (i % n) : Math.min(i, n - 1);
}

/**
 * Build a prism mesh from a 2D polygon (no holes).
 * Returns {positions, normals, indices}.
 * - positions: Float32Array [x,y,z ...]
 * - normals:   Float32Array [x,y,z ...]
 * - indices:   Uint32Array  [i0,i1,i2 ...]
 *
 * Notes:
 * - Top/bottom are triangulated as triangle fans (best for convex shapes).
 * - Sides are quads split into two triangles.
 */
export function prismFromPolygon(points, z0=-10, z1=10, closed=true) {
  const n = points.length;
  if (n < 3) throw new Error('Need at least 3 points');

  // Build vertex arrays
  const topOffset    = 0;
  const bottomOffset = n;

  const positions = [];
  const normals   = [];

  // Centroids for fan
  const cx = points.reduce((s,p)=>s+p.x,0)/n;
  const cy = points.reduce((s,p)=>s+p.y,0)/n;

  // top/bottom ring
  for (let i=0;i<n;i++) {
    const p = points[i];
    positions.push(p.x, p.y, z1); // top
    positions.push(p.x, p.y, z0); // bottom
  }
  // Add fan centers at end
  const topCenterIdx    = positions.length/3; positions.push(cx, cy, z1);
  const bottomCenterIdx = positions.length/3; positions.push(cx, cy, z0);

  // Rough normals:
  // - top/bottom: +/-Z
  // - sides: per-edge outward (2D normal)
  const topNormal    = [0,0, 1];
  const bottomNormal = [0,0,-1];

  // First supply ring normals placeholder; fill sides next
  for (let i=0;i<n;i++) normals.push(...topNormal, ...bottomNormal);
  normals.push(...topNormal, ...bottomNormal);

  // Indices
  const indices = [];

  // Top fan (triangles: center, i, i+1)
  for (let i=0;i<n;i++) {
    const i1 = topOffset + i*2;                   // top ring uses even indices in our packing? (No: we pushed top then bottom; index top is 2*i)
    const i2 = topOffset + ((i+1)%n)*2;
    indices.push(topCenterIdx, i1, i2);
  }

  // Bottom fan (winding opposite to face outward)
  for (let i=0;i<n;i++) {
    const i1 = bottomOffset + ((i+1)%n)*2 + 1;    // bottom indices are odd (2*i+1)
    const i2 = bottomOffset + i*2 + 1;
    indices.push(bottomCenterIdx, i1, i2);
  }

  // Side quads → two triangles each
  for (let i=0;i<n-(closed?0:1);i++) {
    const i0 = i % n;
    const i1 = (i+1) % n;
    const topA    = topOffset    + i0*2;
    const topB    = topOffset    + i1*2;
    const bottomA = bottomOffset + i0*2 + 1;
    const bottomB = bottomOffset + i1*2 + 1;

    // Triangle 1: topA, topB, bottomB
    // Triangle 2: topA, bottomB, bottomA
    indices.push(topA, topB, bottomB,  topA, bottomB, bottomA);

    // Side normal (2D edge normal)
    const ax = points[i1].x - points[i0].x;
    const ay = points[i1].y - points[i0].y;
    const len = Math.hypot(ax, ay) || 1;
    const nx =  ay/len, ny = -ax/len, nz = 0;
    normals[topA*3+0]=nx; normals[topA*3+1]=ny; normals[topA*3+2]=nz;
    normals[topB*3+0]=nx; normals[topB*3+1]=ny; normals[topB*3+2]=nz;
    normals[bottomA*3+0]=nx; normals[bottomA*3+1]=ny; normals[bottomA*3+2]=nz;
    normals[bottomB*3+0]=nx; normals[bottomB*3+1]=ny; normals[bottomB*3+2]=nz;
  }

  return {
    positions: new Float32Array(positions),
    normals:   new Float32Array(normals),
    indices:   new Uint32Array(indices),
  };
}

/** Build a very small OBJ text from a polygon prism */
export function polygonToOBJ(points, {z0=-10, z1=10, closed=true}={}) {
  const {positions, indices} = prismFromPolygon(points, z0, z1, closed);
  const vLines = [];
  for (let i=0;i<positions.length;i+=3) {
    vLines.push(`v ${positions[i].toFixed(6)} ${positions[i+1].toFixed(6)} ${positions[i+2].toFixed(6)}`);
  }
  const fLines = [];
  for (let i=0;i<indices.length;i+=3) {
    // OBJ is 1-based
    fLines.push(`f ${indices[i]+1} ${indices[i+1]+1} ${indices[i+2]+1}`);
  }
  return `# OBJ from math-art\n${vLines.join('\n')}\n${fLines.join('\n')}\n`;
}

/* ------------------------------ glTF 2.0 ------------------------------ */

function toBase64(ab){
  let binary = ''; const bytes = new Uint8Array(ab);
  for (let i=0;i<bytes.length;i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function minMax3(arr){
  const outMin=[+Infinity,+Infinity,+Infinity], outMax=[-Infinity,-Infinity,-Infinity];
  for (let i=0;i<arr.length;i+=3){
    outMin[0]=Math.min(outMin[0],arr[i  ]); outMax[0]=Math.max(outMax[0],arr[i  ]);
    outMin[1]=Math.min(outMin[1],arr[i+1]); outMax[1]=Math.max(outMax[1],arr[i+1]);
    outMin[2]=Math.min(outMin[2],arr[i+2]); outMax[2]=Math.max(outMax[2],arr[i+2]);
  }
  return {min:outMin,max:outMax};
}

/** Create an embedded .gltf JSON (base64 buffers) from mesh arrays */
export function meshToGLTF({positions, normals, indices}) {
  const posViewOffset = 0;
  const posBytes = positions.byteLength;

  const norViewOffset = posBytes;
  const norBytes = normals.byteLength;

  // Indices must be Uint16 or Uint32; we'll keep Uint32 and declare componentType 5125.
  const idxViewOffset = posBytes + norBytes;
  const idxBytes = indices.byteLength;

  // Merge buffers
  const buffer = new Uint8Array(posBytes + norBytes + idxBytes);
  buffer.set(new Uint8Array(positions.buffer), posViewOffset);
  buffer.set(new Uint8Array(normals.buffer),   norViewOffset);
  buffer.set(new Uint8Array(indices.buffer),   idxViewOffset);

  const uri = `data:application/octet-stream;base64,${toBase64(buffer.buffer)}`;

  const posMM = minMax3(positions);
  const json = {
    asset: { version: "2.0", generator: "math-art" },
    buffers: [{ byteLength: buffer.byteLength, uri }],
    bufferViews: [
      { buffer: 0, byteOffset: posViewOffset, byteLength: posBytes, target: 34962 }, // ARRAY_BUFFER
      { buffer: 0, byteOffset: norViewOffset, byteLength: norBytes, target: 34962 },
      { buffer: 0, byteOffset: idxViewOffset, byteLength: idxBytes, target: 34963 }, // ELEMENT_ARRAY_BUFFER
    ],
    accessors: [
      { bufferView: 0, byteOffset: 0, componentType: 5126, count: positions.length/3, type: "VEC3", min: posMM.min, max: posMM.max },
      { bufferView: 1, byteOffset: 0, componentType: 5126, count: normals.length/3,   type: "VEC3" },
      { bufferView: 2, byteOffset: 0, componentType: 5125, count: indices.length,     type: "SCALAR" }
    ],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2
      }]
    }],
    nodes: [{ mesh: 0, name: "Prism" }],
    scenes: [{ nodes: [0] }],
    scene: 0
  };

  return JSON.stringify(json);
}

/** Convenience: polygon → prism → embedded .gltf JSON string */
export function polygonToGLTF(points, {z0=-10, z1=10, closed=true}={}) {
  const mesh = prismFromPolygon(points, z0, z1, closed);
  return meshToGLTF(mesh);
}
























// --- 2D classic heart curve (x,y) ---
export const heart2D = makeParametric(
  // x(t)   =  16 sin^3 t
  (t, s=8, cx=0) => cx + s * 16 * Math.pow(Math.sin(t), 3),
  // y(t)   = -(13 cos t - 5 cos 2t - 2 cos 3t - cos 4t)
  (t, s=8, cy=0) => cy - s * (13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t))
);

// Sample parametric into a closed polyline
export function sampleParametric(fn, steps, ...params){
  const pts = [];
  for (let o=0;o<steps;o++){
    pts.push({ x: fn.x(o, steps, ...params), y: fn.y(o, steps, ...params) });
  }
  return pts;
}












// Right-half heart profile for u in [0..π]
function heartProfile(u, scale=1){
  const x = scale * 16 * Math.pow(Math.sin(u), 3); // ≥ 0 on [0..π]
  const y = scale * (13*Math.cos(u) - 5*Math.cos(2*u) - 2*Math.cos(3*u) - Math.cos(4*u));
  return { x, y };
}

// Generic lathe (surface of revolution around Y-axis)
export function latheFromProfile(profileFn, {
  uSegments = 140,   // along the profile (top→bottom)
  vSegments = 96,    // around the axis
  scale     = 0.25,  // overall size multiplier
  centerY   = true   // recenter vertically
} = {}) {
  // Sample profile
  const U = uSegments, V = vSegments;
  const prof = [];
  let yMin = Infinity, yMax = -Infinity;
  for (let i=0;i<=U;i++){
    const u = (i/U) * Math.PI; // 0..π gives right half
    const {x,y} = profileFn(u, scale);
    prof.push({x, y});
    yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
  }
  const yShift = centerY ? (yMin + yMax)/2 : 0;

  // Allocate
  const vertCount = (U+1)*(V+1);
  const positions = new Float32Array(vertCount*3);
  const normals   = new Float32Array(vertCount*3);
  const indices   = new Uint32Array(U*V*6);

  // Build positions (rings)
  const idx = (i,j) => i*(V+1)+j;
  for (let i=0;i<=U;i++){
    const r = Math.max(prof[i].x, 0);
    const y = prof[i].y - yShift;
    for (let j=0;j<=V;j++){
      const phi = (j/V)*2*Math.PI;
      const X =  r*Math.cos(phi);
      const Z =  r*Math.sin(phi);
      const k = idx(i,j)*3;
      positions[k+0]=X; positions[k+1]=y; positions[k+2]=Z;
    }
  }

  // Indices (two tris per quad)
  let w = 0;
  for (let i=0;i<U;i++){
    for (let j=0;j<V;j++){
      const a = idx(i  , j  );
      const b = idx(i  , j+1);
      const c = idx(i+1, j  );
      const d = idx(i+1, j+1);
      // Choose winding so outward faces are CCW when viewed from outside
      indices[w++]=a; indices[w++]=b; indices[w++]=d;
      indices[w++]=a; indices[w++]=d; indices[w++]=c;
    }
  }

  // Normals via central differences (and flip if inward)
  function getP(i,j){
    const k = idx((i+U+1)%(U+1),(j+V+1)%(V+1))*3;
    return [positions[k],positions[k+1],positions[k+2]];
  }
  function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]}
  function norm(v){const L=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/L,v[1]/L,v[2]/L]}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}

  for (let i=0;i<=U;i++){
    for (let j=0;j<=V;j++){
      const p  = getP(i, j);
      const pu = sub(getP(i+1,j), getP(i-1,j));
      const pv = sub(getP(i,j+1), getP(i,j-1));
      let n = norm(cross(pu, pv));          // approx outward
      if (dot(n, p) < 0) n = [-n[0],-n[1],-n[2]]; // flip if inward
      const k = idx(i,j)*3;
      normals[k+0]=n[0]; normals[k+1]=n[1]; normals[k+2]=n[2];
    }
  }

  return { positions, normals, indices };
}

// Convenience: build GLTF for a puffy heart
export function heartLatheGLTF({scale=0.25, uSegments=140, vSegments=96}={}){
  const mesh = latheFromProfile(heartProfile, { scale, uSegments, vSegments, centerY: true });
  return meshToGLTF(mesh);
}























