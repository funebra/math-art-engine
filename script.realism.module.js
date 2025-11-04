// /realism/advanced.module.js
// Extends the earlier Realism Kit with voxelization, LOD, SSS helpers, volumetrics,
// camera realism, basic caustics, Worley noise, and node-based procedural starters.

import * as THREE from "three";

// ───────────────────────────────────────────────────────────────────────────────
// 0) NOISE: Worley (a.k.a. cellular) + helpers for micro detail
// ───────────────────────────────────────────────────────────────────────────────

export function makeWorley3(seed = 1337, cells = 8) {
  // Basic 3D Worley noise: returns distance to nearest feature point in unit cube tiling.
  // For simplicity we seed pseudo-randomly per cell using a hash.
  const hash = (x,y,z)=>{
    let h = x*374761393 + y*668265263 + z*2147483647 + seed;
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) >>> 0;
  };
  const rand3 = (i,j,k)=>{
    const h = hash(i,j,k);
    // deterministic pseudo-rand in [0,1)
    const r = (n)=>(((h >> (n*8)) & 255) / 256);
    return new THREE.Vector3(r(0), r(1), r(2));
  };

  return function worley(x,y,z) {
    x *= cells; y *= cells; z *= cells;
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let dmin = 1e9;
    // check current cell and neighbors (3x3x3)
    for (let dz=-1; dz<=1; dz++)
      for (let dy=-1; dy<=1; dy++)
        for (let dx=-1; dx<=1; dx++) {
          const cx = ix+dx, cy = iy+dy, cz = iz+dz;
          const f = rand3(cx,cy,cz);
          const fx = cx + f.x, fy = cy + f.y, fz = cz + f.z;
          const dxr = x - fx, dyr = y - fy, dzr = z - fz;
          const d = Math.sqrt(dxr*dxr + dyr*dyr + dzr*dzr);
          if (d < dmin) dmin = d;
        }
    // Normalize roughly: max distance within cell neighborhood is ~1.732
    return Math.min(dmin, 1.732) / 1.732;
  };
}

