// script.module.js — Real Funebra ESM exports (no globals)
// - Pure ES Module. Import with:  import Funebra, { makeParametric3D, surfaces } from './script.module.js'
// - Uses local THREE import (no window.THREE).
// - Exposes classic 2D curve helpers and 3D surface builders.
// - Geometry is kept minimal and dependency‑free except three.js.
//
// Tip:
//   const geo = makeParametric3D(surfaces.torus({R:1.2,r:0.4}), {nu:256,nv:128});
//   const mesh = new THREE.Mesh(geo, material);

import * as THREE from 'three';

// -------------------------
// Math helpers — 2D curves
// -------------------------
// All helpers accept either legacy positional args (for backwards compat)
// or a single options object.

// Regular polygon traced edge by edge with straight segments
export function polygonX(o, sides = 3, radius = 1, centerX = 0, stepsPerEdge = 64){
  // Allow options object signature
  if (typeof o === 'object') {
    const { step=0, sides:si=3, radius:r=1, centerX:cx=0, stepsPerEdge:spe=64 } = o;
    o = step; sides = si; radius = r; centerX = cx; stepsPerEdge = spe;
  }
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge; // 0..1 along current edge
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  const x1   = centerX + radius * Math.cos(a1);
  const x2   = centerX + radius * Math.cos(a2);
  return (1 - t) * x1 + t * x2;
}
export function polygonY(o, sides = 3, radius = 1, centerY = 0, stepsPerEdge = 64){
  if (typeof o === 'object') {
    const { step=0, sides:si=3, radius:r=1, centerY:cy=0, stepsPerEdge:spe=64 } = o;
    o = step; sides = si; radius = r; centerY = cy; stepsPerEdge = spe;
  }
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  const y1   = centerY + radius * Math.sin(a1);
  const y2   = centerY + radius * Math.sin(a2);
  return (1 - t) * y1 + t * y2;
}

// Star polygon (step k), linearly interpolated between vertices
export function starX(o, sides = 5, k = 2, radius = 1, centerX = 0, stepsPerEdge = 64){
  if (typeof o === 'object') {
    const { step=0, sides:si=5, k:kk=2, radius:r=1, centerX:cx=0, stepsPerEdge:spe=64 } = o;
    o = step; sides = si; k = kk; radius = r; centerX = cx; stepsPerEdge = spe;
  }
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = ((edge    * k) % sides) * 2*Math.PI / sides;
  const a2   = (((edge+1)* k) % sides) * 2*Math.PI / sides;
  const x1   = centerX + radius * Math.cos(a1);
  const x2   = centerX + radius * Math.cos(a2);
  return (1 - t) * x1 + t * x2;
}
export function starY(o, sides = 5, k = 2, radius = 1, centerY = 0, stepsPerEdge = 64){
  if (typeof o === 'object') {
    const { step=0, sides:si=5, k:kk=2, radius:r=1, centerY:cy=0, stepsPerEdge:spe=64 } = o;
    o = step; sides = si; k = kk; radius = r; centerY = cy; stepsPerEdge = spe;
  }
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = ((edge    * k) % sides) * 2*Math.PI / sides;
  const a2   = (((edge+1)* k) % sides) * 2*Math.PI / sides;
  const y1   = centerY + radius * Math.sin(a1);
  const y2   = centerY + radius * Math.sin(a2);
  return (1 - t) * y1 + t * y2;
}

// Rose curve r = A * cos(kθ) or A * sin(kθ)
export function roseX(theta, A = 1, k = 4, useSin = false, cx = 0){
  if (typeof theta === 'object'){
    const { t=0, A:AA=1, k:kk=4, useSin:s=false, cx:cx0=0 } = theta;
    theta = t; A = AA; k = kk; useSin = s; cx = cx0;
  }
  const r = A * (useSin ? Math.sin(k*theta) : Math.cos(k*theta));
  return cx + r * Math.cos(theta);
}
export function roseY(theta, A = 1, k = 4, useSin = false, cy = 0){
  if (typeof theta === 'object'){
    const { t=0, A:AA=1, k:kk=4, useSin:s=false, cy:cy0=0 } = theta;
    theta = t; A = AA; k = kk; useSin = s; cy = cy0;
  }
  const r = A * (useSin ? Math.sin(k*theta) : Math.cos(k*theta));
  return cy + r * Math.sin(theta);
}

