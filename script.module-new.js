// /realism/index.module.js
// Funebra Realism Kit: geometry detail, PBR, data loaders, lighting helpers.
// Assumes an import map for three + three/addons (GLTFLoader, OBJLoader, RGBELoader).

import * as THREE from "three";

// ───────────────────────────────────────────────────────────────────────────────
// 1) ADVANCED MESH GENERATION & DETAIL
// ───────────────────────────────────────────────────────────────────────────────

// 1.a) Catmull–Clark Subdivision (quad-friendly / “good enough” small-iter)
export function subdivideCatmullClark(geometry, iterations = 1) {
  // Works best on BufferGeometry comprised of quads or near-quad topology.
  // For non-quad meshes, we split triangles into pseudo-quads on the fly.
  // NOTE: This is intentionally minimal; for production, consider a robust lib.
  const toIndexed = geometry.index ? geometry.clone() : geometry.toNonIndexed();
  let geo = toIndexed;

  for (let it = 0; it < iterations; it++) {
    const pos = geo.attributes.position.array;
    const idx = geo.index ? geo.index.array : [...Array(pos.length / 3).keys()];

    // Build adjacency
    const vertFaces = new Map();   // v -> [faceIndices]
    const edges = new Map();       // "a_b" (a<b) -> { a,b, faces:Set }
    const faces = [];              // array of [a,b,c,(d?)]

    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i], b = idx[i+1], c = idx[i+2];

      // Split triangle into 3 quads in CC? Instead, treat as tri-face (we’ll weight accordingly).
      faces.push([a,b,c]);

      [a,b,c].forEach(v=>{
        if (!vertFaces.has(v)) vertFaces.set(v, []);
        vertFaces.get(v).push(faces.length-1);
      });

      const addEdge = (u,v,f) => {
        const key = u<v ? `${u}_${v}` : `${v}_${u}`;
        if (!edges.has(key)) edges.set(key, {a:Math.min(u,v), b:Math.max(u,v), faces:new Set()});
        edges.get(key).faces.add(f);
      };
      addEdge(a,b,faces.length-1);
      addEdge(b,c,faces.length-1);
      addEdge(c,a,faces.length-1);
    }

    // Face points (centroids)
    const facePoints = faces.map(f=>{
      const p = new THREE.Vector3();
      f.forEach(vi=>{
        p.x += pos[3*vi+0];
        p.y += pos[3*vi+1];
        p.z += pos[3*vi+2];
      });
      p.multiplyScalar(1/f.length);
      return p;
    });

    // Edge points (avg of endpoints + avg of adjacent face points)
    const edgePointIndex = new Map(); // edgeKey -> new index
    const newPositions = [];
    const pushV = v => { newPositions.push(v.x, v.y, v.z); return (newPositions.length/3)-1; };

    edges.forEach((E, key)=>{
      const va = new THREE.Vector3(pos[3*E.a], pos[3*E.a+1], pos[3*E.a+2]);
      const vb = new THREE.Vector3(pos[3*E.b], pos[3*E.b+1], pos[3*E.b+2]);

      const fAvg = new THREE.Vector3();
      const fArr = Array.from(E.faces);
      fArr.forEach(fi => fAvg.add(facePoints[fi]));
      fAvg.multiplyScalar(1/Math.max(1,fArr.length));

      const ep = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5).addScaledVector(fAvg, 0.5);
      const eid = pushV(ep);
      edgePointIndex.set(key, eid);
    });

    // New vertex points (CC rule)
    const vertexPointIndex = new Map(); // oldV -> new index
    vertFaces.forEach((fList, v)=>{
      const P = new THREE.Vector3(pos[3*v], pos[3*v+1], pos[3*v+2]);
      const n = fList.length;

      // Average of face points around v
      const F = new THREE.Vector3();
      fList.forEach(fi => F.add(facePoints[fi]));
      F.multiplyScalar(1/n);

      // Average of midpoints of edges incident to v
      const R = new THREE.Vector3();
      // get neighbor vertices via faces
      const nbrs = new Set();
      fList.forEach(fi=>{
        faces[fi].forEach(u=>{ if(u!==v) nbrs.add(u); });
      });
      nbrs.forEach(u=>{
        const M = new THREE.Vector3(
          0.5*(pos[3*v]+pos[3*u]),
          0.5*(pos[3*v+1]+pos[3*u+1]),
          0.5*(pos[3*v+2]+pos[3*u+2])
        );
        R.add(M);
      });
      R.multiplyScalar(1/Math.max(1,nbrs.size));

      // New position
      // CC formula: P' = (F + 2R + (n-3)P) / n
      const Pp = new THREE.Vector3()
        .add(F)
        .addScaledVector(R, 2)
        .addScaledVector(P, (n-3))
        .multiplyScalar(1/n);

      const vid = pushV(Pp);
      vertexPointIndex.set(v, vid);
    });

    // Rebuild faces as smaller faces (tri support: split into 3 quads as tris->fan)
    const newIndices = [];

    const getEdgeIdx = (u,v) => {
      const key = u<v ? `${u}_${v}` : `${v}_${u}`;
      return edgePointIndex.get(key);
    };

    faces.forEach((f, fi)=>{
      // For tri: a,b,c
      const [a,b,c] = f;
      const fa = facePoints[fi]; // not used directly; we didn’t assign it an index—create now:
      const fIdx = pushV(fa);

      const va = vertexPointIndex.get(a);
      const vb = vertexPointIndex.get(b);
      const vc = vertexPointIndex.get(c);

      const eab = getEdgeIdx(a,b);
      const ebc = getEdgeIdx(b,c);
      const eca = getEdgeIdx(c,a);

      // Create 3 quads as 3 triangles fans to keep BufferGeometry simple (triangles):
      // Quad around edge AB: (va, eab, fIdx) & (va, fIdx, eca) style – keep consistent winding
      newIndices.push(va, eab, fIdx);
      newIndices.push(va, fIdx, eca);

      newIndices.push(vb, ebc, fIdx);
      newIndices.push(vb, fIdx, eab);

      newIndices.push(vc, eca, fIdx);
      newIndices.push(vc, fIdx, ebc);
    });

    geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(newPositions, 3));
    geo.setIndex(newIndices);
    geo.computeVertexNormals();
  }

  return geo;
}

