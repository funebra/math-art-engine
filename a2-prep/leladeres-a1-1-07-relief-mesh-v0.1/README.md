# FUNEBRA™ LeLaDeres A1.1.07 Relief Mesh Candidate

**A2-prep · derived composition · illustrative · non-measured**

This is a downstream visualization experiment built from the fixed-order 600-point Geometry98 yaw22 sample. It is not anatomy, a scan, a recovered 3D model, or a claim of measured depth.

## Provenance boundary

- The upstream review candidate contains 8,193 source points; this experiment consumes the existing 600-point Geometry98 sample only.
- The input coordinates are the current yaw22 projection. The zHint field is explicitly non-measured and is used only as a visual relief offset.
- No source BN point, front projection, A0–A1.2 state, or F-0009 registry record is modified or replaced.
- Every output here is disposable and can be deleted without affecting the source trace. This folder is an A2-prep branch artifact only.

## Construction

`build_relief_mesh.py` applies a deterministic XY Delaunay triangulation to the sample and rejects any triangle whose longest edge exceeds 18 px. The cutoff leaves holes where the sample cloud is sparse instead of filling broad gaps with large faces. It writes all 600 vertices and the retained open surface to OBJ. Vertex height is `zHint - median(zHint)` in arbitrary display units. It is neither calibrated nor physical.

The surface is intentionally **not watertight**. The retained triangle set has 643 faces. This is a reviewable relief candidate, not a production solid or export-ready anatomical asset.

## Files

- `yaw22-600.json` — frozen, ordered derived input values for reproducibility.
- `build_relief_mesh.py` — offline OBJ constructor; requires Python 3.10+, NumPy, and SciPy.
- `geometry98-native-mesh-render.js` — dependency-free browser sampler for native PaintV..X; no Three.js, Canvas, or OBJ library.
- `leladeres_a1_1_07_relief_candidate.obj` — derived open relief surface.
- `mesh-metadata.json` — construction parameters and scope labels.
- `geometry98-3d-rotation-demo.html` — standalone Canvas 2D rotation preview with the yaw22 sample and retained faces embedded; no external dependencies.

## Rebuild

The browser renderer is plain JavaScript and consumes the OBJ text; it has no external runtime dependencies. The standalone rotation preview embeds the frozen 600-point sample and 643 retained faces for offline viewing. Its canvas rotates the illustrative relief for inspection; it does not change the Geometry98 page or source trace. It provisions missing BN point elements with the Geometry98 `printit()` node pattern, so streams can exceed the page’s initial 600-node pool. `restore()` removes the extra nodes created by that install. The SciPy requirement applies only to rebuilding the triangulated OBJ.

From this directory, run `python3 build_relief_mesh.py`. The builder refuses unexpected sample counts/projections, duplicate XY points, and non-finite values.
