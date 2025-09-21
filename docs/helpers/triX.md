# triX() Helper

**Signature**

```js
triX(o, vertices, stepsPerEdge)
```

**Summary**
Returns the **x-coordinate** of a point walking along the **outline of a triangle** defined by three 2D vertices.
The walker index `o` advances along edges; each edge is split into `stepsPerEdge` linear segments.

---

## Parameters

* `o` — integer step index in `[0 .. 3*stepsPerEdge)`. (Use modulo with the total to loop.)
* `vertices` — array of three points `[[x0,y0],[x1,y1],[x2,y2]]`, ordered clockwise or counter-clockwise.
* `stepsPerEdge` — number of interpolation steps on each edge (≥ 1).

**Returns**
Number — x-coordinate at step `o`.

---

## Geometry & Formula

Edges are `(v0→v1)`, `(v1→v2)`, `(v2→v0)`.
Let:

```
e = floor(o / stepsPerEdge) % 3      // edge index
t = (o % stepsPerEdge) / stepsPerEdge
(i1,i2) = ([0,1],[1,2],[2,0])[e]
x(o) = (1 - t) * x[i1] + t * x[i2]
```

Total steps:

```
steps = 3 * stepsPerEdge
```

---

## Reference Implementation (JS)

```js
function triX(o, vertices, stepsPerEdge){
  const edges = [[0,1],[1,2],[2,0]];
  const e = Math.floor(o / stepsPerEdge) % 3;
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const [i1, i2] = edges[e];
  const [x1] = vertices[i1];
  const [x2] = vertices[i2];

  return (1 - t) * x1 + t * x2;
}
```

---

## Usage in Funebra

**Steps:** `3 * 40`

```txt
const triA = [[260,120],[460,320],[160,320]];

X(o): triX(o, triA, 40)
Y(o): triY(o, triA, 40)
Z(o): 0
```

This traces the triangle through `triA` with `40` segments per edge.

---

## Tips

* Ensure `vertices` are unique and ordered (CW or CCW) to avoid self-crossing.
* Use `o % (3*stepsPerEdge)` for seamless looping.
* Pair with [triY](triY.md) for the full 2D path.

---

## See Also

* [triY](triY.md) — y-coordinate counterpart
* [polygonX](polygonX.md), [polygonY](polygonY.md)
* [math-helpers index](../math-helpers.md)

---