// Micro-displacement with mixed Perlin + Worley
export function microDisplace(geometry, {
  perlinFn, worleyFn,
  perlinWeight=0.6, worleyWeight=0.4,
  freq=2.0, scale=0.02
}){
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i=0;i<pos.count;i++){
    v.fromBufferAttribute(pos, i);
    nrm ? n.fromBufferAttribute(nrm, i) : n.set(0,1,0);
    const p = perlinFn ? perlinFn(v.x*freq, v.y*freq, v.z*freq) : 0;
    const w = worleyFn ? worleyFn(v.x*freq, v.y*freq, v.z*freq) : 0;
    const h = perlinWeight*p + worleyWeight*(1.0 - w); // crevices from Worley
    pos.setXYZ(i, v.x + n.x*h*scale, v.y + n.y*h*scale, v.z + n.z*h*scale);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ───────────────────────────────────────────────────────────────────────────────
// 1) VOXELIZATION & MARCHING CUBES (density → mesh)
// ───────────────────────────────────────────────────────────────────────────────

export function marchingCubesFromDensity({
  densityFn, // (x,y,z)-> float; iso-surface where value === iso
  iso=0.0,
  bounds = { min:new THREE.Vector3(-1,-1,-1), max:new THREE.Vector3(1,1,1) },
  resolution = 48
}){
  // Lightweight MC: CPU-side for prototyping. For heavy fields, move to a worker or GPU.
  const {min, max} = bounds;
  const nx=resolution, ny=resolution, nz=resolution;
  const dx = (max.x - min.x) / (nx-1);
  const dy = (max.y - min.y) / (ny-1);
  const dz = (max.z - min.z) / (nz-1);

  // sample grid
  const field = new Float32Array(nx*ny*nz);
  let ptr = 0;
  for (let k=0;k<nz;k++){
    const z = min.z + k*dz;
    for (let j=0;j<ny;j++){
      const y = min.y + j*dy;
      for (let i=0;i<nx;i++){
        const x = min.x + i*dx;
        field[ptr++] = densityFn(x,y,z);
      }
    }
  }

  // MC tables (shortened import)
  const { edgeTable, triTable } = MC_TABLES(); // see helper below

  const positions = [];
  const gridP = (i,j,k)=> field[(k*ny + j)*nx + i];

  const vertLerp = (p1,p2,valp1,valp2)=>{
    const t = (iso - valp1) / (valp2 - valp1 + 1e-12);
    return new THREE.Vector3(
      p1.x + t*(p2.x - p1.x),
      p1.y + t*(p2.y - p1.y),
      p1.z + t*(p2.z - p1.z)
    );
  };

  const v3 = (i,j,k)=> new THREE.Vector3(min.x + i*dx, min.y + j*dy, min.z + k*dz);

  for (let k=0;k<nz-1;k++){
    for (let j=0;j<ny-1;j++){
      for (let i=0;i<nx-1;i++){
        // cube corners
        const p = [
          v3(i,j,k),     v3(i+1,j,k),
          v3(i+1,j+1,k), v3(i,j+1,k),
          v3(i,j,k+1),   v3(i+1,j,k+1),
          v3(i+1,j+1,k+1), v3(i,j+1,k+1)
        ];
        const val = [
          gridP(i,j,k),     gridP(i+1,j,k),
          gridP(i+1,j+1,k), gridP(i,j+1,k),
          gridP(i,j,k+1),   gridP(i+1,j,k+1),
          gridP(i+1,j+1,k+1), gridP(i,j+1,k+1)
        ];
        // cube index
        let cubeIndex = 0;
        for (let c=0;c<8;c++) if (val[c] < iso) cubeIndex |= (1<<c);
        const eMask = edgeTable[cubeIndex];
        if (!eMask) continue;

        const vlist = Array(12).fill(null);
        const E = (a,b,eIndex)=> vlist[eIndex] = vertLerp(p[a], p[b], val[a], val[b]);

        // interpolate edges (see standard MC edge order)
        if (eMask & 1)   E(0,1,0);
        if (eMask & 2)   E(1,2,1);
        if (eMask & 4)   E(2,3,2);
        if (eMask & 8)   E(3,0,3);
        if (eMask & 16)  E(4,5,4);
        if (eMask & 32)  E(5,6,5);
        if (eMask & 64)  E(6,7,6);
        if (eMask & 128) E(7,4,7);
        if (eMask & 256) E(0,4,8);
        if (eMask & 512) E(1,5,9);
        if (eMask & 1024)E(2,6,10);
        if (eMask & 2048)E(3,7,11);

        const T = triTable[cubeIndex];
        for (let t=0; T[t] !== -1; t+=3){
          const a=vlist[T[t]], b=vlist[T[t+1]], c=vlist[T[t+2]];
          positions.push(a.x,a.y,a.z, b.x,b.y,b.z, c.x,c.y,c.z);
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

// Tiny lookup (edgeTable/triTable). For brevity, generate them here.
function MC_TABLES(){
  // In production, import precomputed arrays. Here we inline minimal constants.
  // (Omitted long arrays for space—replace with your existing MC tables if you have them.)
  // To keep the snippet short, we provide *very* compact tables via a CDN-free function:
  // -> For your repo, drop in the standard arrays from any public-domain MC table.
  // For now, throw to remind replacement if missing:
  throw new Error("Insert standard Marching Cubes edgeTable & triTable here (public-domain tables).");
}

// ───────────────────────────────────────────────────────────────────────────────
// 2) LOD (Level of Detail) — auto-simplify big meshes
// ───────────────────────────────────────────────────────────────────────────────

export async function makeLOD(mesh, {
  levels = [1.0, 0.5, 0.25], // fractions of original face count
  screenSpaceDistances = [0, 30, 60]
}){
  const { SimplifyModifier } = await import("three/addons/modifiers/SimplifyModifier.js");
  const lod = new THREE.LOD();
  const baseGeo = mesh.geometry.index ? mesh.geometry.clone() : mesh.geometry.toNonIndexed();
  const mod = new SimplifyModifier();

  const triCount = baseGeo.getIndex() ? baseGeo.getIndex().count/3 : baseGeo.attributes.position.count/3;

  levels.forEach((fraction, i)=>{
    const target = Math.max(3, Math.floor(triCount * fraction));
    const g = mod.modify(baseGeo.clone(), target);
    const m = new THREE.Mesh(g, mesh.material);
    m.castShadow = mesh.castShadow; m.receiveShadow = mesh.receiveShadow;
    lod.addLevel(m, screenSpaceDistances[i] || (i*30));
  });

  return lod;
}

// ───────────────────────────────────────────────────────────────────────────────
// 3) PBR++: Physical material presets (clearcoat, sheen, glass/transmission)
//     + SSS (approximate) using thickness & wrap lighting
// ───────────────────────────────────────────────────────────────────────────────

export function makePhysical({
  color=0xffffff, roughness=0.5, metalness=0.0,
  clearcoat=0.0, clearcoatRoughness=0.03,
  sheen=0.0, sheenColor=0xffffff, sheenRoughness=0.5,
  transmission=0.0, ior=1.5, thickness=0.0, attenuationColor=0xffffff, attenuationDistance=0.0,
  maps={} // { map, normalMap, roughnessMap, metalnessMap, aoMap, clearcoatNormalMap, sheenColorMap, thicknessMap }
}={}){
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness, metalness,
    clearcoat, clearcoatRoughness,
    sheen, sheenColor: new THREE.Color(sheenColor), sheenRoughness,
    transmission, ior, thickness,
    attenuationColor: new THREE.Color(attenuationColor), attenuationDistance,
    ...maps
  });
  return m;
}

// Very compact SSS approximation (screen-space independent):
// - uses thicknessMap + "wrap lighting" for softer diffuse
export function applySSSApprox(material, {
  thicknessMap=null,
  thickness=0.5,
  wrap=0.5 // 0..1, pushes light around the terminator
}={}){
  material.thickness = thickness;
  if (thicknessMap) material.thicknessMap = thicknessMap;
  // "wrap lighting" hack via onBeforeCompile
  material.onBeforeCompile = (shader)=>{
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      `
      #include <lights_physical_fragment>
      // wrap lighting: bias NdotL
      float wrapK = ${wrap.toFixed(3)};
      RE_Direct_Physical( directLight, geometry, material, reflectedLight );
      `
    );
  };
  material.needsUpdate = true;
  return material;
}

// ───────────────────────────────────────────────────────────────────────────────
// 4) ENV & VOLUMETRICS
// ───────────────────────────────────────────────────────────────────────────────

export function addVolumetricFog(scene, {
  color = 0x0b0c10,
  density = 0.015 // FogExp2 style
}={}){
  const fog = new THREE.FogExp2(color, density);
  scene.fog = fog;
  return fog;
}

// Simple “god rays” / light shafts via postprocessing
export async function addGodRays(composer, {
  lightSource, // THREE.Mesh or sprite that marks the light position in screen space
  exposure=0.6, decay=0.95, density=0.9, weight=0.4, samples=60, clampMax=1.0
}){
  const { GodRaysPass } = await import('three/addons/postprocessing/GodRaysPass.js');
  const pass = new GodRaysPass(lightSource, {
    exposure, decay, density, weight, samples, clampMax
  });
  composer.addPass(pass);
  return pass;
}

// ───────────────────────────────────────────────────────────────────────────────
// 5) CAMERA REALISM (Depth of Field, film grain, slight chromatic aberration)
// ───────────────────────────────────────────────────────────────────────────────

export async function makePostFX(renderer, scene, camera, {
  dof=true, focus=3.0, aperture=0.00012, maxBlur=0.01,
  grain=true, aberration=true
}={}){
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { BokehPass } = await import('three/addons/postprocessing/BokehPass.js');
  const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
  const { FXAAShader } = await import('three/addons/shaders/FXAAShader.js');

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  if (dof) {
    composer.addPass(new BokehPass(scene, camera, {
      focus, aperture, maxblur: maxBlur
    }));
  }

  if (aberration) {
    // Tiny chromatic aberration shader
    const AberrationShader = {
      uniforms: { tDiffuse:{value:null}, power:{value:0.0015} },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*position; }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float power; varying vec2 vUv;
        void main(){
          vec2 dir = (vUv - 0.5) * power * 400.0;
          vec4 c;
          c.r = texture2D(tDiffuse, vUv + dir*0.50).r;
          c.g = texture2D(tDiffuse, vUv).g;
          c.b = texture2D(tDiffuse, vUv - dir*0.50).b;
          c.a = 1.0;
          gl_FragColor = c;
        }
      `
    };
    composer.addPass(new ShaderPass(AberrationShader));
  }

  if (grain) {
    const GrainShader = {
      uniforms: { tDiffuse:{value:null}, time:{value:0.0}, amount:{value:0.035} },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*position; }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float time; uniform float amount; varying vec2 vUv;
        float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec4 col = texture2D(tDiffuse, vUv);
          float n = rand(vUv * (time*60.0)) * amount;
          gl_FragColor = vec4(col.rgb + n, col.a);
        }
      `
    };
    const grainPass = new ShaderPass(GrainShader);
    composer.addPass(grainPass);
    composer._grainPass = grainPass; // expose for time update
  }

  // FXAA last
  const fxaa = new ShaderPass(FXAAShader);
  const dpr = Math.min(2, renderer.getPixelRatio());
  fxaa.material.uniforms['resolution'].value.set(1/(window.innerWidth*dpr), 1/(window.innerHeight*dpr));
  composer.addPass(fxaa);

  return composer;
}

// Make sure to tick time for grain
export function tickComposerTime(composer, dt){
  if (composer._grainPass) {
    composer._grainPass.material.uniforms.time.value += dt;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 6) SIMPLE CAUSTICS PROJECTOR (cheap but effective for water/glass vibes)
// ───────────────────────────────────────────────────────────────────────────────

export function makeCausticsProjector({
  size=512, speed=0.2, intensity=0.7
}={}){
  // Animated caustics texture via layered sin noise → use as light cookie or emissive map
  const c = document.createElement('canvas'); c.width=c.height=size;
  const ctx = c.getContext('2d');
  let t = 0;

  const update = (dt)=>{
    t += dt*speed;
    const img = ctx.createImageData(size,size);
    for (let y=0;y<size;y++){
      for (let x=0;x<size;x++){
        const u = x/size, v=y/size;
        const val =
          0.5 + 0.5*Math.sin( (u*20.0 + 0.7*Math.sin(v*10.0+t))*2.0 ) *
          Math.cos( (v*22.0 + 0.6*Math.sin(u*8.0 - t))*2.0 );
        const k = Math.pow(val, 6.0) * intensity * 255;
        const i = (y*size + x)*4;
        img.data[i]=k; img.data[i+1]=k; img.data[i+2]=k; img.data[i+3]=255;
      }
    }
    ctx.putImageData(img,0,0);
    tex.needsUpdate = true;
  };

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  // Provide a “light mesh” that can project this via emissive or as a cookie
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(10,10), mat);
  quad.userData.updateCaustics = update;
  quad.visible = false; // use the texture elsewhere, or set true to visualize
  return { texture: tex, mesh: quad, update };
}

// ───────────────────────────────────────────────────────────────────────────────
// 7) NODE-BASED PROCEDURAL STARTER (Three Nodes)
// ───────────────────────────────────────────────────────────────────────────────

export async function makeNodeProceduralMaterial() {
  // A tiny nodes graph: blended Perlin/Worley → normal perturb → roughness var
  const THREE_NODES = await import('three/addons/nodes/Nodes.js');
  const { MeshStandardNodeMaterial, uv, snoise2D, mix, vec2, float, normalMap } = THREE_NODES;

  const uvNode = uv();
  const n1 = snoise2D( uvNode.mul( float(8.0) ) );
  const n2 = snoise2D( uvNode.mul( float(16.0) ).add( vec2(0.123,0.789) ) );
  const h  = mix(n1, n2, float(0.5));          // height-ish
  const nrm = normalMap( vec2( h, h.mul(float(-1.0)) ).mul( float(0.8) ), float(1.0) );

  const mat = new MeshStandardNodeMaterial();
  mat.roughnessNode = mix( float(0.35), float(0.85), h.abs() );
  mat.normalNode = nrm;
  return mat;
}

export default {
  // noise
  makeWorley3, microDisplace,
  // voxels
  marchingCubesFromDensity,
  // lod
  makeLOD,
  // materials
  makePhysical, applySSSApprox,
  // env & volumetrics & post
  addVolumetricFog, addGodRays, makePostFX, tickComposerTime,
  // caustics
  makeCausticsProjector,
  // nodes
  makeNodeProceduralMaterial
};
