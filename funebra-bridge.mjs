// Tiny ES module bridge around the existing global Funebra + globals.
//
// Load order in your HTML:
//   <script src="https://funebra.github.io/math-art-engine/script.js"></script>
//   <script type="module" src="/path/to/funebra-bridge.mjs"></script>
//
// Then elsewhere (also type="module"):
//   import Funebra, { polygonX, heart2D_x } from "/path/to/funebra-bridge.mjs";
//   const geo = Funebra.makeParametric3D(Funebra.surfaces.torus({R:1.2, r:0.4}));

const g = globalThis;

// Export the global Funebra object (created by your IIFE in script.js)
const Funebra = g.Funebra || {};
export default Funebra;

// Re-export your common helpers if they exist globally.
// (This lets you do: import { polygonX } from "./funebra-bridge.mjs")
export const polygonX   = g.polygonX;
export const polygonY   = g.polygonY;
export const starX      = g.starX;
export const starY      = g.starY;
export const squareWave = g.squareWave;
export const wave       = g.wave;
export const waveX      = g.waveX;
export const waveY      = g.waveY;
export const curwaveX   = g.curwaveX;
export const curwaveY   = g.curwaveY;
export const triX       = g.triX;
export const triY       = g.triY;
export const cube       = g.cube;
export const heart2D_x  = g.heart2D_x;
export const heart2D_y  = g.heart2D_y;
export const heart3D_steps = g.heart3D_steps;
export const heart3D_x  = g.heart3D_x;
export const heart3D_y  = g.heart3D_y;
export const heart3D_z  = g.heart3D_z;
export const latinCrossVertices = g.latinCrossVertices;
export const crossX     = g.crossX;
export const crossY     = g.crossY;
export const crossZ     = g.crossZ;
export const crossZFlat = g.crossZFlat;
export const pyramidX   = g.pyramidX;
export const pyramidY   = g.pyramidY;
export const pyramidZ   = g.pyramidZ;
export const pyramid2DVertices = g.pyramid2DVertices;
export const pyramid2DX = g.pyramid2DX;
export const pyramid2DY = g.pyramid2DY;
export const toThreeGeometry = g.toThreeGeometry;

// EUR helpers (if you want them via imports too)
export const initEURWave = g.initEURWave;
export const eurX = g.eurX;
export const eurY = g.eurY;
