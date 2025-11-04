/*
 * Funebra™ Exporters — one-file ESM utilities for PNG, GIF, WebM, and GLTF
 * Works with Three.js/WebGL or any <canvas> element.
 *
 * Usage quickstart (browser ESM):
 *   import * as X from './funebra.exporters.module.js';
 *   const canvas = renderer.domElement;
 *   await X.exportPNG(canvas, { filename: 'funebra.png' });
 *   const webmBlob = await X.recordWebM(canvas, { seconds: 3, fps: 30 });
 *   await X.saveBlob(webmBlob, 'funebra.webm');
 *   const frames = await X.captureFrames({ renderer, scene, camera, frames: 60, fps: 30, update: (i,t)=>{/* animate */} /*);
 *   const gifBlob = await X.encodeGIF(frames, { fps: 30 });
 *   await X.saveBlob(gifBlob, 'funebra.gif');
 *   await X.exportGLTF(scene, { filename: 'funebra.gltf', binary: false });
 */

// ————————————————————————————————————————————————————————————————————
// Small helpers
// ————————————————————————————————————————————————————————————————————

export function getCanvas(target){
  if(!target) throw new Error('getCanvas: target is required');
  if(typeof HTMLCanvasElement!=='undefined' && target instanceof HTMLCanvasElement) return target;
  if(target && target.domElement && (target.domElement instanceof HTMLCanvasElement)) return target.domElement; // likely a three.js renderer
  throw new Error('getCanvas: pass a <canvas> or a Three.js WebGLRenderer');
}

export async function blobFromCanvas(canvas, type='image/png', quality){
  return new Promise((res, rej)=>{
    if(canvas.toBlob){ canvas.toBlob(b=> b?res(b):rej(new Error('toBlob failed')), type, quality); return; }
    // Fallback via dataURL
    try{
      const dataURL = canvas.toDataURL(type, quality);
      const bin = atob(dataURL.split(',')[1]);
      const arr = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
      res(new Blob([arr], { type }));
    }catch(err){ rej(err); }
  });
}

export async function saveBlob(blob, filename='download.bin'){
  const a = document.createElement('a');
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ————————————————————————————————————————————————————————————————————
// PNG (single-frame)
// ————————————————————————————————————————————————————————————————————

export async function exportPNG(target, { filename='funebra.png', type='image/png', quality }={}){
  const canvas = getCanvas(target);
  const blob = await blobFromCanvas(canvas, type, quality);
  await saveBlob(blob, filename);
  return blob;
}

// ————————————————————————————————————————————————————————————————————
// Frame capture (useful for GIF/APNG/WebM encoders)
// ————————————————————————————————————————————————————————————————————

/**
 * Capture a series of RGBA frames from a Three.js renderer or canvas.
 * @param {Object} opts
 *   - renderer: THREE.WebGLRenderer (optional if canvas passed)
 *   - scene, camera: for renderer.render()
 *   - canvas: HTMLCanvasElement (optional if renderer passed)
 *   - frames: number of frames to capture
 *   - fps: playback frame rate
 *   - update: function(i, t, dt) called before each capture (animate your scene)
 *   - onProgress: function(i, total)
 *   - type: mime type for each still (default 'image/png')
 */
export async function captureFrames(opts){
  const { renderer, scene, camera, canvas: canvasIn, frames=60, fps=30, update, onProgress, type='image/png', quality } = opts || {};
  const canvas = canvasIn || (renderer ? renderer.domElement : null);
  if(!canvas) throw new Error('captureFrames: provide renderer or canvas');

  const frameBlobs = [];
  const dt = 1 / fps; let t = 0;

  for(let i=0;i<frames;i++){
    if(typeof update === 'function') await update(i, t, dt);
    if(renderer && scene && camera) renderer.render(scene, camera);
    const blob = await blobFromCanvas(canvas, type, quality);
    frameBlobs.push(blob);
    if(onProgress) onProgress(i+1, frames);
    t += dt;
    // Yield to UI thread between frames to keep the page responsive
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r=> setTimeout(r, 0));
  }
  return frameBlobs; // Array<Blob>
}

// ————————————————————————————————————————————————————————————————————
// GIF encode (via tiny ESM encoder gifenc)
// ————————————————————————————————————————————————————————————————————

/**
 * Encode an array of image blobs (PNG/JPEG) into a single animated GIF.
 * Uses gifenc (https://github.com/mattdesl/gifenc) loaded at runtime as ESM.
 */
export async function encodeGIF(frameBlobs, { fps=30, loop=0, quality=128 }={}){
  if(!frameBlobs || !frameBlobs.length) throw new Error('encodeGIF: no frames');

  // Load gifenc (ESM) on demand
  const { GIFEncoder, quantize, applyPalette } = await import('https://unpkg.com/gifenc@1.0.3/dist/gifenc.esm.js');

  // Decode each blob into ImageBitmap for pixel access
  const bitmaps = [];
  for(const blob of frameBlobs){
    // eslint-disable-next-line no-await-in-loop
    bitmaps.push(await createImageBitmap(blob));
  }
  const w = bitmaps[0].width, h = bitmaps[0].height;

  // Scratch canvas to read RGBA
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });

  const enc = new GIFEncoder();
  const msPerFrame = Math.round(1000 / fps);

  for(const bmp of bitmaps){
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(bmp, 0, 0);
    const rgba = ctx.getImageData(0,0,w,h).data;
    // Quantize and index
    const palette = quantize(rgba, quality);
    const index = applyPalette(rgba, palette);
    enc.writeFrame(index, w, h, {palette, delay: msPerFrame});
  }
  const gifBytes = enc.finish({ loop });
  return new Blob([gifBytes], { type: 'image/gif' });
}

