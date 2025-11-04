// funebra-subdivider.js
// Funebra Loop-style subdivision for THREE.BufferGeometry (r125+)
// Author: pLabs / Funebra (MIT)

import * as THREE from 'three';

/**
 * Subdivide a triangle BufferGeometry using a Loop-style scheme.
 * - BufferGeometry in, BufferGeometry out
 * - Works best with NON-INDEXED geometry (we convert if needed)
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {Object} opts
 * @param {number} opts.iterations = 1
 * @param {boolean} opts.uvSmooth = false     // average uv for old verts (Loop-style)
 * @param {number} opts.positionTolerance = 1e-4 // merge tolerance to build topology
 * @returns {THREE.BufferGeometry}
 */
export function funebraSubdivide(geometry, opts = {}) {
  const iterations = Math.max(0, opts.iterations ?? 1) | 0;
  const uvSmooth   = !!opts.uvSmooth;
  const eps        = opts.positionTolerance ?? 1e-4;

  if (iterations === 0) return geometry.clone();

  // Always work on NON-INDEXED triangles
  let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const posAttr = g.getAttribute('position');
  if (!posAttr || posAttr.itemSize !== 3) {
    console.warn('[funebra-subdivider] geometry missing position attribute (vec3).');
    return g;
  }
  if (posAttr.count % 3 !== 0) {
    console.warn('[funebra-subdivider] geometry is not a triangle list; results may be undefined.');
  }

  // Carry UVs if present
  const hasUV = !!g.getAttribute('uv');

  for (let iter = 0; iter < iterations; iter++) {
    g = subdivideOnce(g, { uvSmooth, eps, hasUV });
  }
  return g;
}

// ---- Internal helpers -------------------------------------------------------

function hash3(x, y, z, eps) {
  // Quantize a position so identical vertices (within eps) share the same id
  const qx = Math.round(x / eps);
  const qy = Math.round(y / eps);
  const qz = Math.round(z / eps);
  return `${qx},${qy},${qz}`;
}

