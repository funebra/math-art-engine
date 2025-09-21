---
layout: default
title: "pyramidY(o, stepsPerEdge, centerX, centerY, rx, ry, rxRot, ryRot, rzRot, dist, fov) — Funebra helper"
description: "pyramidY: projected y for a square-pyramid wireframe with rotations and perspective."
permalink: /helpers/pyramidY/
tags: [Funebra, math helper, pyramidY, pyramid, projection, stepsPerEdge]
---
**Function:** pyramidY(o, stepsPerEdge, centerX, centerY, rx, ry, rxRot = 0, ryRot = 0, rzRot = 0, dist = 700, fov = 1.0)
# pyramidY() Helper

**Signature**

```js
pyramidY(o, stepsPerEdge, centerX, centerY, rx, ry, rxRot = 0, ryRot = 0, rzRot = 0, dist = 700, fov = 1.0)
```

**Summary**
Returns the **projected y-coordinate** of a point walking along the **wireframe of a square pyramid**.
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
Number — projected y-coordinate at step `o`.

---

## Geometry & Formula

Pyramid vertices in 3D:

* Apex: `(0, 0, rx)` *(using `rx` as height like in `pyramidX`)*
* Base corners: `(±rx, ±ry, 0)`

Edges (8 total): 4 sides from apex to base corners, 4 around the base.
Total steps:

```
steps = 8 * stepsPerEdge
```

Rotate point by `rxRot`, `ryRot`, `rzRot`, then perspective-project:

```
Yscreen = centerY + fov * (dist * y') / (dist + z')
```

`pyramidY` returns `Yscreen`.

---

## Reference Implementation (JS)

```js
function pyramidY(o, stepsPerEdge, cx, cy, rx, ry, rxRot=0, ryRot=0, rzRot=0, dist=700, fov=1.0){
  const verts = [
    [ 0,   0,  rx ],  // apex (matches pyramidX)
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

  // Perspective projection → Y only
  const Yscreen = cy + fov * (dist * y) / (dist + z);

  return Yscreen;
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

* Keep `pyramidX/Y/Z` parameters identical so the projections align.
* Increase `stepsPerEdge` for smoother edges.
* Adjust `dist`/`fov` for zoom and perspective feel.
* Animate `rxRot`, `ryRot`, or `rzRot` over `o` for spinning effects.

---

## See Also

* [pyramidX](pyramidX.md) — projected x-coordinate
* [pyramidZ](pyramidZ.md) — projected z-coordinate / depth
* [math-helpers index](../math-helpers.md)

---
 
