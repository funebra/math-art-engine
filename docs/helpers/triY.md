---
layout: default
title: "triY(o, vertices, stepsPerEdge) — Funebra helper"
description: "triY: y-coordinate along a triangle outline defined by three vertices."
permalink: /helpers/triY/
tags: [Funebra, math helper, triY, triangle, stepsPerEdge]
---
**Function:** triY(o, vertices, stepsPerEdge)
# triY() Helper

**Signature**

```js
triY(o, vertices, stepsPerEdge)
```

**Summary**
Returns the **y-coordinate** of a point walking along the **outline of a triangle** defined by three 2D vertices.
The walker index `o` advances along edges; each edge is split into `stepsPerEdge` linear segments.

---

## Parameters

* `o` — integer step index in `[0 .. 3*stepsPerEdge)`. (Use modulo with the total to loop.)
* `vertices` — array of three points `[[x0,y0],[x1,y1],[x2,y2]]`, ordered clockwise or counter-clockwise.
* `stepsPerEdge` — number of interpolation steps on each edge (≥ 1).

**Returns**
Number — y-coordinate at step `o`.

---

## Geometry & Formula

Edges are `(v0→v1)`, `(v1→v2)`, `(v2→v0)`.
Let:

```
e = floor(o / stepsPerEdge) % 3      // edge index
t = (o % stepsPerEdge) / stepsPerEdge
(i1,i2) = ([0,1],[1,2],[2,0])[e]
y(o) = (1 - t) * y[i1] + t * y[i2]
```

Total steps:

```
steps = 3 * stepsPerEdge
```

---

## Reference Implementation (JS)

```js
function triY(o, vertices, stepsPerEdge){
  const edges = [[0,1],[1,2],[2,0]];
  const e = Math.floor(o / stepsPerEdge) % 3;
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const [i1, i2] = edges[e];
  const [, y1] = vertices[i1];
  const [, y2] = vertices[i2];

  return (1 - t) * y1 + t * y2;
}
```

---

## Usage in Funebra

**Steps:** `3 * 40`

```js
const triA = [[260,120],[460,320],[160,320]];
```

```txt
X(o): triX(o, triA, 40)
Y(o): triY(o, triA, 40)
Z(o): 0
```

This traces the triangle through `triA` with `40` segments per edge.

---

## Tips

* Keep `vertices` ordered (CW or CCW) and non-degenerate to avoid artifacts.
* Use `o % (3*stepsPerEdge)` for seamless looping.
* Pair with [triX](triX.md) for the full 2D path.

---

## See Also

* [triX](triX.md) — x-coordinate counterpart
* [polygonX](polygonX.md), [polygonY](polygonY.md)
* [math-helpers index](../math-helpers.md)

---
