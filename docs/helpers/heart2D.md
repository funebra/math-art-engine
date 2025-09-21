---
layout: default
title: "heart2D_x() & heart2D_y() — Funebra helper"
description: "heart2D_x/heart2D_y: classic parametric heart curve; returns x and y over one loop."
permalink: /helpers/heart2D/
tags: [Funebra, math helper, heart, parametric, cardioid]
---
**Function:** heart2D_x(o, steps, scale, centerX) • heart2D_y(o, steps, scale, centerY)
# heart2D() Helpers

**Signatures**

```js
heart2D_x(o, steps, scale, centerX)
heart2D_y(o, steps, scale, centerY)
```

**Summary**
Provides **x** and **y** coordinates for the classic cardioid-style heart curve using the well-known parametric equations.
The walker index `o` runs `0 .. steps-1` and is mapped to an angle `t = (2π * o) / steps`.

---

## Parameters

* `o` — integer step index in `[0 .. steps)`. (Use modulo with `steps` to loop.)
* `steps` — total samples for one full heart outline. (Recommended: `≥ 360`, e.g. `720`.)
* `scale` — uniform scale factor applied to both `x` and `y`.
* `centerX` / `centerY` — center offsets on screen.

**Returns**
Number — x or y coordinate at step `o`.

---

## Geometry & Formula

Angle mapping:

```
t = (2π * o) / steps
```

Classic heart (Cartesian):

```
x_raw = 16 * sin^3(t)
y_raw = 13 * cos(t) - 5 * cos(2t) - 2 * cos(3t) - cos(4t)
```

Screen coordinates with center and scale:

```
x = centerX + scale * x_raw
y = centerY + scale * y_raw
```

> If your screen Y axis points **downwards** (typical in DOM/CSS), and you want the heart to point **up**, you can flip Y by using `y = centerY - scale * y_raw` instead.

---

## Reference Implementation (JS)

```js
function heart2D_x(o, steps, scale, centerX){
  const t = (2 * Math.PI * (o % steps)) / steps;
  const x_raw = 16 * Math.pow(Math.sin(t), 3);
  return centerX + scale * x_raw;
}

function heart2D_y(o, steps, scale, centerY){
  const t = (2 * Math.PI * (o % steps)) / steps;
  const y_raw = 13 * Math.cos(t)
              - 5 * Math.cos(2 * t)
              - 2 * Math.cos(3 * t)
              -     Math.cos(4 * t);
  // Choose one of the two lines below depending on your preferred orientation:

  // Standard (same sign convention as polygonY etc.):
  return centerY + scale * y_raw;

  // Or, to flip vertically so the heart points up in DOM coordinates:
  // return centerY - scale * y_raw;
}
```

---

## Usage in Funebra

**Steps:** `720`

```
X(o): heart2D_x(o, 720, 6, 360)
Y(o): heart2D_y(o, 720, 6, 260)
Z(o): 0
```

This draws a smooth **heart** centered at `(360, 260)` scaled by `6`.

---

## Tips

* Increase `steps` (e.g., `720`, `1080`) for extra smoothness on large displays.
* Animate `scale` or add a phase offset to `t` for a “beating” effect.
* Flip Y (use the commented return) if you want the heart’s point facing down/up to match your coordinate system.
* Pair with a constant or sinusoidal `Z(o)` if you want 3D depth effects.

---

## See Also

* [polygonX](polygonX.md), [polygonY](polygonY.md)
* [starX](starX.md), [starY](starY.md)
* [math-helpers index](../math-helpers.md)

---