// Lissajous x = Ax sin(ax t + δ), y = Ay sin(by t)
export function lissajousX(t, Ax = 1, a = 3, delta = Math.PI/2, cx = 0){
  if (typeof t === 'object'){
    const { t:tt=0, Ax:Axx=1, a:aa=3, delta:d=Math.PI/2, cx:cx0=0 } = t;
    t = tt; Ax = Axx; a = aa; delta = d; cx = cx0;
  }
  return cx + Ax * Math.sin(a*t + delta);
}
export function lissajousY(t, Ay = 1, b = 2, cy = 0){
  if (typeof t === 'object'){
    const { t:tt=0, Ay:Ayy=1, b:bb=2, cy:cy0=0 } = t;
    t = tt; Ay = Ayy; b = bb; cy = cy0;
  }
  return cy + Ay * Math.sin(b*t);
}

// Spirograph (hypotrochoid/epitrochoid)
// mode: 'hypo' (inner) or 'epi' (outer)
export function spiroX(t, {R=5, r=3, d=5, mode='hypo', cx=0} = {}){
  const k = mode === 'epi' ? (R + r) / r : (R - r) / r;
  const A = mode === 'epi' ? (R + r) : (R - r);
  return cx + (A * Math.cos(t) + d * Math.cos(k * t));
}
export function spiroY(t, {R=5, r=3, d=5, mode='hypo', cy=0} = {}){
  const k = mode === 'epi' ? (R + r) / r : (R - r) / r;
  const A = mode === 'epi' ? (R + r) : (R - r);
  return cy + (A * Math.sin(t) - d * Math.sin(k * t));
}

// -------------------------
// Parametric surfaces — 3D
// -------------------------
export const surfaces = {
  torus: ({ R=1.15, r=0.44 }={}) => (u,v)=>{
    const a = u*2*Math.PI; // around major ring
    const b = v*2*Math.PI; // around minor tube
    const x = (R + r*Math.cos(b)) * Math.cos(a);
    const y = (R + r*Math.cos(b)) * Math.sin(a);
    const z = r*Math.sin(b);
    return new THREE.Vector3(x,y,z);
  },
  sphere: ({ r=1 }={}) => (u,v)=>{
    const phi = v*Math.PI;          // 0..π
    const theta = u*2*Math.PI;      // 0..2π
    return new THREE.Vector3(
      r*Math.sin(phi)*Math.cos(theta),
      r*Math.sin(phi)*Math.sin(theta),
      r*Math.cos(phi)
    );
  },
  // Immersed Klein bottle (scaled)
  klein: (_opts={}) => (u,v)=>{
    const U = u*2*Math.PI, V=v*2*Math.PI;
    const r = 0.4;
    const x = (Math.cos(U)*(Math.cos(U/2)*(Math.cos(V)+2) + r*Math.cos(U/2)*Math.cos(V)))
            - (Math.sin(U)*r*Math.sin(V));
    const y = (Math.sin(U)*(Math.cos(U/2)*(Math.cos(V)+2) + r*Math.cos(U/2)*Math.cos(V)))
            + (Math.cos(U)*r*Math.sin(V));
    const z = Math.sin(U/2)*(Math.cos(V)+2) + r*Math.sin(U/2)*Math.cos(V);
    return new THREE.Vector3(x*0.6,y*0.6,z*0.6);
  },
  wave: ({ amp=0.25, freq=3, size=3 }={}) => (u,v)=>{
    const x = (u-0.5)*size;
    const y = (v-0.5)*size;
    const z = amp*Math.sin((u+v)*Math.PI*freq);
    return new THREE.Vector3(x,y,z);
  }
};

// Make a 3D parametric surface geometry
export function makeParametric3D(fn, { nu=180, nv=90, uClosed=true, vClosed=false }={}){
  const geom = new THREE.BufferGeometry();
  const verts = new Float32Array(nu*nv*3);
  const uvs   = new Float32Array(nu*nv*2);
  const indices = [];

  // vertex builder with wrapping
  const idx = (i,j)=> ( ( (i%nu+nu)%nu ) * nv + ( (j%nv+nv)%nv ) );

  for(let i=0;i<nu;i++){
    const u = i/(nu-1);
    for(let j=0;j<nv;j++){
      const v = j/(nv-1);
      const p = fn(u,v);
      const vi = (i*nv + j)*3;
      const ti = (i*nv + j)*2;
      verts[vi  ] = p.x; verts[vi+1] = p.y; verts[vi+2] = p.z;
      uvs[ti  ] = u;     uvs[ti+1] = v;
    }
  }

  const imax = uClosed ? nu : nu-1;
  const jmax = vClosed ? nv : nv-1;
  for(let i=0;i<imax;i++){
    for(let j=0;j<jmax;j++){
      const a = idx(i,  j);
      const b = idx(i+1,j);
      const c = idx(i+1,j+1);
      const d = idx(i,  j+1);
      indices.push(a,b,d, b,c,d);
    }
  }

  geom.setIndex(indices);
  geom.setAttribute('position', new THREE.BufferAttribute(verts,3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs,2));
  geom.computeVertexNormals();
  return geom;
}

