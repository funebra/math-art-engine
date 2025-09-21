# crossY() Helper

**Signature**

```js
crossY(o, stepsPerEdge, centerX, centerY, armW, armT, stemH, stemT, skew, rot)
```

**Summary**
Returns the **y-coordinate** of a point walking along the **outline of a Latin cross**.
The outline is traced as a closed polygon (8 edges in this minimal model).
The walker index `o` advances along edges; each edge is split into `stepsPerEdge` linear segments.

---

## Parameters

* `o` — integer step index in `[0 .. 8*stepsPerEdge)`. (Use modulo with the total to loop.)
* `stepsPerEdge` — number of interpolation steps on each edge.
* `centerX`, `centerY` — cross center coordinates.
* `armW` — arm width (horizontal span).
* `armT` — arm thickness (vertical thickness).
* `stemH` — stem height (vertical span, below the arms).
* `stemT` — stem thickness (horizontal thickness).
* `skew` — horizontal skew offset applied to the lower stem vertices.
* `rot` — rotation angle in radians.

**Returns**
Number — y-coordinate at step `o`.

---

## Geometry & Formula

The cross outline is represented by 8 key vertices (clockwise), then closed:

1. Left arm top →
2. Right arm top →
3. Right arm bottom →
4. Stem right at arms →
5. Stem right bottom (with `skew`) →
6. Stem left bottom (with `skew`) →
7. Stem left at arms →
8. Left arm bottom → back to start.

Apply rotation `rot` about `(Cx, Cy)` after linear interpolation along each edge:

```
x' = (x - Cx) * cos(rot) - (y - Cy) * sin(rot) + Cx
y' = (x - Cx) * sin(rot) + (y - Cy) * cos(rot) + Cy
```

`crossY` returns `y'`.

---

## Reference Implementation (JS)

```js
function crossY(o, stepsPerEdge, cx, cy, armW, armT, stemH, stemT, skew = 0, rot = 0){
  // 8 vertices (minimal Latin cross), then close the polygon
  const verts = [
    [cx - armW/2,          cy - armT/2], // 0: left arm top
    [cx + armW/2,          cy - armT/2], // 1: right arm top
    [cx + armW/2,          cy + armT/2], // 2: right arm bottom
    [cx + stemT/2,         cy + armT/2], // 3: stem right at arms
    [cx + stemT/2 + skew,  cy + armT/2 + stemH], // 4: stem right bottom (skewed)
    [cx - stemT/2 + skew,  cy + armT/2 + stemH], // 5: stem left bottom (skewed)
    [cx - stemT/2,         cy + armT/2], // 6: stem left at arms
    [cx - armW/2,          cy + armT/2]  // 7: left arm bottom
  ];

  // Close polygon
  const poly = [...verts, verts[0]];
  const totalEdges = poly.length - 1; // 8
  const edge = Math.floor(o / stepsPerEdge) % totalEdges;
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const [x1, y1] = poly[edge];
  const [x2, y2] = poly[edge + 1];

  // Linear interpolation
  const x = (1 - t) * x1 + t * x2;
  const y = (1 - t) * y1 + t * y2;

  // Rotate around (cx, cy)
  const dx = x - cx, dy = y - cy;
  const cosR = Math.cos(rot), sinR = Math.sin(rot);
  const yRot = dx * sinR + dy * cosR + cy;

  return yRot;
}
```

---

## Usage in Funebra

**Steps:** `8 * 30` (or keep your previous total if you prefer)

```
X(o): crossX(o, 30, 300, 360, 240, 60, 200, 60, -240/6, Math.PI/8)
Y(o): crossY(o, 30, 300, 360, 240, 60, 200, 60, -240/6, Math.PI/8)
Z(o): 0
```

This draws a **Latin cross** centered at `(300, 360)` with arms width `240`, arms thickness `60`, stem height `200`, stem thickness `60`, skew `-40`, and rotation `22.5°`.

---

## Tips

* Larger `stepsPerEdge` → smoother outline.
* `skew` adds a leaning/perspective feel to the lower stem.
* Pair with [crossX](crossX.md) for the full 2D path, and [crossZ](crossZ.md) to add a sinusoidal or helical Z.

---

## See Also

* [crossX](crossX.md) — x-coordinate counterpart
* [crossZ](crossZ.md) — z-coordinate extension
* [math-helpers index](../math-helpers.md)

---

