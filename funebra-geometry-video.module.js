// funebra-geometry-video.module.js
// 2D Funebra geometry + 3D OBJ/GLB → video

// ─────────────────────────────────────────────────────────────
// Import Funebra engine modules (extend window.Funebra)
// ─────────────────────────────────────────────────────────────
import './script.module.js';
import './script.shapes.module.js';
import './funebra-pixels.module.js';

// Three.js + loaders (paths resolved via importmap in HTML)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader }  from 'three/addons/loaders/OBJLoader.js';

// ─────────────────────────────────────────────────────────────
// DOM hooks
// ─────────────────────────────────────────────────────────────
const canvas        = document.getElementById('funebraCanvas');
const ctx           = canvas.getContext('2d');
const codeInput     = document.getElementById('codeInput');
const durationInput = document.getElementById('durationInput');
const fpsInput      = document.getElementById('fpsInput');
const resSelect     = document.getElementById('resSelect');
const previewBtn    = document.getElementById('previewBtn');
const recordBtn     = document.getElementById('recordBtn');
const statusText    = document.getElementById('statusText');
const downloadArea  = document.getElementById('downloadArea');
const engineStatus  = document.getElementById('engineStatus');
const modeSelect    = document.getElementById('modeSelect');
const modelInput    = document.getElementById('modelInput');

let currentMode = '2d'; // '2d' | '3d'

// ─────────────────────────────────────────────────────────────
// Funebra capabilities
// ─────────────────────────────────────────────────────────────
const Funebra = window.Funebra || {};

const HAS_FUNEBRA = !!Funebra;
const HAS_FUNEBRA_CIRCLE =
  HAS_FUNEBRA &&
  typeof Funebra.circleX === 'function' &&
  typeof Funebra.circleY === 'function';
const HAS_FUNEBRA_STAR =
  HAS_FUNEBRA &&
  typeof Funebra.starX === 'function' &&
  typeof Funebra.starY === 'function';
const HAS_FUNEBRA_HEART2D =
  HAS_FUNEBRA &&
  typeof Funebra.heart2D_x === 'function' &&
  typeof Funebra.heart2D_y === 'function';

engineStatus.textContent = HAS_FUNEBRA
  ? [
      'Funebra',
      HAS_FUNEBRA_CIRCLE  ? 'circleX/Y'   : 'no circleX/Y',
      HAS_FUNEBRA_STAR    ? 'starX/Y'     : 'no starX/Y',
      HAS_FUNEBRA_HEART2D ? 'heart2D_x/y' : 'no heart2D_x/y'
    ].join(' · ')
  : 'fallback trig mode';

// ─────────────────────────────────────────────────────────────
// Shared state
// ─────────────────────────────────────────────────────────────
let animationFrameId = null;
let recorder         = null;
let recordedChunks   = [];
let recordingTimeout = null;

// 3D state
let renderer3D = null;
let scene3D    = null;
let camera3D   = null;
let model3D    = null;
let light3D    = null;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function setResolution() {
  let w, h;
  switch (resSelect.value) {
    case '720p':    w = 1280; h = 720;  break;
    case '1080p':   w = 1920; h = 1080; break;
    case 'square':  w = 1080; h = 1080; break;
    case 'vertical':w = 1080; h = 1920; break;
    default:        w = 1280; h = 720;
  }
  canvas.width  = w;
  canvas.height = h;

  if (renderer3D) {
    renderer3D.setSize(w, h, false);
    if (camera3D && camera3D.isPerspectiveCamera) {
      camera3D.aspect = w / h;
      camera3D.updateProjectionMatrix();
    }
  }
}
setResolution();
resSelect.addEventListener('change', setResolution);

function makeSeededRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return function () {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
}