// Convenience: make a THREE.Mesh directly
export function makeMesh(fn, material, opts){
  return new THREE.Mesh(makeParametric3D(fn, opts), material);
}

// Default export bundle (handy for quick imports)
export default {
  THREE,
  // 2D helpers
  polygonX, polygonY,
  starX, starY,
  roseX, roseY,
  lissajousX, lissajousY,
  spiroX, spiroY,
  // 3D
  surfaces,
  makeParametric3D,
  makeMesh,
};
// ──────────────────────────────────────────────────────────────────────────────
// Funebra.DebugOverlay — toggleable HUD with persistence + hotkey (Alt+D)
// ─────────────────────────────────────────────────────────────────────────────-
(function (root, factory) {
  const ns = (root.Funebra ||= {});
  ns.DebugOverlay = factory(root, ns);
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root, Funebra) {
  const LS_KEY = 'funebra.debugOverlay.enabled';

  const ids = ['steps','stpStart','stpEnd','scodeX','scodeY','clor','wL','hT','bo','itext'];
  const get = (id) => document.getElementById(id) || document.querySelector(`[name="${id}"]`);
  const read = (n) => (n && (n.value ?? n.textContent)) || '—';

  const state = {
    enabled: false,
    el: null,
    raf: 0,
    anchors: {}
  };

  function mount() {
    if (!state.el) {
      let el = document.getElementById('bn600');
      if (!el) {
        el = document.createElement('pre');
        el.id = 'bn600';
        document.body.appendChild(el);
      }
      Object.assign(el.style, {
        position: 'fixed',
        right: '14px',
        top: '140px',
        zIndex: 99999,
        whiteSpace: 'wrap',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '12px',
        lineHeight: '1.35',
        background: 'rgba(0,0,0,.55)',
        color: '#ffb347',
        padding: '8px 10px',
        borderRadius: '10px',
        border: '1px solid rgba(255,179,71,.6)',
        boxShadow: '0 10px 30px rgba(0,0,0,.25)',
        pointerEvents: 'none',
        userSelect: 'text',
        width: '40rem',
        maxWidth: '40rem'
      });
      state.el = el;
    }
    state.anchors = {};
    ids.forEach(k => state.anchors[k] = get(k));
  }

  function text() {
    const a = state.anchors;
    const now = new Date().toLocaleTimeString();
    return `Step:   ${Number(read(a.steps)) || 0}
Start:  ${Number(read(a.stpStart)) || 0}
End:    ${Number(read(a.stpEnd)) || 0}
scodeX: ${read(a.scodeX)}
scodeY: ${read(a.scodeY)}
Color:  ${read(a.clor)}
Width:  ${read(a.wL)}
Height: ${read(a.hT)}
Scene:  ${read(a.bo)}
scode:  ${read(a.itext)}
Stamp:  ${now}`;
  }

  function loop() {
    if (!state.enabled) return;
    state.el.textContent = text();
    state.raf = root.requestAnimationFrame(loop);
  }

  function enable() {
    if (state.enabled) return true;
    state.enabled = true;
    localStorage.setItem(LS_KEY, '1');
    mount();
    loop();
    return true;
  }

  function disable() {
    if (!state.enabled) return false;
    state.enabled = false;
    localStorage.removeItem(LS_KEY);
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (state.el && state.el.parentNode) state.el.parentNode.removeChild(state.el);
    state.el = null;
    return true;
  }

  function toggle(force) {
    const next = force == null ? !state.enabled : !!force;
    return next ? enable() : disable();
  }

  function isEnabled() { return !!state.enabled; }

  function setStyle(opts = {}) {
    if (!state.el) return;
    Object.assign(state.el.style, opts);
  }

  // Hotkey: Alt+D  (also Ctrl+Shift+D fallback)
  root.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    if ((e.altKey && k === 'd') || (e.ctrlKey && e.shiftKey && k === 'd')) {
      toggle();
    }
  });

  // Auto-restore from previous session
  if (localStorage.getItem(LS_KEY) === '1') {
    // wait till DOM is ready so input anchors exist
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enable, { once: true });
    } else {
      enable();
    }
  }

  // Public API
  return {
    enable,
    disable,
    toggle,
    isEnabled,
    setStyle,
    _state: state
  };
});

