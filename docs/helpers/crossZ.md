---
layout: default
title: "crossZ(o, steps, amp, phase, zCenter, pitch) — Funebra helper"
description: "crossZ: sinusoidal/helix Z for a closed outline; pass the same total steps as crossX/crossY."
permalink: /helpers/crossZ/
tags: [Funebra, math helper, crossZ, sinusoid, helix, depth]
---
**Function:** crossZ(o, steps, amp, phase = 0, zCenter = 0, pitch = 0)
# crossZ() Helper

**Signature**

```js
crossZ(o, steps, amp, phase = 0, zCenter = 0, pitch = 0)
```

**Summary**
Returns the **z-coordinate** for a point walking along the **Latin cross outline**, adding sinusoidal or helical depth.
It’s independent of the XY geometry — just pass the **same total `steps`** you use for `crossX/crossY`.

---

## Parameters

* `o` — integer step index in `[0 .. steps)`. (Use modulo with `steps` to loop.)
* `steps` — total steps for one loop of the path (e.g., `12 * stepsPerEdge`).
* `amp` — sinusoid amplitude.
* `phase` — phase offset in radians (default `0`).
* `zCenter` — vertical offset for Z (default `0`).
* `pitch` — linear Z drift per full loop (default `0`). Positive values create a helix.

**Returns**
Number — z-coordinate at step `o`.

---

## Formula

Let the normalized angle along the loop be

```
θ = (2π * o) / steps + phase
```

Then

```
z(o) = amp * sin(θ) + zCenter + pitch * (o / steps)
```

* `amp * sin(θ)` gives a wave along the perimeter.
* `pitch * (o/steps)` tilts the wave into a helix over one full loop.

---

## Reference Implementation (JS)

```js
function crossZ(o, steps, amp, phase = 0, zCenter = 0, pitch = 0){
  const theta = (2 * Math.PI * (o % steps)) / steps + phase;
  return amp * Math.sin(theta) + zCenter + pitch * ( (o % steps) / steps );
}
```

### (Optional) Backward-compat wrapper

If you previously called `crossZ` with many unused XY parameters, you can keep those calls working:

```js
// Legacy signature: crossZ(o, steps, cx, cy, armW, armT, stemH, stemT, amp, phase, zCenter, pitch)
// This wrapper ignores the XY params and forwards the last four.
function crossZ_legacy(o, steps, _cx, _cy, _armW, _armT, _stemH, _stemT, amp, phase = 0, zCenter = 0, pitch = 0){
  return crossZ(o, steps, amp, phase, zCenter, pitch);
}
```

---

## Usage in Funebra

**Example:** using the same `steps = 12 * 30` as `crossX/crossY`

```
X(o): crossX(o, 30, 300, 360, 240, 60, 200, 60, -240/6, Math.PI/8)
Y(o): crossY(o, 30, 300, 360, 240, 60, 200, 60, -240/6, Math.PI/8)
Z(o): crossZ(o, 12*30, 40, 0, 0, 60)
```

This adds a **sinusoidal Z** with amplitude `40`, centered at `0`, and a **helical rise** of `+60` units over one full loop.

---

## Tips

* Keep `steps` consistent with your XY loop (`sides * stepsPerEdge`, `12 * stepsPerEdge`, etc.).
* `phase` lets you rotate the wave relative to XY.
* Set `pitch = 0` for a pure ripple; increase `pitch` for spiral/helix effects.
* Works equally well with other outlines if you reuse their total steps.

---

## See Also

* [crossX](crossX.md) — x-coordinate for Latin cross
* [crossY](crossY.md) — y-coordinate for Latin cross
* [math-helpers index](../math-helpers.md)

---
