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
- `build_relief_mesh.py` — constructor; requires Python 3.10+, NumPy, and SciPy.
- `leladeres_a1_1_07_relief_candidate.obj` — derived open relief surface.
- `mesh-metadata.json` — construction parameters and scope labels.

## Rebuild

From this directory, run `python3 build_relief_mesh.py`. The builder refuses unexpected sample counts/projections, duplicate XY points, and non-finite values.