// 1.b) Noise (Perlin + fBm) and vertex displacement
export function perlin3(x, y, z) {
  // Classic Perlin (small JS impl). For performance in big meshes consider a typed-fast version.
  const p = new Uint8Array(512);
  if (!perlin3._init) {
    const perm = new Uint8Array(256);
    for (let i=0;i<256;i++) perm[i]=i;
    for (let i=255;i>0;i--) { const j = (Math.random()*256)|0; [perm[i],perm[j]]=[perm[j],perm[i]]; }
    for (let i=0;i<512;i++) p[i] = perm[i & 255];
    perlin3._p = p; perlin3._init = true;
  } else {
    p.set(perlin3._p);
  }
  const fade = t=>t*t*t*(t*(t*6-15)+10);
  const lerp = (a,b,t)=>a + t*(b-a);
  const grad = (h, x, y, z) => {
    const u = (h&1)?x:-x, v = (h&2)?y:-y, w = (h&4)?z:-z;
    return ((h&1)?u:-u) + ((h&2)?v:-v) + ((h&4)?w:-w);
  };
  const X = Math.floor(x)&255, Y = Math.floor(y)&255, Z = Math.floor(z)&255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u=fade(x), v=fade(y), w=fade(z);
  const A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z;
  const B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
  return lerp(
    lerp(
      lerp(grad(p[AA], x, y, z),     grad(p[BA], x-1, y, z),     u),
      lerp(grad(p[AB], x, y-1, z),   grad(p[BB], x-1, y-1, z),   u), v
    ),
    lerp(
      lerp(grad(p[AA+1], x, y, z-1), grad(p[BA+1], x-1, y, z-1), u),
      lerp(grad(p[AB+1], x, y-1, z-1),grad(p[BB+1], x-1, y-1, z-1),u), v
    ), w
  );
}
export function fbm3(x,y,z, {octaves=5, gain=0.5, lacunarity=2.0}={}) {
  let amp=1, freq=1, sum=0, norm=0;
  for (let i=0;i<octaves;i++) {
    sum += amp * perlin3(x*freq, y*freq, z*freq);
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  return sum / Math.max(1e-6, norm);
}

export function displaceVertices(geometry, fn, scale=1) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i=0;i<pos.count;i++) {
    v.fromBufferAttribute(pos, i);
    const n = fn(v.x, v.y, v.z);
    v.addScaledVector(geometry.attributes.normal
      ? new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, i)
      : new THREE.Vector3(0,1,0),
      n*scale
    );
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// 1.c) Simple procedural texture generators (canvas based)
export function makeWoodTexture({size=512, rings=12, noise=0.15}={}) {
  const c=document.createElement("canvas"); c.width=c.height=size;
  const ctx=c.getContext("2d");
  const cx=size/2, cy=size/2, maxR=Math.hypot(cx,cy);
  const img=ctx.createImageData(size,size);
  for (let y=0;y<size;y++){
    for (let x=0;x<size;x++){
      const dx=x-cx, dy=y-cy;
      const r = Math.sqrt(dx*dx+dy*dy)/maxR;
      const v = Math.sin(rings*Math.PI*r + 4*perlin3(x*0.02,y*0.02,0)*noise);
      const base = 140 + 60*v;
      const i = (y*size+x)*4;
      img.data[i]=base+20; img.data[i+1]=base; img.data[i+2]=base-30; img.data[i+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
  return new THREE.CanvasTexture(c);
}

// 1.d) Boolean ops (CSG) – pluggable adapter with graceful fallback
export async function csg(op, aMesh, bMesh) {
  // op: "union" | "subtract" | "intersect"
  // Adapter prefers three-bvh-csg if available; otherwise throws with hint.
  try {
    const { CSG } = await import('https://unpkg.com/three-bvh-csg@0.0.10/dist/index.module.js');
    const A = CSG.fromMesh(aMesh), B = CSG.fromMesh(bMesh);
    let R;
    if (op==="union") R = CSG.union(A,B);
    else if (op==="subtract") R = CSG.subtract(A,B);
    else if (op==="intersect") R = CSG.intersect(A,B);
    else throw new Error(`Unknown op: ${op}`);
    const out = CSG.toMesh(R, aMesh.matrixWorld);
    out.material = aMesh.material.clone();
    out.geometry.computeVertexNormals();
    return out;
  } catch (e) {
    throw new Error(`CSG adapter not found. Add three-bvh-csg via import map or CDN. Original: ${e.message}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 2) PBR SHADING & MATERIAL HELPERS
// ───────────────────────────────────────────────────────────────────────────────

export function makePBRMaterial({
  color=0xffffff,
  metalness=0.0,
  roughness=0.5,
  map=null, normalMap=null, roughnessMap=null, aoMap=null, metalnessMap=null,
  envMap=null, envMapIntensity=1.0
}={}) {
  const m = new THREE.MeshStandardMaterial({
    color, metalness, roughness, map, normalMap, roughnessMap, aoMap, metalnessMap, envMap
  });
  m.envMapIntensity = envMapIntensity;
  return m;
}

export function applyWeightedNormals(geometry, creaseAngleDeg=60) {
  // Simple angle-based normal weighting. Keeps sharp edges crisp, smooths the rest.
  geometry = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geometry.attributes.position;
  const normals = new Float32Array(pos.count*3);
  const crease = Math.cos(THREE.MathUtils.degToRad(creaseAngleDeg));

  // Build face normals
  for (let i=0;i<pos.count;i+=3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i+0);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i+1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i+2);
    const n = new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();
    normals[3*(i+0)+0]+=n.x; normals[3*(i+0)+1]+=n.y; normals[3*(i+0)+2]+=n.z;
    normals[3*(i+1)+0]+=n.x; normals[3*(i+1)+1]+=n.y; normals[3*(i+1)+2]+=n.z;
    normals[3*(i+2)+0]+=n.x; normals[3*(i+2)+1]+=n.y; normals[3*(i+2)+2]+=n.z;
  }

  // (Minimal version) Normalize per-vertex; for full weighted groups you’d need a vertex-sharing map + angle tests.
  for (let i=0;i<pos.count;i++) {
    const n = new THREE.Vector3(normals[3*i], normals[3*i+1], normals[3*i+2]).normalize();
    normals[3*i]=n.x; normals[3*i+1]=n.y; normals[3*i+2]=n.z;
  }

  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals,3));
  return geometry;
}

export async function loadPBRTextureSet({
  baseUrl, // e.g., '/assets/pbr/brick'
  exts = { color:'_albedo.jpg', normal:'_normal.jpg', roughness:'_rough.jpg', ao:'_ao.jpg', metalness:'_metal.jpg' }
}) {
  const loader = new THREE.TextureLoader();
  const out = {};
  const tryLoad = async (key, file) => {
    try { out[key] = await new Promise((res,rej)=>loader.load(`${baseUrl}${file}`,res,undefined,rej)); }
    catch { out[key] = null; }
  };
  await Promise.all([
    tryLoad('map', exts.color),
    tryLoad('normalMap', exts.normal),
    tryLoad('roughnessMap', exts.roughness),
    tryLoad('aoMap', exts.ao),
    tryLoad('metalnessMap', exts.metalness),
  ]);
  Object.values(out).forEach(t=>{ if(t){ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=8; }});
  return out;
}

// ───────────────────────────────────────────────────────────────────────────────
// 3) DATA INTEGRATION (LOADERS) & NON-PARAMETRIC GEOMETRY
// ───────────────────────────────────────────────────────────────────────────────

export async function loadGLTF(url) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  return await new Promise((res, rej)=> loader.load(url, res, undefined, rej));
}

export async function loadOBJ(url) {
  const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
  const loader = new OBJLoader();
  return await new Promise((res, rej)=> loader.load(url, res, undefined, rej));
}

// Heightmap -> Terrain mesh
export async function makeTerrainFromHeightmap(src, {
  widthSegments=256, heightSegments=256,
  sizeX=10, sizeY=10, heightScale=2.5,
  smoothIterations=0
}={}) {
  const img = await loadImage(src);
  const { w, h, data } = imageToGrayscale(img);

  const geo = new THREE.PlaneGeometry(sizeX, sizeY, widthSegments, heightSegments);
  geo.rotateX(-Math.PI/2);

  const pos = geo.attributes.position;
  for (let iy=0; iy<=heightSegments; iy++) {
    for (let ix=0; ix<=widthSegments; ix++) {
      const u = ix/widthSegments, v = iy/heightSegments;
      const x = Math.floor(u*(w-1)), y = Math.floor(v*(h-1));
      const k = (y*w + x);
      const height = data[k] / 255; // 0..1
      const idx = iy*(widthSegments+1) + ix;
      const yPos = height*heightScale;
      const vx = pos.getX(idx), vz = pos.getZ(idx);
      pos.setXYZ(idx, vx, yPos, vz);
    }
  }

  // Optional smoothing (simple Laplacian passes)
  for (let s=0;s<smoothIterations;s++){
    const tmp = new Float32Array(pos.array);
    for (let iy=1; iy<heightSegments; iy++) {
      for (let ix=1; ix<widthSegments; ix++) {
        const idx = iy*(widthSegments+1)+ix;
        const n = idx-(widthSegments+1), sI = idx+(widthSegments+1), wI = idx-1, eI = idx+1;
        const avg = (tmp[3*n+1]+tmp[3*sI+1]+tmp[3*wI+1]+tmp[3*eI+1]+tmp[3*idx+1]) / 5;
        pos.setY(idx, avg);
      }
    }
  }
  geo.computeVertexNormals();
  return geo;
}
function loadImage(src) {
  return new Promise((res, rej)=>{
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload=()=>res(img); img.onerror=rej; img.src=src;
  });
}
function imageToGrayscale(img){
  const c=document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight;
  const ctx=c.getContext("2d"); ctx.drawImage(img,0,0);
  const { data, width:w, height:h } = ctx.getImageData(0,0,c.width,c.height);
  const out = new Uint8Array(w*h);
  for (let i=0;i<w*h;i++){
    const r=data[4*i], g=data[4*i+1], b=data[4*i+2];
    out[i] = (0.2126*r + 0.7152*g + 0.0722*b)|0;
  }
  return { w, h, data:out };
}

// ───────────────────────────────────────────────────────────────────────────────
// 4) LIGHTING, ENVIRONMENT, & SHADOWS
// ───────────────────────────────────────────────────────────────────────────────

export async function loadHDRAsEnvMap(renderer, scene, url, {exposure=1.0, background=true}={}) {
  const { RGBELoader } = await import("three/addons/loaders/RGBELoader.js");
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const hdr = await new Promise((res,rej)=> new RGBELoader().setDataType(THREE.FloatType).load(url, res, undefined, rej));
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose(); pmrem.dispose();

  scene.environment = envMap;
  if (background) scene.background = envMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  return envMap;
}

export function addSunLight(scene, {
  intensity=3.0,
  position=new THREE.Vector3(10,20,10),
  castShadow=true,
  shadowMapSize=2048,
  shadowBias=-0.0001
}={}) {
  const sun = new THREE.DirectionalLight(0xffffff, intensity);
  sun.position.copy(position);
  sun.castShadow = !!castShadow;
  if (castShadow) {
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sun.shadow.bias = shadowBias;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
  }
  scene.add(sun);
  return sun;
}

export function enableRendererShadows(renderer, {type="PCFSoft"}={}) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = (type==="PCFSoft") ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  return renderer;
}

// ───────────────────────────────────────────────────────────────────────────────
// Utility: quick “make it real” preset for a mesh
// ───────────────────────────────────────────────────────────────────────────────
export function makeMeshShadowReady(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Default export to keep DX nice in your app
export default {
  // Geometry
  subdivideCatmullClark, perlin3, fbm3, displaceVertices, makeWoodTexture, csg,
  // PBR
  makePBRMaterial, applyWeightedNormals, loadPBRTextureSet,
  // Data
  loadGLTF, loadOBJ, makeTerrainFromHeightmap,
  // Lighting
  loadHDRAsEnvMap, addSunLight, enableRendererShadows, makeMeshShadowReady
};
