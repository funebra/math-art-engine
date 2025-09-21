# starY() Helper

**Signature**

```js
starY(o, points, R1, R2, centerY, stepsPerEdge)
```

**Summary**
Returns the **y-coordinate** of a point walking along a **star polygon outline** with `points` spikes, alternating radii `R1` (outer) and `R2` (inner).
The walker index `o` advances along edges; each edge is split into `stepsPerEdge` linear segments.

---

## Parameters

* `o` — integer step index in `[0 .. (2*points)*stepsPerEdge)`. (Use modulo with the total to loop.)
* `points` — number of star spikes (≥ 2). Total vertices = `2*points`.
* `R1` — outer radius.
* `R2` — inner radius.
* `centerY` — star center y-coordinate `Cᵧ`.
* `stepsPerEdge` — number of interpolation steps on each edge (≥ 1).

**Returns**
Number — y-coordinate at step `o`.

---

## Geometry & Formula

Define `V = 2*points` vertices around the circle, alternating radii:

```
θ_k = (2π/V) * k = (π/points) * k         for k = 0..V-1
r_k = R1 if k is even, else R2
```

Let:

* `e = floor(o / stepsPerEdge)` = current edge index
* `t = (o mod stepsPerEdge) / stepsPerEdge` = interpolation factor
* `k1 = e mod V`, `k2 = (e+1) mod V`
* `θ₁ = (π/points) * k1`, `θ₂ = (π/points) * k2`
* `r₁ = (k1 % 2 === 0 ? R1 : R2)`, `r₂ = (k2 % 2 === 0 ? R1 : R2)`

Then:

```
y(o) = (1 - t) * (r₁ sin θ₁ + Cy) + t * (r₂ sin θ₂ + Cy)
```

Total steps for one loop:

```
steps = (2*points) * stepsPerEdge
```

---

## Reference Implementation (JS)

```js
function starY(o, points, R1, R2, centerY, stepsPerEdge){
  const V = points * 2;                          // total vertices
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;

  const k1 = edge % V;
  const k2 = (edge + 1) % V;

  const theta1 = (Math.PI / points) * k1;        // = 2π/V * k1
  const theta2 = (Math.PI / points) * k2;

  const r1 = (k1 % 2 === 0) ? R1 : R2;
  const r2 = (k2 % 2 === 0) ? R1 : R2;

  const y1 = Math.sin(theta1) * r1 + centerY;
  const y2 = Math.sin(theta2) * r2 + centerY;

  return (1 - t) * y1 + t * y2;
}
```

---

## Usage in Funebra

**Steps:** `10 * 36` (because `2*points = 10` for a 5-point star)

```
X(o): starX(o, 5, 150, 70, 360, 36)
Y(o): starY(o, 5, 150, 70, 260, 36)
Z(o): 0
```

This draws a **5-point star** centered at `(360, 260)` with outer radius `150`, inner radius `70`, and `36` segments per edge.

---

## Tips

* Sharper star = bigger `R1 / R2` ratio.
* Loop with `o % ((2*points) * stepsPerEdge)`.
* Pair with [starX](starX.md) for the full 2D path.

---

## See Also

* [starX](starX.md) — x-coordinate counterpart
* [polygonX](polygonX.md), [polygonY](polygonY.md)
* [math-helpers index](../math-helpers.md)

---
