---
layout: default
title: "cube(o, size, centerX, centerY, stepsPerEdge, rxRot, ryRot, rzRot, dist, fov) — Funebra helper"
description: "cube: returns {x,y,z} for a point walking the 12 cube edges with rotation and perspective."
permalink: /helpers/cube/
tags: [Funebra, math helper, cube, projection, 3D, stepsPerEdge]
---
**Function:** cube(o, size, centerX, centerY, stepsPerEdge, rxRot = 0, ryRot = 0, rzRot = 0, dist = 700, fov = 1.0)
# cube() Helper

**Signature**

```js
cube(o, size, centerX, centerY, stepsPerEdge, rxRot = 0, ryRot = 0, rzRot = 0, dist = 700, fov = 1.0)
```

**Summary**
Returns an **object with projected coordinates** `{ x, y, z }` for a point walking along the **wireframe of a cube**.
The cube is traced as 12 edges; the walker index `o` advances along edges, each split into `stepsPerEdge` segments.

---

## Parameters

* `o` — integer step index (use modulo to loop).
* `size` — edge length of the cube (screen/world units).
* `centerX`, `centerY` — screen center for projection.
* `stepsPerEdge` — number of samples on **each** of the 12 edges.
* `rxRot`, `ryRot`, `rzRot` — rotations (radians) around X, Y, Z (applied in X→Y→Z order).
* `dist` — camera distance for perspective.
* `fov` — perspective scale.

**Returns**
Object:

* `x` — projected x on screen
* `y` — projected y on screen
* `z` — rotated depth (useful for painter’s sorting/effects)

---

## Geometry & Formula

Vertices (cube centered at origin before rotation), with half-size `s = size/2`:

```
0 (-s,-s,-s)  1 ( s,-s,-s)  2 ( s, s,-s)  3 (-s, s,-s)   // bottom (z=-s)
4 (-s,-s, s)  5 ( s,-s, s)  6 ( s, s, s)  7 (-s, s, s)   // top    (z= s)
```

Edges (12 total):

```
[0,1],[1,2],[2,3],[3,0],     // bottom square
[4,5],[5,6],[6,7],[7,4],     // top square
[0,4],[1,5],[2,6],[3,7]      // verticals
```

Total steps for one loop:

```
steps = 12 * stepsPerEdge
```

For edge-walk interpolation:

```
e = floor(o / stepsPerEdge) % 12
t = (o % stepsPerEdge) / stepsPerEdge
P = (1 - t) * V[i1] + t * V[i2]   // along current edge
```

Rotate P by `rxRot, ryRot, rzRot`, then perspective project:

```
Xscreen = centerX + fov * (dist * x') / (dist + z')
Yscreen = centerY + fov * (dist * y') / (dist + z')
```

---

## Reference Implementation (JS)

```js
function cube(o, size, cx, cy, stepsPerEdge, rxRot = 0, ryRot = 0, rzRot = 0, dist = 700, fov = 1.0){
  const s = size / 2;

  const verts = [
    [-s, -s, -s], [ s, -s, -s], [ s,  s, -s], [-s,  s, -s], // bottom
    [-s, -s,  s], [ s, -s,  s], [ s,  s,  s], [-s,  s,  s]  // top
  ];

  const edges = [
    [0,1],[1,2],[2,3],[3,0],   // bottom
    [4,5],[5,6],[6,7],[7,4],   // top
    [0,4],[1,5],[2,6],[3,7]    // verticals
  ];

  const totalEdges = edges.length; // 12
  const edge = Math.floor(o / stepsPerEdge) % totalEdges;
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const [i1, i2] = edges[edge];
  let [x, y, z]  = verts[i1];
  const [x2, y2, z2] = verts[i2];

  // Interpolate along current edge
  x = (1 - t) * x + t * x2;
  y = (1 - t) * y + t * y2;
  z = (1 - t) * z + t * z2;

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

  // Perspective projection
  const Xscreen = cx + fov * (dist * x) / (dist + z);
  const Yscreen = cy + fov * (dist * y) / (dist + z);

  return { x: Xscreen, y: Yscreen, z };
}
```

---

## Usage in Funebra

**Steps:** `12 * 18`

```
X(o): cube(o, 180, 360, 260, 18).x
Y(o): cube(o, 180, 360, 260, 18).y
Z(o): cube(o, 180, 360, 260, 18).z
```

This renders a **wireframe cube** of size `180`, centered at `(360, 260)`, with `18` segments per edge.

---

## Tips

* Keep `rxRot/ryRot/rzRot` identical across X/Y/Z calls (or pass them once via `cube(...).x/.y/.z`).
* Increase `stepsPerEdge` for a denser outline.
* Use the returned `z` for painter’s sorting or depth-based styling.
* Animate rotations over time for a spinning cube (`rxRot += 0.01`, etc.).
* If you need separate helpers, you can wrap:
  `cubeX = (...args) => cube(...args).x` (similarly for `Y`, `Z`).

---

## See Also

* [pyramidX](pyramidX.md), [pyramidY](pyramidY.md), [pyramidZ](pyramidZ.md)
* [math-helpers index](../math-helpers.md)

---
