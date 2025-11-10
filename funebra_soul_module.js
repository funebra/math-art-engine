// funebra-soul.module.js — Funebra “Soul” primitive for Funebra Math‑Art Engine
// ESM module — drop-in. Requires three.js already loaded by host.
// © pLabs / Funebra 2025. MIT-like prototype license.

import * as THREE from 'three';

/**
 * Public API
 * - createFunebraSoul(scene, opts?) -> { group, update(dt), params, audio? }
 * - updateFunebraSoul(soul, partialOpts) -> void
 * - EmotionLUT: map of emotion → { toneNm, intensity }
 */

export const EmotionLUT = {
  wonder:      { toneNm: 420, intensity: 0.9 }, // violet
  hope:        { toneNm: 470, intensity: 0.8 }, // blue
  compassion:  { toneNm: 530, intensity: 0.85 },// green
  creation:    { toneNm: 580, intensity: 1.0 }, // gold
  pain:        { toneNm: 650, intensity: 0.7 }, // deep red
};

// --- Utilities -------------------------------------------------------------
const nmToRGB = (nm)=>{ // quick approximate spectral → sRGB (clamped)
  // Range 380–780nm
  const w = THREE.MathUtils.clamp(nm, 380, 780);
  let r=0,g=0,b=0;
  if (w>=380 && w<440){ r = -(w-440)/(440-380); g = 0; b = 1; }
  else if (w<490){ r = 0; g = (w-440)/(490-440); b = 1; }
  else if (w<510){ r = 0; g = 1; b = -(w-510)/(510-490); }
  else if (w<580){ r = (w-510)/(580-510); g = 1; b = 0; }
  else if (w<645){ r = 1; g = -(w-645)/(645-580); b = 0; }
  else{ r = 1; g = 0; b = 0; }
  // intensity correction near edges
  let s=1;
  if (w>700) s = 0.3 + 0.7*(780-w)/(780-700);
  else if (w<420) s = 0.3 + 0.7*(w-380)/(420-380);
  return new THREE.Color(r*s, g*s, b*s);
};

const makeAdditiveMat = (uniforms, fragColorExpr)=> new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms,
  vertexShader: /* glsl */`
    varying vec3 vPos;
    varying vec3 vNormal;
    void main(){
      vPos = position;
      vNormal = normalMatrix * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform float uPhase;
    uniform float uIntensity;
    uniform vec3  uToneRGB;
    varying vec3 vPos; varying vec3 vNormal;
    float sat(float x){ return clamp(x,0.,1.); }
    void main(){
      float breathe = 0.5 + 0.5*sin(uTime*0.9 + uPhase);
      float rim = pow( sat(1.0 - abs(dot(normalize(vNormal), vec3(0.,0.,1.)))), 2.0 );
      vec3 color = ${fragColorExpr};
      float a = sat(0.15 + 0.85*(breathe*rim*uIntensity));
      gl_FragColor = vec4(color, a);
    }
  `
});

// --- Core Torus (Loop of Recognition) -------------------------------------
function createTorusMesh(params){
  const {
    majorRadius: R=1.8,
    minorRadius: r=0.55,
    radialSeg=256, tubularSeg=384,
    toneNm=580, intensity=1,
  } = params;

  const geom = new THREE.TorusGeometry(R, r, radialSeg, tubularSeg);

  const uniforms = {
    uTime:      { value: 0 },
    uPhase:     { value: params.phase ?? 0 },
    uIntensity: { value: intensity },
    uToneRGB:   { value: nmToRGB(toneNm) },
  };

  const material = makeAdditiveMat(uniforms, /* glsl */`
    // Spiral hue drift around torus driven by position
    vec3 base = uToneRGB;
    float swirl = 0.5 + 0.5*sin(0.8*uTime + uPhase + length(vPos)*2.0);
    vec3 rainbow = normalize(vec3(1.2*base.r + 0.6*swirl,
                                  1.2*base.g + 0.4*(1.0-swirl),
                                  1.2*base.b + 0.6*swirl));
    rainbow = clamp(rainbow, 0.0, 1.0);
    rainbow
  `);

  const mesh = new THREE.Mesh(geom, material);
  mesh.renderOrder = 2;
  mesh.userData.uniforms = uniforms;
  return mesh;
}

// --- Axis (Breath Line) ----------------------------------------------------
function createAxis(params){
  const { height=6.0, radius=0.02, toneNm=580, intensity=1 } = params;
  const geom = new THREE.CylinderGeometry(radius, radius, height, 16, 1, true);
  const uniforms = {
    uTime:      { value: 0 },
    uPhase:     { value: params.phase ?? 0 },
    uIntensity: { value: intensity*1.2 },
    uToneRGB:   { value: nmToRGB(toneNm) },
  };
  const mat = makeAdditiveMat(uniforms, /* glsl */`
    vec3 color = mix(vec3(1.0), uToneRGB, 0.25);
    color
  `);
  const beam = new THREE.Mesh(geom, mat);
  beam.rotateX(Math.PI/2.0); // vertical-through scene if Y-up camera
  beam.renderOrder = 1;
  beam.userData.uniforms = uniforms;
  return beam;
}

