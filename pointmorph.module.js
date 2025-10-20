// pointmorph.module.js — Funebra Point Morph (Canvas) — ESM
// - Zero deps (no THREE needed).
// - Integrates cleanly alongside your script.module.js bundle.
// - Offers TEXT ↔ SPHERE ↔ CSV morphing with font size & color controls.
// - Exports a class `PointMorphEngine` + small target helpers for advanced use.
//
// Usage:
//   import { PointMorphEngine } from './pointmorph.module.js';
//   const engine = new PointMorphEngine({ canvas, asChars }); // pass your bitmap table
//   engine.setText('FUNEBRA');         // or: engine.setSphere(); engine.setCSV(csvString);
//   engine.setFontSize(160);
//   engine.setColor('#e4e4e4');
//   // engine.destroy() to stop
//
// If you prefer, re-export from your main Funebra module:
//   export { PointMorphEngine } from './pointmorph.module.js';

// ───────────────────────────────────────────────────────────────────────────────
// 0) Helpers: Points, rotation, projection
// ───────────────────────────────────────────────────────────────────────────────
class _P {
  constructor(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; this.tx=x; this.ty=y; this.tz=z; }
  step(k=0.12){ this.x+=(this.tx-this.x)*k; this.y+=(this.ty-this.y)*k; this.z+=(this.tz-this.z)*k; }
}
function _rotX(p,a){ const s=Math.sin(a),c=Math.cos(a); const y=p.y*c - p.z*s; const z=p.y*s + p.z*c; p.y=y; p.z=z; }
function _rotY(p,a){ const s=Math.sin(a),c=Math.cos(a); const x=p.x*c + p.z*s; const z=-p.x*s + p.z*c; p.x=x; p.z=z; }

// projection with slight faux-3D shear (like legacy)
function _project(p, W, H, ZOOM){
  const x = p.x - p.z*ZOOM.h;
  const y = p.y + p.z*ZOOM.v;
  const s = Math.max(((p.z+400)/800)*24 + 2, 1);
  return { x: x + W/2, y: y + H/2, s };
}

// ───────────────────────────────────────────────────────────────────────────────
// 1) Targets (TEXT bitmap, SPHERE, CSV triplets)
// ───────────────────────────────────────────────────────────────────────────────
function targetFromText(str, asChars, fontSize) {
  const rows = 12, cols = 12;
  const s = fontSize/rows;          // pixel size per bitmap cell
  const advance = (cols+2)*s;       // simple letter spacing
  const z=0, pts=[];
  const ox = -(str.length*advance)/2;
  const oy = -(rows*s)/2;

  for (let i=0;i<str.length;i++){
    const code=str.charCodeAt(i);
    if (!(code>32 && code<128)) continue;
    const grid = asChars[code-33];
    if (!grid) continue;
    const lines = grid.split(';');
    for (let r=0;r<rows;r++){
      const row = lines[r]||'';
      for (let c=0;c<cols;c++){
        if (row[c]==='1'){
          pts.push([ ox + i*advance + c*s, oy + r*s, z ]);
        }
      }
    }
  }
  return pts;
}

function targetSphere(n=2200,R=170){
  const pts=[];
  for (let i=0;i<n;i++){
    const u=Math.random(), v=Math.random();
    const th=2*Math.PI*u, ph=Math.acos(2*v-1);
    const x=R*Math.sin(ph)*Math.cos(th);
    const y=R*Math.sin(ph)*Math.sin(th);
    const z=R*Math.cos(ph);
    pts.push([x,y,z]);
  }
  return pts;
}

function targetFromCSV(csv){
  const a = csv.split(',').map(Number);
  const pts=[];
  for (let i=0;i<a.length;i+=3) pts.push([a[i], a[i+1], a[i+2]]);
  return pts;
}

// ───────────────────────────────────────────────────────────────────────────────
// 2) Engine
// ───────────────────────────────────────────────────────────────────────────────
export class PointMorphEngine {
  /**
   * @param {Object} opts
   *  - canvas: HTMLCanvasElement (required)
   *  - asChars: Array<string> bitmap table for ASCII 33..127 (required for TEXT mode)
   *  - maxPoints: default 4000
   *  - color: initial color
   *  - fontSize: px height of the 12-row bitmap
   *  - autoRotate: boolean
   *  - speed: deg/sec equivalent (approx)
   *  - enablePointerControls: boolean (drag to rotate, wheel to zoom)
   */
  constructor(opts={}){
    this.canvas = opts.canvas;
    if (!this.canvas) throw new Error('PointMorphEngine: canvas is required');
    this.ctx = this.canvas.getContext('2d');

    this.asChars = opts.asChars || null;
    this.points = Array.from({length: opts.maxPoints ?? 4000}, () => new _P());
    this.pointColor = opts.color || '#e4e4e4';
    this.fontSize = opts.fontSize ?? 140;
    this.autoRotate = opts.autoRotate ?? true;
    this.speed = opts.speed ?? 2.1;

    this.ZOOM = { v:0.6, h:0.6, scale:1.0 };
    this.rotX = 0; this.rotY = 0;
    this.running = false;

    this._resize = this._resize.bind(this);
    this._tick   = this._tick.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp   = this._onUp.bind(this);
    this._onWheel= this._onWheel.bind(this);

    this.enablePointerControls = !!opts.enablePointerControls;
    if (this.enablePointerControls) this._bindPointer();

    addEventListener('resize', this._resize, { passive:true });
    this._resize();
    // default target
    this.setText('FUNEBRA');
    this.start();
  }

