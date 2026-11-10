#!/usr/bin/env python3
"""Build the downstream A2-prep LeLaDeres relief mesh candidate.

Dependencies: Python 3.10+, NumPy, SciPy.
Input: yaw22-600.json generated from the existing Geometry98 yaw22 sample.
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
from scipy.spatial import Delaunay

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "yaw22-600.json"
OUTPUT = ROOT / "leladeres_a1_1_07_relief_candidate.obj"
MAX_EDGE_PX = 18.0

payload = json.loads(INPUT.read_text(encoding="utf-8"))
points = payload["points"]
if len(points) != 600 or payload.get("projection") != "yaw22":
    raise ValueError("Expected the fixed-order 600-point yaw22 sample")
xy = np.asarray([[p["x"], p["y"]] for p in points], dtype=float)
z_hint = np.asarray([p["zHint"] for p in points], dtype=float)
if not np.isfinite(xy).all() or not np.isfinite(z_hint).all():
    raise ValueError("Input coordinates must be finite")
if len(np.unique(xy, axis=0)) != len(points):
    raise ValueError("Duplicate XY samples require a reviewed tie-break rule")

# Deliberately shallow and centered. zHint is illustrative, not measured depth.
height = z_hint - float(np.median(z_hint))
triangles = Delaunay(xy).simplices
faces = []
for tri in triangles:
    a, b, c = map(int, tri)
    lengths = [
        float(np.linalg.norm(xy[a] - xy[b])),
        float(np.linalg.norm(xy[b] - xy[c])),
        float(np.linalg.norm(xy[c] - xy[a])),
    ]
    if max(lengths) > MAX_EDGE_PX:
        continue
    u, v = xy[b] - xy[a], xy[c] - xy[a]
    area2 = float(u[0] * v[1] - u[1] * v[0])
    if area2 < 0:
        b, c = c, b
    faces.append((a + 1, b + 1, c + 1))

with OUTPUT.open("w", encoding="utf-8", newline="\n") as out:
    out.write("# FUNEBRA A2-PREP / DERIVED / ILLUSTRATIVE / NON-MEASURED\n")
    out.write("# LeLaDeres A1.1.07 relief mesh candidate; not anatomy, scan, or model.\n")
    out.write("# XY: Geometry98 yaw22 illustrative projection; Z: centered zHint display offset.\n")
    out.write(f"# Delaunay triangulation; reject any face with edge > {MAX_EDGE_PX:g} px.\n")
    out.write("o LeLaDeres_A1_1_07_DERIVED_ReliefCandidate\n")
    for (x, y), z in zip(xy, height):
        out.write(f"v {x:.6f} {y:.6f} {z:.6f}\n")
    for face in faces:
        out.write("f %d %d %d\n" % face)

stats = {
    "status": "A2-prep / derived / illustrative / non-measured",
    "canonicalImpact": "none; no write-back to source trace, A0-A1.2 chain, or F-0009 registry",
    "input": INPUT.name,
    "sourcePointCount": payload["sourcePointCount"],
    "sampleCount": len(points),
    "projection": "Geometry98 yaw22",
    "height": "zHint - median(zHint); illustrative only; not measured depth or physical scale",
    "triangulation": "SciPy Delaunay in XY, then reject faces whose longest edge exceeds cutoff",
    "maxTriangleEdgePx": MAX_EDGE_PX,
    "candidateTriangleCount": int(len(triangles)),
    "retainedFaceCount": len(faces),
    "verticesWritten": len(points),
    "watertight": False,
    "reversible": True,
    "builder": Path(__file__).name,
}
(ROOT / "mesh-metadata.json").write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
print(json.dumps(stats, indent=2))
