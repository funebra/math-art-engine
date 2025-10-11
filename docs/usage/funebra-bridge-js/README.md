<!-- THREE as a global for your existing script.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js"></script>

<!-- Your current non-module file -->
<script src="https://funebra.github.io/math-art-engine/script.js"></script>

<!-- Now “import” it like a module anywhere -->
<script type="module">
  import Funebra, { polygonX } from "https://funebra.github.io/math-art-engine/funebra-bridge.mjs";

  const torus = Funebra.surfaces.torus({ R:1.2, r:0.4 });
  const geo = Funebra.makeParametric3D(torus, { nu:256, nv:128 });

  console.log("poly test:", polygonX(17, 6, 120, 300, 40));
</script>