// ─────────────────────────────────────────────────────────────
// 2D Funebra renderer (existing behaviour)
// ─────────────────────────────────────────────────────────────
function drawFunebraFrame2D(tNorm, seedCode) {
  const w      = canvas.width;
  const h      = canvas.height;
  const cx     = w / 2;
  const cy     = h / 2;
  const minDim = Math.min(w, h);

  const rnd = makeSeededRandom(seedCode);

  // Background
  const bgGradient = ctx.createRadialGradient(
    cx, cy, minDim * 0.1,
    cx, cy, minDim * 0.8
  );
  bgGradient.addColorStop(0, 'rgba(8, 12, 30, 1)');
  bgGradient.addColorStop(1, 'rgba(1, 2, 6, 1)');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.save();
  ctx.globalAlpha = 0.14;
  const step = minDim / 20;
  ctx.beginPath();
  for (let x = 0; x <= w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.strokeStyle = 'rgba(80, 96, 160, 0.25)';
  ctx.lineWidth   = 0.5;
  ctx.stroke();
  ctx.restore();

  // Time-gate digits from code
  const digits = (seedCode.replace(/\D/g, '') || '2741')
    .padEnd(4, '0')
    .slice(0, 4)
    .split('')
    .map(d => parseInt(d, 10));
  const [d2, d7, d4, d1] = digits;
  const basePhase = tNorm * Math.PI * 2;

  // Outer ring – heart2D → circleX/Y → trig
  const ringPoints = 32 + (d2 + d7);
  const ringRadius = minDim * (0.25 + (d4 / 40));

  ctx.save();
  ctx.translate(cx, cy);

  for (let u = 0; u < ringPoints; u++) {
    const gateT  = (u / ringPoints + tNorm) % 1;
    const wobble = Math.sin(basePhase * (0.8 + d1 * 0.05) + u * 0.3);
    const radius = ringRadius * (1 + wobble * 0.08);

    let x, y;
    if (HAS_FUNEBRA_HEART2D) {
      const steps = ringPoints;
      const param = gateT * steps;
      x = Funebra.heart2D_x(param, radius, 0, steps);
      y = Funebra.heart2D_y(param, radius, 0, steps);
    } else if (HAS_FUNEBRA_CIRCLE) {
      const steps = ringPoints;
      const param = gateT * steps;
      x = Funebra.circleX(param, radius, 0, steps);
      y = Funebra.circleY(param, radius, 0, steps);
    } else {
      const a = gateT * Math.PI * 2
        + basePhase * 0.4
        + Math.sin(basePhase * 0.7 + u * 0.2) * 0.1;
      x = Math.cos(a) * radius;
      y = Math.sin(a) * radius;
    }

    const glow = (1 + Math.sin(basePhase * 2 + u * 0.7)) * 0.5;
    const size = 2.5 + glow * 4;

    ctx.beginPath();
    ctx.fillStyle = `rgba(92,242,255,${0.4 + glow * 0.5})`;
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central Funebra star
  ctx.save();
  const polygonSides = 4 + (d2 % 4) + (d7 % 3);
  const polyRadius   = minDim * 0.18;
  const polyRotation = basePhase * (0.2 + d1 * 0.02);
  ctx.rotate(polyRotation);

  const samples = polygonSides * 2;
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const aPhase  = (i / samples) * Math.PI * 2;
    const pulsate = 1 + 0.12 * Math.sin(d4 * aPhase + basePhase * 1.2);

    let x, y;
    if (HAS_FUNEBRA_STAR) {
      const o      = i;
      const outerR = polyRadius * pulsate;
      const innerR = outerR * 0.55;
      const center = 0;
      const steps  = samples;
      x = Funebra.starX(o, polygonSides, outerR, innerR, center, steps);
      y = Funebra.starY(o, polygonSides, outerR, innerR, center, steps);
    } else {
      const isOuter = i % 2 === 0;
      const r       = polyRadius * pulsate * (isOuter ? 1 : 0.55);
      x = Math.cos(aPhase) * r;
      y = Math.sin(aPhase) * r;
    }

    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }

  const strokeAlpha = 0.65 + 0.25 * Math.sin(basePhase * 1.3);
  ctx.strokeStyle   = `rgba(255,62,165,${strokeAlpha})`;
  ctx.lineWidth     = 2.5;
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth   = 0.8;
  ctx.strokeStyle = 'rgba(92,242,255,0.45)';
  ctx.stroke();
  ctx.restore();

  // Inner stones
  const stones = 8 + d1;
  for (let s = 0; s < stones; s++) {
    const phaseOffset = (s / stones) * Math.PI * 2;
    const speed       = 0.6 + (s % 3) * 0.2;
    const gatePhase   = basePhase * speed + phaseOffset;
    const rBase       = minDim * (0.09 + (s / stones) * 0.12);
    let x, y;

    if (HAS_FUNEBRA_CIRCLE) {
      const steps = 360;
      const param = ((gatePhase / (Math.PI * 2)) * steps) % steps;
      x = Funebra.circleX(param, rBase, 0, steps);
      y = Funebra.circleY(param, rBase, 0, steps);
    } else {
      x = Math.cos(gatePhase) * rBase;
      y = Math.sin(gatePhase) * rBase;
    }

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(92,242,255,0.4)';
    ctx.lineWidth   = 0.8;
    ctx.arc(x, y, 6 + (s % 3) * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // HUD
  ctx.save();
  ctx.font         = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle    = 'rgba(225,230,255,0.85)';
  ctx.textBaseline = 'top';

  const pad = 12;
  ctx.fillText(`Funebra Code: ${seedCode || '2741'}`, pad, pad);
  const tStr = (tNorm * 100).toFixed(1).padStart(5, '0');
  ctx.fillText(`Time-gate: ${tStr} %`, pad, pad + 16);

  ctx.globalAlpha = 0.55;
  ctx.font        = '10px system-ui';
  let modeLabel   = 'fallback trig';
  if (HAS_FUNEBRA) {
    const bits = [];
    if (HAS_FUNEBRA_HEART2D) bits.push('heart2D');
    if (HAS_FUNEBRA_CIRCLE)  bits.push('circleX/Y');
    if (HAS_FUNEBRA_STAR)    bits.push('starX/Y');
    modeLabel = 'Funebra · ' + (bits.length ? bits.join(' + ') : 'engine loaded');
  }
  ctx.fillText(modeLabel, pad, h - 34);
  ctx.fillText('Funebra™ Geometry AI · v0.4 · 2D', pad, h - 20);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 3D renderer: OBJ/GLB + rotation
// ─────────────────────────────────────────────────────────────
function ensure3DScene() {
  if (renderer3D) return;

  const w = canvas.width;
  const h = canvas.height;

  renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer3D.setSize(w, h, false);
  renderer3D.setPixelRatio(window.devicePixelRatio || 1);

  const wrap = document.querySelector('.canvas-wrap');
  renderer3D.domElement.style.position = 'absolute';
  renderer3D.domElement.style.left = '0';
  renderer3D.domElement.style.top  = '0';
  renderer3D.domElement.style.width  = '100%';
  renderer3D.domElement.style.height = '100%';

  // put WebGL canvas on top of the 2D canvas
  wrap.appendChild(renderer3D.domElement);

  scene3D  = new THREE.Scene();
  scene3D.background = new THREE.Color(0x05060b);

  camera3D = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera3D.position.set(0, 0.5, 2.5);

  light3D = new THREE.DirectionalLight(0xffffff, 1.2);
  light3D.position.set(3, 4, 2);
  scene3D.add(light3D);

  const fillLight = new THREE.AmbientLight(0x404060, 0.7);
  scene3D.add(fillLight);

  // ground grid (optional)
  const grid = new THREE.GridHelper(4, 16, 0x304060, 0x202535);
  grid.position.y = -1;
  scene3D.add(grid);
}

function load3DModelFromFile(file) {
  if (!file) return;

  ensure3DScene();

  // Remove old model
  if (model3D && scene3D) {
    scene3D.remove(model3D);
    model3D.traverse?.(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    model3D = null;
  }

  const url = URL.createObjectURL(file);
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
    const loader = new GLTFLoader();
    loader.load(url, gltf => {
      model3D = gltf.scene;
      scene3D.add(model3D);
      fitModelToView(model3D);
    });
  } else if (lower.endsWith('.obj')) {
    const loader = new OBJLoader();
    loader.load(url, obj => {
      model3D = obj;
      scene3D.add(model3D);
      fitModelToView(model3D);
    });
  } else {
    console.warn('Unsupported model type:', file.name);
  }
}

function fitModelToView(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // move model to origin
  obj.position.sub(center);

  // scale into a nice range
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const targetSize = 1.8;
  const scale = targetSize / maxDim;
  obj.scale.setScalar(scale);
}

function drawFunebraFrame3D(tNorm, seedCode) {
  if (!renderer3D || !scene3D || !camera3D) {
    // fallback: just draw the 2D version
    drawFunebraFrame2D(tNorm, seedCode);
    return;
  }

  const digits = (seedCode.replace(/\D/g, '') || '2741')
    .padEnd(4, '0')
    .slice(0, 4)
    .split('')
    .map(d => parseInt(d, 10));
  const [d2, d7, d4, d1] = digits;
  const basePhase = tNorm * Math.PI * 2;

  if (model3D) {
    // simple Funebra-style rotation driven by digits
    model3D.rotation.y = basePhase * (0.3 + d2 * 0.03);
    model3D.rotation.x = basePhase * (0.15 + d7 * 0.02);
    model3D.rotation.z = Math.sin(basePhase * (0.5 + d4 * 0.05)) * 0.4;
  }

  renderer3D.render(scene3D, camera3D);
}

// Choose active "draw frame" implementation based on mode
function drawFrame(tNorm, seedCode) {
  if (currentMode === '3d') {
    drawFunebraFrame3D(tNorm, seedCode);
  } else {
    drawFunebraFrame2D(tNorm, seedCode);
  }
}

// ─────────────────────────────────────────────────────────────
// Playback & recording
// ─────────────────────────────────────────────────────────────
function stopAnimation() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function startPreview() {
  stopAnimation();
  setResolution();
  const seed           = codeInput.value.trim() || '2741';
  const fps            = parseInt(fpsInput.value, 10) || 30;
  const frameDuration  = 1000 / fps;
  const previewDuration= 12_000;

  const start = performance.now();
  let lastFrameTime = start;

  function loop(now) {
    if (now - start > previewDuration) {
      statusText.innerHTML =
        `Preview finished · engine mode: <code>${engineStatus.textContent}</code> · mode: ${currentMode}`;
      animationFrameId = null;
      return;
    }

    if (now - lastFrameTime >= frameDuration * 0.8) {
      const tNorm = ((now - start) % previewDuration) / previewDuration;
      drawFrame(tNorm, seed);
      lastFrameTime = now;
    }
    animationFrameId = requestAnimationFrame(loop);
  }

  statusText.innerHTML =
    `Previewing Funebra animation… engine: <code>${engineStatus.textContent}</code> · mode: ${currentMode}`;
  animationFrameId = requestAnimationFrame(loop);
}

function startRecording() {
  if (recorder) return;

  stopAnimation();
  setResolution();

  const seed        = codeInput.value.trim() || '2741';
  const fps         = parseInt(fpsInput.value, 10) || 30;
  const durationSec = Math.max(1, Math.min(60, parseInt(durationInput.value, 10) || 10));
  const totalMs     = durationSec * 1000;
  const frameDuration = 1000 / fps;

  // use the correct canvas
  const sourceCanvas =
    currentMode === '3d' && renderer3D
      ? renderer3D.domElement
      : canvas;

  const stream = sourceCanvas.captureStream(fps);
  recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

  recordedChunks = [];
  recorder.ondataavailable = evt => {
    if (evt.data.size > 0) recordedChunks.push(evt.data);
  };
  recorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const filename = `funebra_geometry_${seed || 'code'}_${durationSec}s_${fps}fps_${currentMode}.webm`;

    downloadArea.innerHTML =
      `<a href="${url}" download="${filename}">⬇ Download video (${filename})</a>`;

    statusText.textContent = 'Recording finished. Video ready for download.';
    recorder = null;
    recordBtn.classList.remove('recording');
  };

  const start = performance.now();
  let lastFrameTime = start;

  function loop(now) {
    const elapsed = now - start;
    if (elapsed > totalMs || !recorder) {
      if (recorder && recorder.state === 'recording') recorder.stop();
      if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
      }
      animationFrameId = null;
      return;
    }

    if (now - lastFrameTime >= frameDuration * 0.9) {
      const tNorm = elapsed / totalMs;
      drawFrame(tNorm, seed);
      lastFrameTime = now;
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  recorder.start();
  statusText.textContent =
    `Recording ${durationSec}s @ ${fps}fps · engine: ${engineStatus.textContent} · mode: ${currentMode}`;
  recordBtn.classList.add('recording');
  animationFrameId = requestAnimationFrame(loop);

  recordingTimeout = setTimeout(() => {
    if (recorder && recorder.state === 'recording') recorder.stop();
  }, totalMs + 1000);
}

// ─────────────────────────────────────────────────────────────
// UI wiring
// ─────────────────────────────────────────────────────────────
previewBtn.addEventListener('click', startPreview);
recordBtn.addEventListener('click', () => {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    statusText.textContent = 'Stopping recording…';
    return;
  }
  startRecording();
});

modeSelect.addEventListener('change', () => {
  currentMode = modeSelect.value;
  // Show/hide model input hint if you like (optional)
  statusText.textContent =
    currentMode === '3d'
      ? '3D mode: upload a Funebra OBJ/GLB model to animate.'
      : '2D mode: Funebra geometry engine active.';
});

modelInput.addEventListener('change', () => {
  const file = modelInput.files && modelInput.files[0];
  if (!file) return;
  currentMode = '3d';
  modeSelect.value = '3d';
  load3DModelFromFile(file);
  statusText.textContent = `Loaded model: ${file.name}`;
});

// Initial frame (2D)
drawFunebraFrame2D(0.0, '2741');