  // ——— public API ———
  start(){ if (!this.running){ this.running=true; requestAnimationFrame(this._tick); } }
  stop(){ this.running=false; }
  destroy(){
    this.stop();
    removeEventListener('resize', this._resize);
    this._unbindPointer();
  }

  setText(str='FUNEBRA'){
    if (!this.asChars) throw new Error('PointMorphEngine: asChars is required for setText');
    this._lastMode='text';
    this._applyTarget( targetFromText(String(str).toUpperCase(), this.asChars, this.fontSize) );
  }
  setSphere(count=2200, R=170){
    this._lastMode='sphere';
    this._applyTarget( targetSphere(count, R) );
  }
  setCSV(csv){
    this._lastMode='csv';
    this._applyTarget( targetFromCSV(csv||'0,0,0') );
  }

  setColor(css){ this.pointColor = css; }
  setFontSize(px){ this.fontSize = +px || this.fontSize; if (this._lastMode==='text') this.setText(this._lastText||'FUNEBRA'); }
  setAutoRotate(flag){ this.autoRotate = !!flag; }
  setSpeed(s){ this.speed = +s || this.speed; }
  setZoomScale(z){ this.ZOOM.scale = Math.max(0.3, Math.min(3, +z)); }

  // ——— internal: target mapping ———
  _applyTarget(pts){
    this._target = pts;
    const step = pts.length / this.points.length;
    let idx = 0;
    for (let i=0;i<this.points.length;i++){
      const j = Math.min(pts.length-1, Math.floor(idx));
      const t = pts[j] || [0,0,0];
      const p = this.points[i];
      p.tx = t[0]; p.ty = t[1]; p.tz = t[2];
      idx += step;
    }
  }

  // ——— loop ———
  _resize(){
    const DPR = Math.min(2, window.devicePixelRatio||1);
    const W = this.canvas.clientWidth || innerWidth;
    const H = this.canvas.clientHeight || innerHeight;
    this.canvas.width = Math.floor(W*DPR);
    this.canvas.height= Math.floor(H*DPR);
    this.ctx.setTransform(DPR,0,0,DPR,0,0);
    this._W = W; this._H = H;
  }

  _tick(ts){
    if (!this._t0) this._t0 = ts;
    const dt = (ts - this._t0) / 1000; this._t0 = ts;

    if (this.autoRotate){
      const a = (this.speed*0.6) * Math.PI/180;
      this.rotX += a; this.rotY += a;
    }

    const ctx = this.ctx;
    ctx.clearRect(0,0,this._W, this._H);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = this.pointColor;

    for (let i=0;i<this.points.length;i++){
      const p = this.points[i];
      p.step(0.12);
      const q = { x:p.x*this.ZOOM.scale, y:p.y*this.ZOOM.scale, z:p.z*this.ZOOM.scale };
      _rotX(q, this.rotX); _rotY(q, this.rotY);
      const pr = _project(q, this._W, this._H, this.ZOOM);
      const s = pr.s*0.5;
      ctx.fillRect(pr.x - s/2, pr.y - s/2, s, s);
    }

    if (this.running) requestAnimationFrame(this._tick);
  }

  // ——— pointer controls (optional) ———
  _bindPointer(){
    this._drag=false; this._mx=0; this._my=0; this._rx0=0; this._ry0=0;
    this.canvas.addEventListener('pointerdown', this._onDown);
    this.canvas.addEventListener('pointermove', this._onMove);
    this.canvas.addEventListener('pointerup',   this._onUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive:false });
  }
  _unbindPointer(){
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onMove);
    this.canvas.removeEventListener('pointerup',   this._onUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
  }
  _onDown(e){ this._drag=true; this.canvas.setPointerCapture(e.pointerId); this._mx=e.clientX; this._my=e.clientY; this._rx0=this.rotX; this._ry0=this.rotY; }
  _onMove(e){ if(!this._drag) return; const dx=e.clientX-this._mx, dy=e.clientY-this._my; this.rotY=this._ry0 + dx*0.01; this.rotX=this._rx0 + dy*0.01; }
  _onUp(){ this._drag=false; }
  _onWheel(e){ e.preventDefault(); const k=Math.exp(-e.deltaY*0.001); this.setZoomScale(this.ZOOM.scale*k); }
}

// Optional re-exports for power users
export { targetFromText, targetSphere, targetFromCSV };
