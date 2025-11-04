// funebra-subdivider.js
// Funebra Loop-style subdivision for THREE.BufferGeometry (r125+)
// MIT — pLabs / Funebra

import * as THREE from 'three';

/**
 * Subdivide a triangle BufferGeometry using a Loop-style scheme.
 * @param {THREE.BufferGeometry} geometry
 * @param {{iterations?:number, uvSmooth?:boolean, positionTolerance?:number}} opts
 * @returns {THREE.BufferGeometry}
 */
export function funebraSubdivide(geometry, opts = {}) {
  const iterations = Math.max(0, opts.iterations ?? 1) | 0;
  const uvSmooth   = !!opts.uvSmooth;
  const eps        = opts.positionTolerance ?? 1e-4;

  if (iterations === 0) return geometry.clone();

  let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const posAttr = g.getAttribute('position');
  if (!posAttr || posAttr.itemSize !== 3) {
    console.warn('[funebra-subdivider] geometry missing position attribute (vec3).');
    return g;
  }

  const hasUV = !!g.getAttribute('uv');

  for (let i = 0; i < iterations; i++) {
    g = subdivideOnce(g, { uvSmooth, eps, hasUV });
  }
  return g;
}

// ---------- internal ----------

function hash3(x, y, z, eps) {
  const qx = Math.round(x / eps), qy = Math.round(y / eps), qz = Math.round(z / eps);
  return `${qx},${qy},${qz}`;
}

function subdivideOnce(geom, { uvSmooth, eps, hasUV }) {
  const pos = geom.getAttribute('position');
  const uv  = hasUV ? geom.getAttribute('uv') : null;
  const triCount = (pos.count / 3) | 0;

  // unique vertex map (merge by position within eps)
  const uidByHash = new Map();
  const uidToPos = [];
  const uidToUV  = [];
  const vtxUidOfIndex = new Uint32Array(pos.count);

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
    vtxUidOfIndex[i] = uid;
  }

  // adjacency + edges
  const neighbors = Array.from({ length: uidToPos.length }, () => new Set());
  const edges = new Map(); // key "a_b" (a<b) -> {a,b,opp:Set}

  const keyAB = (a,b)=> a<b?`${a}_${b}`:`${b}_${a}`;
  const addOpp = (key, i, j, o)=>{
    let e = edges.get(key);
    if (!e) { e = { a: Math.min(i,j), b: Math.max(i,j), opp:new Set() }; edges.set(key, e); }
    e.opp.add(o);
  };

  for (let t = 0; t < triCount; t++) {
    const i0=t*3, i1=i0+1, i2=i0+2;
    const a=vtxUidOfIndex[i0], b=vtxUidOfIndex[i1], c=vtxUidOfIndex[i2];
    neighbors[a].add(b); neighbors[a].add(c);
    neighbors[b].add(a); neighbors[b].add(c);
    neighbors[c].add(a); neighbors[c].add(b);
    addOpp(keyAB(a,b), a,b,c);
    addOpp(keyAB(b,c), b,c,a);
    addOpp(keyAB(c,a), c,a,b);
  }

  // updated original vertices
  const newOldPos = uidToPos.map(p=>p.clone());
  for (let uid=0; uid<uidToPos.length; uid++) {
    const k = neighbors[uid].size; if (!k) continue;

    const isBoundary = [...neighbors[uid]].some(n => (edges.get(keyAB(uid,n))?.opp.size ?? 0) < 2);
    if (isBoundary) {
      const bNbrs = [...neighbors[uid]].filter(n => (edges.get(keyAB(uid,n))?.opp.size ?? 0) < 2);
      if (bNbrs.length>=2) {
        const v=uidToPos[uid], v1=uidToPos[bNbrs[0]], v2=uidToPos[bNbrs[1]];
        newOldPos[uid] = v.clone().multiplyScalar(0.75).add(v1.clone().multiplyScalar(0.125)).add(v2.clone().multiplyScalar(0.125));
      }
      continue;
    }

    let beta = (k===3) ? 3/16 : 3/(8*k); // Warren tweak
    const acc = uidToPos[uid].clone().multiplyScalar(1 - k*beta);
    for (const n of neighbors[uid]) acc.add(uidToPos[n].clone().multiplyScalar(beta));
    newOldPos[uid] = acc;
  }

  // edge midpoints
  const edgeMidUid = new Map();
  const outPos = [...newOldPos];
  const outUV  = hasUV ? uidToUV.map(v=>v.clone()) : null;

  for (const [k,e] of edges.entries()) {
    const A=uidToPos[e.a], B=uidToPos[e.b];
    let mp;
    if ((e.opp.size ?? 0) < 2) {
      mp = A.clone().multiplyScalar(0.5).add(B.clone().multiplyScalar(0.5));
    } else {
      const [c,d] = [...e.opp];
      mp = A.clone().multiplyScalar(3/8)
           .add(B.clone().multiplyScalar(3/8))
           .add(uidToPos[c].clone().multiplyScalar(1/8))
           .add(uidToPos[d].clone().multiplyScalar(1/8));
    }
    const uid = outPos.length;
    outPos.push(mp);
    if (hasUV) {
      const uA=uidToUV[e.a], uB=uidToUV[e.b];
      outUV.push(new THREE.Vector2((uA.x+uB.x)/2, (uA.y+uB.y)/2));
    }
    edgeMidUid.set(k, uid);
  }

  // optional UV smoothing for originals
  if (hasUV && uvSmooth) {
    for (let uid=0; uid<uidToUV.length; uid++) {
      const k = neighbors[uid].size; if(!k) continue;
      const base = uidToUV[uid].clone().multiplyScalar(0.5);
      const each = 0.5 / k;
      for (const n of neighbors[uid]) base.add(uidToUV[n].clone().multiplyScalar(each));
      outUV[uid] = base;
    }
  }

  // build new triangles (4 per old)
  const newPos = [];
  const newU   = hasUV ? [] : null;
  const push = (u0,u1,u2)=>{
    const P0=outPos[u0], P1=outPos[u1], P2=outPos[u2];
    newPos.push(P0.x,P0.y,P0.z, P1.x,P1.y,P1.z, P2.x,P2.y,P2.z);
    if (hasUV){
      const t0=outUV[u0], t1=outUV[u1], t2=outUV[u2];
      newU.push(t0.x,t0.y, t1.x,t1.y, t2.x,t2.y);
    }
  };

  for (let t = 0; t < triCount; t++) {
    const i0=t*3, i1=i0+1, i2=i0+2;
    const a=vtxUidOfIndex[i0], b=vtxUidOfIndex[i1], c=vtxUidOfIndex[i2];
    const ab=edgeMidUid.get(keyAB(a,b)), bc=edgeMidUid.get(keyAB(b,c)), ca=edgeMidUid.get(keyAB(c,a));
    push(a,ab,ca); push(b,bc,ab); push(c,ca,bc); push(ab,bc,ca);
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(newPos,3));
  if (hasUV) out.setAttribute('uv', new THREE.Float32BufferAttribute(newU,2));
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}
