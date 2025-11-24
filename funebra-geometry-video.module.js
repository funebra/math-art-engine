// funebra-geometry-video.module.js

// Core engine + shapes + pixels / heart helpers
// (Adjust paths based on your repo layout)
import { Funebra } from './script.shapes.module.js';
import './script.module.js';      // extends Funebra with circleX/Y, starX/Y, etc.
import './funebra-pixels.module.js';     // extends Funebra with heart2D_x/y, pixel helpers, etc.

// DOM hooks
const canvas       = document.getElementById('funebraCanvas');
const ctx          = canvas.getContext('2d');
const codeInput    = document.getElementById('codeInput');
const durationInput= document.getElementById('durationInput');
const fpsInput     = document.getElementById('fpsInput');
const resSelect    = document.getElementById('resSelect');
const previewBtn   = document.getElementById('previewBtn');
const recordBtn    = document.getElementById('recordBtn');
const statusText   = document.getElementById('statusText');
const downloadArea = document.getElementById('downloadArea');
const engineStatus = document.getElementById('engineStatus');

// Capabilities (from modules)
const HAS_FUNEBRA        = !!Funebra;
const HAS_FUNEBRA_CIRCLE = HAS_FUNEBRA &&
  typeof Funebra.circleX === 'function' &&
  typeof Funebra.circleY === 'function';
const HAS_FUNEBRA_STAR   = HAS_FUNEBRA &&
  typeof Funebra.starX === 'function' &&
  typeof Funebra.starY === 'function';
const HAS_FUNEBRA_HEART2D = HAS_FUNEBRA &&
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

let animationFrameId = null;
let recorder         = null;
let recordedChunks   = [];
let recordingTimeout = null;

// ---------- Helpers ----------

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

// ---------- Core renderer wired to Funebra modules ----------

function drawFunebraFrame(tNorm, seedCode) {
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

  // Time-gate digits
  const digits = (seedCode.replace(/\D/g, '') || '2741')
    .padEnd(4, '0')
    .slice(0, 4)
    .split('')
    .map(d => parseInt(d, 10));

  const [d2, d7, d4, d1] = digits;
  const basePhase = tNorm * Math.PI * 2;

  // RING — heart2D if available, else circleX/Y, else trig
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
      // Assumed signature in pixels module: heart2D_x(o, radius, center, steps)
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

  // CENTRAL STAR — wired to starX/starY
  ctx.save();
  const polygonSides = 4 + (d2 % 4) + (d7 % 3); // 4–10
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
      // starX(o, arms, outerR, innerR, center, steps)
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

  // INNER STONES — use circleX/Y where possible
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

  let modeLabel = 'fallback trig';
  if (HAS_FUNEBRA) {
    const bits = [];
    if (HAS_FUNEBRA_HEART2D) bits.push('heart2D');
    if (HAS_FUNEBRA_CIRCLE)  bits.push('circleX/Y');
    if (HAS_FUNEBRA_STAR)    bits.push('starX/Y');
    modeLabel = 'Funebra · ' + (bits.length ? bits.join(' + ') : 'engine loaded');
  }

  ctx.fillText(modeLabel, pad, h - 34);
  ctx.fillText('Funebra™ Geometry AI · v0.4', pad, h - 20);
  ctx.restore();
}

// ---------- Playback & recording ----------

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
        `Preview finished · engine mode: <code>${engineStatus.textContent}</code>`;
      animationFrameId = null;
      return;
    }

    if (now - lastFrameTime >= frameDuration * 0.8) {
      const tNorm = ((now - start) % previewDuration) / previewDuration;
      drawFunebraFrame(tNorm, seed);
      lastFrameTime = now;
    }
    animationFrameId = requestAnimationFrame(loop);
  }

  statusText.innerHTML =
    `Previewing Funebra geometry animation… engine mode: <code>${engineStatus.textContent}</code>`;
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

  const stream = canvas.captureStream(fps);
  recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

  recordedChunks = [];
  recorder.ondataavailable = evt => {
    if (evt.data.size > 0) recordedChunks.push(evt.data);
  };
  recorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const filename = `funebra_geometry_${seed || '2741'}_${durationSec}s_${fps}fps.webm`;

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
      drawFunebraFrame(tNorm, seed);
      lastFrameTime = now;
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  recorder.start();
  statusText.textContent =
    `Recording ${durationSec}s @ ${fps}fps · engine mode: ${engineStatus.textContent}`;
  recordBtn.classList.add('recording');
  animationFrameId = requestAnimationFrame(loop);

  recordingTimeout = setTimeout(() => {
    if (recorder && recorder.state === 'recording') recorder.stop();
  }, totalMs + 1000);
}

// Wire events
previewBtn.addEventListener('click', startPreview);
recordBtn.addEventListener('click', () => {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    statusText.textContent = 'Stopping recording…';
    return;
  }
  startRecording();
});

// First frame
drawFunebraFrame(0.0, '2741');
