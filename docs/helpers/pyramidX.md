---
layout: default
title: "pyramidX(o, stepsPerEdge, centerX, centerY, rx, ry, rxRot, ryRot, rzRot, dist, fov) — Funebra helper"
description: "pyramidX: projected x for a square-pyramid wireframe with rotations and perspective."
permalink: /helpers/pyramidX/
tags: [Funebra, math helper, pyramidX, pyramid, projection, stepsPerEdge]
---
**Function:** pyramidX(o, stepsPerEdge, centerX, centerY, rx, ry, rxRot = 0, ryRot = 0, rzRot = 0, dist = 700, fov = 1.0)
# pyramidX() Helper

**Signature**

```js
pyramidX(o, stepsPerEdge, centerX, centerY, rx, ry, rxRot = 0, ryRot = 0, rzRot = 0, dist = 700, fov = 1.0)
```

**Summary**
Returns the **projected x-coordinate** of a point walking along the **wireframe of a square pyramid**.
The pyramid has a square base and 4 triangular sides.
The walker index `o` advances along edges; each edge is subdivided into `stepsPerEdge`.

---

## Parameters

* `o` — integer step index in `[0 .. steps)`. (Use modulo to loop.)
* `stepsPerEdge` — number of points per pyramid edge.
* `centerX`, `centerY` — projection center on screen.
* `rx`, `ry` — base radius in x and y (size of square base).
* `rxRot`, `ryRot`, `rzRot` — rotation angles (radians) around X, Y, and Z axes.
* `dist` — distance to projection plane (camera distance).
* `fov` — field of view scaling factor.

**Returns**
Number — projected x-coordinate at step `o`.

---

## Geometry & Formula

The pyramid has 5 vertices in 3D:

* Apex: `(0, 0, h)`
* Base corners: `(±rx, ±ry, 0)`

Edges = 8 total: 4 base edges, 4 side edges.
Total steps:

```
steps = 8 * stepsPerEdge
```

Projection after rotation:

```
x' = (x cos rz - y sin rz) cos ry + z sin ry
z' = -(x cos rz - y sin rz) sin ry + z cos ry
y' = (x sin rz + y cos rz) cos rx - z sin rx
```

Then perspective:

```
Xscreen = centerX + fov * (dist * x') / (dist + z')
```

`pyramidX` returns `Xscreen`.

---

## Reference Implementation (JS)

```js
function pyramidX(o, stepsPerEdge, cx, cy, rx, ry, rxRot=0, ryRot=0, rzRot=0, dist=700, fov=1.0){
  const verts = [
    [ 0,   0,  rx ],  // apex
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

  let x = (1 - t) * x1 + t * x2;
  let y = (1 - t) * y1 + t * y2;
  let z = (1 - t) * z1 + t * z2;

  // Rotation around X, Y, Z
  let dx, dy, dz;

  // Rotate X
  dy = y * Math.cos(rxRot) - z * Math.sin(rxRot);
  dz = y * Math.sin(rxRot) + z * Math.cos(rxRot);
  y = dy; z = dz;

  // Rotate Y
  dx = x * Math.cos(ryRot) + z * Math.sin(ryRot);
  dz = -x * Math.sin(ryRot) + z * Math.cos(ryRot);
  x = dx; z = dz;

  // Rotate Z
  dx = x * Math.cos(rzRot) - y * Math.sin(rzRot);
  dy = x * Math.sin(rzRot) + y * Math.cos(rzRot);
  x = dx; y = dy;

  // Perspective projection
  const Xscreen = cx + fov * (dist * x) / (dist + z);

  return Xscreen;
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

This draws a **rotated square pyramid** centered at `(360, 260)`.

---

## Tips

* Larger `stepsPerEdge` → smoother wireframe.
* Adjust `rxRot, ryRot, rzRot` for different viewing angles.
* Change `dist` or `fov` for zoom/perspective effects.
* Use with `pyramidY` and `pyramidZ` for full 3D projection.

---

## See Also

* [pyramidY](pyramidY.md) — y-coordinate counterpart
* [pyramidZ](pyramidZ.md) — z-coordinate counterpart
* [math-helpers index](../math-helpers.md)

---
