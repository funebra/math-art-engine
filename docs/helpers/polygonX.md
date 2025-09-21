# polygonX() Helper

**Signature:**
```js
polygonX(o, sides, radius, centerX, stepsPerEdge)

**Summary**
Returns the **y-coordinate** of a point that walks along the **perimeter of a regular polygon**.
The walker index `o` advances along edges; each edge is split into `stepsPerEdge` linear segments.

---

## Parameters

* `o` — integer step index in `[0 .. sides*stepsPerEdge)`. (Use modulo with the total to loop.)
* `sides` — number of polygon sides (≥ 3).
* `radius` — circumscribed radius `R` of the polygon.
* `centerY` — polygon center y-coordinate `Cᵧ`.
* `stepsPerEdge` — number of interpolation steps on each edge (≥ 1).

**Returns**
Number — y-coordinate at step `o`.

---

## Geometry & Formula

For a regular `n`-gon, the vertex angles are:

```
θₖ = (2πk)/n    for k = 0..n-1
```

Let:

* `e = floor(o / s)` = current edge index
* `t = (o mod s) / s` = interpolation factor along the edge
* `θ₁ = 2πe/n`, `θ₂ = 2π(e+1)/n`

Then polygonY is the linear interpolation between the two adjacent vertices:

```
y(o) = (1 - t) * (R sin θ₁ + Cy) + t * (R sin θ₂ + Cy)
```

---

## Reference Implementation (JS)

```js
function polygonY(o, sides, radius, centerY, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  const y1   = Math.sin(a1) * radius + centerY;
  const y2   = Math.sin(a2) * radius + centerY;
  return (1 - t) * y1 + t * y2;
}
```

---

## Usage in Funebra

**Steps:** `6 * 40`

```
X(o): polygonX(o, 6, 140, 360, 40)
Y(o): polygonY(o, 6, 140, 260, 40)
Z(o): 0
```

This draws a **hexagon** centered at `(360, 260)` with radius `140`, subdivided into `40` steps per edge.

---

## Tips

* Use `o % (sides * stepsPerEdge)` for looping.
* Pair with [polygonX](polygonX.md) to define the complete polygon path.
* Increase `stepsPerEdge` for smoother outlines.

---

## See Also

* [polygonX](polygonX.md) — x-coordinate counterpart
* [math-helpers index](../math-helpers.md)

---