// ————————————————————————————————————————————————————————————————————
// WebM recording (MediaRecorder)
// ————————————————————————————————————————————————————————————————————

/**
 * Record a canvas to WebM using MediaRecorder.
 * @returns Blob (webm)
 */
export async function recordWebM(target, { seconds=3, fps=30, mimeType, bitsPerSecond=6_000_000, onData }={}){
  const canvas = getCanvas(target);
  const stream = canvas.captureStream(fps);
  const type = mimeType || (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: bitsPerSecond });
  const chunks = [];
  rec.ondataavailable = e=>{ if(e.data && e.data.size){ chunks.push(e.data); if(onData) onData(e.data); } };
  const stopped = new Promise((resolve)=>{ rec.onstop = resolve; });
  rec.start(Math.max(1000/ fps, 100));
  await new Promise(r=> setTimeout(r, Math.max(0, seconds*1000)));
  rec.stop();
  await stopped;
  return new Blob(chunks, { type });
}

// ————————————————————————————————————————————————————————————————————
// GLTF export (via Three.js GLTFExporter)
// ————————————————————————————————————————————————————————————————————

/**
 * Export a Three.js Object3D/Scene as GLTF/GLB.
 * @param {*} root THREE.Object3D or Scene
 * @param {*} options { binary=false, filename='scene.gltf', trs=false, onlyVisible=true, truncateDrawRange=true }
 */
export async function exportGLTF(root, options={}){
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const {
    binary = false,
    filename = binary ? 'funebra.glb' : 'funebra.gltf',
    trs = false,
    onlyVisible = true,
    truncateDrawRange = true,
    embedImages = true,
  } = options;

  const exporter = new GLTFExporter();
  const parseOpts = { trs, onlyVisible, truncateDrawRange, binary, embedImages };

  const data = await new Promise((resolve, reject)=>{
    exporter.parse(root, resolve, reject, parseOpts);
  });

  if(binary){
    const blob = new Blob([data], { type: 'model/gltf-binary' });
    await saveBlob(blob, filename);
    return blob;
  } else {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'model/gltf+json' });
    await saveBlob(blob, filename);
    return blob;
  }
}

// ————————————————————————————————————————————————————————————————————
// Convenience: export animation to GIF or WebM in one call
// ————————————————————————————————————————————————————————————————————

export async function exportAnimationGIF({ renderer, scene, camera, frames=120, fps=30, update, filename='funebra.gif', onProgress }){
  const frameBlobs = await captureFrames({ renderer, scene, camera, frames, fps, update, onProgress });
  const gif = await encodeGIF(frameBlobs, { fps });
  await saveBlob(gif, filename);
  return gif;
}

export async function exportAnimationWebM({ canvas, renderer, seconds=4, fps=30, filename='funebra.webm' }){
  const cnv = canvas || (renderer? renderer.domElement : null);
  if(!cnv) throw new Error('exportAnimationWebM: provide canvas or renderer');
  const blob = await recordWebM(cnv, { seconds, fps });
  await saveBlob(blob, filename);
  return blob;
}

// ————————————————————————————————————————————————————————————————————
// Quality-of-life: async sleep & timestamped filenames
// ————————————————————————————————————————————————————————————————————

export const sleep = (ms)=> new Promise(r=> setTimeout(r, ms));
export function stamp(name, ext='png'){
  const s = new Date().toISOString().replace(/[:.]/g,'-');
  return `${name}-${s}.${ext}`;
}

// ————————————————————————————————————————————————————————————————————
// Example wiring (optional): attach minimal UI controls
// ————————————————————————————————————————————————————————————————————

export function attachExportUI({ target, onPNG, onGIF, onWebM, style }={}){
  const host = document.createElement('div');
  host.id = 'funebra-export-bar';
  host.style.cssText = `position:fixed;right:10px;top:10px;z-index:9999;display:flex;gap:8px;padding:8px 10px;border-radius:10px;background:#1119;color:#eef;font:12px system-ui;border:1px solid #222;backdrop-filter:blur(6px)`;
  if(style) Object.assign(host.style, style);
  const mkBtn=(txt)=>{ const b=document.createElement('button'); b.textContent=txt; b.style.cssText='cursor:pointer;padding:6px 8px;border-radius:8px;border:1px solid #333;background:#1b1f29;color:#eaeaff'; return b; };
  const btnP = mkBtn('PNG'); const btnG = mkBtn('GIF'); const btnW = mkBtn('WebM');
  host.append(btnP, btnG, btnW);
  (target||document.body).appendChild(host);
  btnP.onclick = onPNG || (()=> exportPNG(document.querySelector('canvas'), { filename: stamp('funebra', 'png') }));
  btnG.onclick = onGIF || (async ()=>{
    const renderer = window.renderer; const scene = window.scene; const camera = window.camera;
    const frames = await captureFrames({ renderer, scene, camera, frames: 90, fps: 30, update: window.funebraUpdate });
    const gif = await encodeGIF(frames, { fps: 30 });
    await saveBlob(gif, stamp('funebra', 'gif'));
  });
  btnW.onclick = onWebM || (async ()=>{
    const canvas = document.querySelector('canvas');
    const webm = await recordWebM(canvas, { seconds: 3, fps: 30 });
    await saveBlob(webm, stamp('funebra', 'webm'));
  });
  return host;
}
