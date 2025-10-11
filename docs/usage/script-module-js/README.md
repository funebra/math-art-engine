<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "funebra": "/path/to/script.module.js"
  }
}
</script>

<script type="module">
  import * as THREE from "three";
  import Funebra, { surfaces, makeParametric3D } from "funebra";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 3);
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  const torus = surfaces.torus({ R:1.15, r:0.44 });
  const geo = makeParametric3D(torus, { nu:420, nv:180 });
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ roughness:.45, metalness:.1 }));
  scene.add(mesh);

  renderer.setAnimationLoop(()=>{ mesh.rotation.y += 0.01; renderer.render(scene, camera); });
</script>