function subdivideOnce(geom, { uvSmooth, eps, hasUV }) {
  const pos = geom.getAttribute('position');
  const uv  = hasUV ? geom.getAttribute('uv') : null;

  const triCount = (pos.count / 3) | 0;

  // Build “unique vertex” map (merge-by-position with tolerance)
  const uidByHash = new Map();
  const uidToPos  = [];
  const uidToUV   = [];
  const vertUidOfVertexIndex = new Uint32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const h = hash3(x, y, z, eps);
    let uid = uidByHash.get(h);
    if (uid === undefined) {
      uid = uidToPos.length;
      uidByHash.set(h, uid);
      uidToPos.push(new THREE.Vector3(x, y, z));
      if (hasUV) uidToUV.push(new THREE.Vector2(uv.getX(i), uv.getY(i)));
    }
    vertUidOfVertexIndex[i] = uid;
  }

  // Build adjacency (neighbors per unique vertex) & edges (for edge midpoints)
  const neighbors = Array.from({ length: uidToPos.length }, () => new Set());
  // edgeKey "a_b" with a<b -> { a, b, opp: Set<uid> }
  const edges = new Map();

  function edgeKey(a, b) { return a < b ? `${a}_${b}` : `${b}_${a}`; }

  for (let t = 0; t < triCount; t++) {
    const i0 = t*3+0, i1 = t*3+1, i2 = t*3+2;
    const a = vertUidOfVertexIndex[i0];
    const b = vertUidOfVertexIndex[i1];
    const c = vertUidOfVertexIndex[i2];

    neighbors[a].add(b); neighbors[a].add(c);
    neighbors[b].add(a); neighbors[b].add(c);
    neighbors[c].add(a); neighbors[c].add(b);

    const ab = edgeKey(a,b), bc = edgeKey(b,c), ca = edgeKey(c,a);

    addOpp(ab, a, b, c);
    addOpp(bc, b, c, a);
    addOpp(ca, c, a, b);
  }

  function addOpp(key, i, j, opp) {
    let e = edges.get(key);
    if (!e) { e = { a: Math.min(i,j), b: Math.max(i,j), opp: new Set() }; edges.set(key, e); }
    e.opp.add(opp);
  }

  // Compute NEW positions for original vertices (Loop rules)
  const newOldPos = uidToPos.map((p, uid) => p.clone()); // default copy
  for (let uid = 0; uid < uidToPos.length; uid++) {
    const k = neighbors[uid].size;
    if (k === 0) continue;

    // Boundary check: if any neighbor forms an edge with single opposite -> boundary
    const isBoundary = [...neighbors[uid]].some(n => {
      const key = edgeKey(uid, n);
      return (edges.get(key)?.opp.size ?? 0) < 2;
    });

    if (isBoundary) {
      // Classic boundary vertex rule: v' = 3/4 v + 1/8(n1+n2) with the two boundary neighbors
      const boundaryNbrs = [...neighbors[uid]].filter(n => (edges.get(edgeKey(uid,n))?.opp.size ?? 0) < 2);
      if (boundaryNbrs.length >= 2) {
        const v = uidToPos[uid];
        const v1 = uidToPos[boundaryNbrs[0]];
        const v2 = uidToPos[boundaryNbrs[1]];
        newOldPos[uid] = v.clone().multiplyScalar(0.75).add(v1.clone().multiplyScalar(0.125)).add(v2.clone().multiplyScalar(0.125));
      }
      continue;
    }

    // Interior: Loop weights
    let beta;
    if (k === 3) beta = 3/16;
    else        beta = 3/(8*k); // Warren’s tweak; stable and common

    const start = uidToPos[uid].clone().multiplyScalar(1 - k*beta);
    for (const n of neighbors[uid]) start.add(uidToPos[n].clone().multiplyScalar(beta));
    newOldPos[uid] = start;
  }

  // NEW positions for edge midpoints
  const edgeMidUid = new Map(); // key -> new uid
  const outPos = [...newOldPos]; // first N are updated original vertices
  const outUV  = hasUV ? uidToUV.map(v => v.clone()) : null;

  for (const [key, e] of edges.entries()) {
    const A = uidToPos[e.a], B = uidToPos[e.b];
    let mp;

    const isBoundary = e.opp.size < 2;
    if (isBoundary) {
      mp = A.clone().multiplyScalar(0.5).add(B.clone().multiplyScalar(0.5));
    } else {
      const [c, d] = [...e.opp];
      mp = A.clone().multiplyScalar(3/8)
           .add(B.clone().multiplyScalar(3/8))
           .add(uidToPos[c].clone().multiplyScalar(1/8))
           .add(uidToPos[d].clone().multiplyScalar(1/8));
    }

    const newUid = outPos.length;
    outPos.push(mp);

    if (hasUV) {
      // UV midpoint average (simple and robust). For interior you could 3/8/1/8 blend too,
      // but midpoint is usually artifact-free for stylized/flat-shaded looks.
      const uA = uidToUV[e.a], uB = uidToUV[e.b];
      outUV.push(new THREE.Vector2((uA.x+uB.x)/2, (uA.y+uB.y)/2));
    }

    edgeMidUid.set(key, newUid);
  }

  // Optional UV smoothing for original verts (Loop-like)
  if (hasUV && uvSmooth) {
    for (let uid = 0; uid < uidToUV.length; uid++) {
      const k = neighbors[uid].size;
      if (k === 0) continue;
      // Simple average (keeps seams tame). You can mirror the position beta if you like.
      const base = uidToUV[uid].clone().multiplyScalar(1 - 0.5); // 0.5 weight for neighbors
      const each = 0.5 / k;
      for (const n of neighbors[uid]) base.add(uidToUV[n].clone().multiplyScalar(each));
      outUV[uid] = base;
    }
  }

  // Build faces (split each old tri into 4)
  const newPositions = [];
  const newUVs = hasUV ? [] : null;

  function pushTri(u0, u1, u2) {
    const P0 = outPos[u0], P1 = outPos[u1], P2 = outPos[u2];
    newPositions.push(P0.x,P0.y,P0.z, P1.x,P1.y,P1.z, P2.x,P2.y,P2.z);
    if (hasUV) {
      const t0 = outUV[u0], t1 = outUV[u1], t2 = outUV[u2];
      newUVs.push(t0.x,t0.y, t1.x,t1.y, t2.x,t2.y);
    }
  }

  for (let t = 0; t < triCount; t++) {
    const i0 = t*3+0, i1 = t*3+1, i2 = t*3+2;
    const a = vertUidOfVertexIndex[i0];
    const b = vertUidOfVertexIndex[i1];
    const c = vertUidOfVertexIndex[i2];

    const ab = edgeMidUid.get(a < b ? `${a}_${b}` : `${b}_${a}`);
    const bc = edgeMidUid.get(b < c ? `${b}_${c}` : `${c}_${b}`);
    const ca = edgeMidUid.get(c < a ? `${c}_${a}` : `${a}_${c}`);

    // 4 new triangles
    pushTri(a, ab, ca);
    pushTri(b, bc, ab);
    pushTri(c, ca, bc);
    pushTri(ab, bc, ca);
  }

  // Output geometry
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  if (hasUV) out.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2));
  out.computeBoundingBox();
  out.computeBoundingSphere();

  return out;
}
