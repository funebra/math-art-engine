# pyramidZ() Helper

**Signature**

```js
pyramidZ(o, stepsPerEdge, centerX, centerY, rx, ry, rxRot = 0, ryRot = 0, rzRot = 0, dist = 700, fov = 1.0)
```

**Summary**
Returns the **depth (z) value** of a point walking along the **wireframe of a square pyramid**.
It mirrors `pyramidX/pyramidY`: same edge-walk, same rotations — then returns the **rotated z** (useful for layering/sorting).

> Note: `centerX`, `centerY`, `dist`, and `fov` are kept for **API symmetry** with `pyramidX/Y` but aren’t used in the z computation.

---

## Parameters

* `o` — integer step index in `[0 .. steps)`. (Use modulo to loop.)
* `stepsPerEdge` — number of points per pyramid edge.
* `centerX`, `centerY` — kept for signature symmetry (ignored here).
* `rx`, `ry` — base extents in x and y (size of square base).
* `rxRot`, `ryRot`, `rzRot` — rotation angles (radians) around X, Y, Z axes.
* `dist`, `fov` — kept for signature symmetry (ignored here).

**Returns**
Number — **rotated z** (depth) at step `o`.

---

## Geometry & Formula

Pyramid vertices (same as `pyramidX/Y`):

* Apex: `(0, 0, rx)` *(height uses `rx`, to match your X/Y helpers)*
* Base corners: `(±rx, ±ry, 0)`

Edges (8 total): 4 side edges + 4 base edges.
Total steps:

```
steps = 8 * stepsPerEdge
```

Process:

1. Interpolate a point along the current edge.
2. Apply rotations `rxRot`, `ryRot`, `rzRot`.
3. Return its **z** after rotation (no perspective division).

---

## Reference Implementation (JS)

```js
function pyramidZ(o, stepsPerEdge, cx, cy, rx, ry, rxRot=0, ryRot=0, rzRot=0, dist=700, fov=1.0){
  const verts = [
    [ 0,   0,  rx ],  // apex (matches pyramidX/Y)
    [ rx,  ry, 0 ],
    [ rx, -ry, 0 ],
    [-rx, -ry, 0 ],
    [-rx,  ry, 0 ]
  ];
  const edges = [
    [0,1],[0,2],[0,3],[0,4], // sides
    [1,2],[2,3],[3,4],[4,1]  // base
  ];

  const totalEdges = edges.length;
  const edge = Math.floor(o / stepsPerEdge) % totalEdges;
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const [i1, i2] = edges[edge];
  const [x1, y1, z1] = verts[i1];
  const [x2, y2, z2] = verts[i2];

  // Interpolate along the current edge
  let x = (1 - t) * x1 + t * x2;
  let y = (1 - t) * y1 + t * y2;
  let z = (1 - t) * z1 + t * z2;

  // Rotate around X
  let dy = y * Math.cos(rxRot) - z * Math.sin(rxRot);
  let dz = y * Math.sin(rxRot) + z * Math.cos(rxRot);
  y = dy; z = dz;

  // Rotate around Y
  let dx = x * Math.cos(ryRot) + z * Math.sin(ryRot);
  dz = -x * Math.sin(ryRot) + z * Math.cos(ryRot);
  x = dx; z = dz;

  // Rotate around Z
  dx = x * Math.cos(rzRot) - y * Math.sin(rzRot);
  dy = x * Math.sin(rzRot) + y * Math.cos(rzRot);
  x = dx; y = dy;

  // Return depth (no perspective divide)
  return z;
}
```

---

## Usage in Funebra

**Steps:** `8 * 40`

```
X(o): pyramidX(o, 40, 360, 260, 220, 220, -0.3, 0.7, 0.0, 700, 1.1)
Y(o): pyramidY(o, 40, 360, 260, 220, 220, -0.3, 0.7, 0.0, 700, 1.1)
Z(o): pyramidZ(o, 40, 360, 260, 220, 220, -0.3, 0.7, 0.0, 700, 1.1)
```

This yields a **rotated square pyramid** with consistent XYZ across helpers. Use `Z(o)` for **painter’s sorting**, shading, or Z-driven effects.

---

## Tips

* Keep the parameters identical across `pyramidX/Y/Z` so all three trace the **same 3D point** each step.
* If you want a **normalized depth** for UI effects: map `z` to `[0,1]` via a min/max over one loop.
* Animate `rxRot`, `ryRot`, `rzRot` over time for spinning/tilting pyramids.

---

## See Also

* [pyramidX](pyramidX.md) — projected x-coordinate
* [pyramidY](pyramidY.md) — projected y-coordinate
* [math-helpers index](../math-helpers.md)

---
