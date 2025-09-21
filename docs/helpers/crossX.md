---
layout: default
title: "crossX(o, stepsPerEdge, centerX, centerY, armW, armT, stemH, stemT, skew, rot) — Funebra helper"
description: "crossX: x-coordinate along a Latin cross outline with optional skew and rotation."
permalink: /helpers/crossX/
tags: [Funebra, math helper, crossX, latin cross, stepsPerEdge]
---
**Function:** crossX(o, stepsPerEdge, centerX, centerY, armW, armT, stemH, stemT, skew, rot)
# crossX() Helper

**Signature**

```js
crossX(o, stepsPerEdge, centerX, centerY, armW, armT, stemH, stemT, skew, rot)
```

**Summary**
Returns the **x-coordinate** of a point walking along the **outline of a Latin cross**.
The cross is described by 12 edges: 4 around the arms, 8 around the stem.
The walker index `o` advances along edges; each edge is split into `stepsPerEdge` linear segments.

---

## Parameters

* `o` — integer step index in `[0 .. 12*stepsPerEdge)`. (Use modulo with the total to loop.)
* `stepsPerEdge` — number of interpolation steps on each edge.
* `centerX`, `centerY` — cross center coordinates.
* `armW` — arm width (horizontal span).
* `armT` — arm thickness (vertical thickness).
* `stemH` — stem height (vertical span).
* `stemT` — stem thickness (horizontal thickness).
* `skew` — horizontal skew offset applied to one side.
* `rot` — rotation angle in radians.

**Returns**
Number — x-coordinate at step `o`.

---

## Geometry & Formula

The cross outline is defined as a polygon with 12 vertices:

1. Start at top-left of arm, proceed clockwise around arms and stem.
2. Apply `skew` as an x-offset to the lower stem vertices.
3. Apply rotation `rot` to all vertices:

```
x' = (x - Cx) * cos(rot) - (y - Cy) * sin(rot) + Cx
y' = (x - Cx) * sin(rot) + (y - Cy) * cos(rot) + Cy
```

Linear interpolation along edges is the same as in `polygonX/polygonY`.

---

## Reference Implementation (JS)

```js
function crossX(o, stepsPerEdge, cx, cy, armW, armT, stemH, stemT, skew=0, rot=0){
  const verts = [
    [cx - armW/2, cy - armT/2], [cx + armW/2, cy - armT/2],
    [cx + armW/2, cy + armT/2], [cx + stemT/2, cy + armT/2],
    [cx + stemT/2 + skew, cy + armT/2 + stemH],
    [cx - stemT/2 + skew, cy + armT/2 + stemH],
    [cx - stemT/2, cy + armT/2], [cx - armW/2, cy + armT/2]
  ];
  // close polygon (12 edges)
  const poly = [
    verts[0], verts[1], verts[2], verts[3],
    verts[4], verts[5], verts[6], verts[7], verts[0]
  ];
  const totalEdges = poly.length - 1;
  const edge = Math.floor(o / stepsPerEdge) % totalEdges;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [x1, y1] = poly[edge];
  const [x2, y2] = poly[edge+1];

  // linear interpolation
  let x = (1 - t) * x1 + t * x2;
  let y = (1 - t) * y1 + t * y2;

  // rotation around center
  const dx = x - cx, dy = y - cy;
  return dx * Math.cos(rot) - dy * Math.sin(rot) + cx;
}
```

---

## Usage in Funebra

**Steps:** `12 * 30`

```
X(o): crossX(o, 30, 300, 360, 240, 60, 200, 60, -240/6, Math.PI/8)
Y(o): crossY(o, 30, 300, 360, 240, 60, 200, 60, -240/6, Math.PI/8)
Z(o): 0
```

This draws a **Latin cross** centered at `(300, 360)` with arms width `240`, arms thickness `60`, stem height `200`, stem thickness `60`, skew `-40`, and rotated by 22.5°.

---

## Tips

* Increase `stepsPerEdge` for smoother outlines.
* Skew allows perspective-like leaning of the stem.
* Rotation applies after skew and scaling.
* Pair with [crossY](crossY.md) and [crossZ](crossZ.md) for full 3D motion.

---

## See Also

* [crossY](crossY.md) — y-coordinate counterpart
* [crossZ](crossZ.md) — z-coordinate extension
* [math-helpers index](../math-helpers.md)

---
