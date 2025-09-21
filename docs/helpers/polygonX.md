# polygonX() Helper

**Signature**

```js
polygonX(o, sides, radius, centerX, stepsPerEdge)
```

**Summary**
Returns the **x-coordinate** of a point that walks along the **perimeter of a regular polygon**.
The walker index `o` advances along edges; each edge is split into `stepsPerEdge` linear segments.

---

## Parameters

* `o` — integer step index in `[0 .. sides*stepsPerEdge)`. (Use modulo with the total to loop.)
* `sides` — number of polygon sides (≥ 3).
* `radius` — circumscribed radius `R` of the polygon.
* `centerX` — polygon center x-coordinate `Cₓ`.
* `stepsPerEdge` — number of interpolation steps on each edge (≥ 1).

**Returns**
Number — x-coordinate at step `o`.

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

Then polygonX is the linear interpolation between the two adjacent vertices:

```
x(o) = (1 - t) * (R cos θ₁ + Cx) + t * (R cos θ₂ + Cx)
```

---

## Reference Implementation (JS)

```js
function polygonX(o, sides, radius, centerX, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  const x1   = Math.cos(a1) * radius + centerX;
  const x2   = Math.cos(a2) * radius + centerX;
  return (1 - t) * x1 + t * x2;
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
* Pair with [polygonY](polygonY.md) to define the complete polygon path.
* Increase `stepsPerEdge` for smoother outlines.

---

## See Also

* [polygonY](polygonY.md) — y-coordinate counterpart
* [math-helpers index](../math-helpers.md)

---


Do you want me to prepare the same kind of **ready-to-paste docs for `starX` and `starY`** next?