// --- Halo (Outer Possibility Field) ---------------------------------------
function createHalo(params){
  const { count=2400, radius=3.0, toneNm=580, intensity=1 } = params;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  for (let i=0;i<count;i++){
    const u = Math.random();
    const v = Math.random();
    const theta = 2*Math.PI*u;
    const phi   = Math.acos(2*v-1);
    const r = radius * (0.88 + 0.24*Math.random());
    pos[3*i+0] = r * Math.sin(phi) * Math.cos(theta);
    pos[3*i+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[3*i+2] = r * Math.cos(phi);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const uniforms = {
    uTime:      { value: 0 },
    uPhase:     { value: params.phase ?? 0 },
    uIntensity: { value: intensity*0.6 },
    uToneRGB:   { value: nmToRGB(toneNm) },
  };
  const mat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */`
      uniform float uTime; uniform float uPhase; varying float vFlick;
      void main(){
        vec3 p = position;
        float swell = 0.985 + 0.015*sin(uTime*0.25 + uPhase + length(p));
        p *= swell;
        vFlick = fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453);
        gl_PointSize = 1.5 + 1.5*vFlick;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uIntensity; uniform vec3 uToneRGB; varying float vFlick;
      void main(){
        float d = length(gl_PointCoord-0.5);
        float a = smoothstep(0.55, 0.0, d) * (0.5+0.5*vFlick) * uIntensity;
        gl_FragColor = vec4(uToneRGB, a);
      }
    `
  });
  const pts = new THREE.Points(g, mat);
  pts.renderOrder = 0;
  pts.userData.uniforms = uniforms;
  return pts;
}

// --- Audio (optional hum synced to tone) -----------------------------------
function addAudioSynth(){
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 220; // will be modulated
  gain.gain.value = 0.0;     // start muted; user can enable
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  return { ctx, osc, gain };
}

// --- Main factory ----------------------------------------------------------
export function createFunebraSoul(scene, opts={}){
  const defaults = {
    emotion: 'creation',
    toneNm: EmotionLUT.creation.toneNm,
    intensity: EmotionLUT.creation.intensity,
    phase: 0,
    majorRadius: 1.9,
    minorRadius: 0.55,
    haloRadius: 3.2,
    withAudio: false,
  };
  const params = Object.assign({}, defaults, opts);

  const group = new THREE.Group();

  const torus = createTorusMesh(params);
  const axis  = createAxis({ ...params, height: params.majorRadius*3.2, radius: 0.03 });
  const halo  = createHalo({ ...params, radius: params.haloRadius });

  group.add(halo); group.add(axis); group.add(torus);

  if (scene) scene.add(group);

  let audio = null;
  if (params.withAudio){
    audio = addAudioSynth();
  }

  const api = {
    group,
    params,
    audio,
    update(dt){
      const t = (group.userData.time = (group.userData.time||0) + dt);
      [torus, axis, halo].forEach(obj=>{
        const u = obj.userData.uniforms; if (!u) return;
        u.uTime.value = t;
      });
      // gentle rotation — self-reference loop
      group.rotation.z += 0.05*dt;
      group.rotation.x += 0.02*dt;
      // audio modulation
      if (audio){
        const base = 120 + 0.6*(params.toneNm - 380); // rough map nm→Hz range
        audio.osc.frequency.value = base + 20*Math.sin(t*0.6 + params.phase);
        audio.gain.gain.value = 0.05 * params.intensity;
      }
    },
  };

  // attach handy handles
  group.userData.api = api;
  return api;
}

export function updateFunebraSoul(soul, opts={}){
  if (!soul || !soul.group) return;
  Object.assign(soul.params, opts);
  const tone = nmToRGB(soul.params.toneNm);
  soul.group.traverse(o=>{
    const u = o.userData && o.userData.uniforms; if (!u) return;
    u.uPhase.value = soul.params.phase || 0;
    u.uIntensity.value = soul.params.intensity || 1;
    u.uToneRGB.value = tone;
  });
}

// --- Example (for host integration) ---------------------------------------
// import { createFunebraSoul, EmotionLUT } from './funebra-soul.module.js';
// const soul = createFunebraSoul(scene, { emotion:'hope', ...EmotionLUT.hope, withAudio:true });
// in your render loop: soul.update(deltaSeconds);
