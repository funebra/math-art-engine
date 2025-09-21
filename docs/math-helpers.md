# Funebra Math Helpers Reference

This is the official reference for plotting helpers in the **Funebra Math-Art Engine**.

Helpers are small JavaScript functions that return **X(o)**, **Y(o)**, and optionally **Z(o)** for a step index `o`. They are the building blocks for plotting polygons, stars, crosses, pyramids, and more.

---

## Index of Helpers

- [polygonX](helpers/polygonX.md) / [polygonY](helpers/polygonY.md)
- [starX](helpers/starX.md) / [starY](helpers/starY.md)
- [crossX](helpers/crossX.md), [crossY](helpers/crossY.md), [crossZ](helpers/crossZ.md)
- [pyramidX](helpers/pyramidX.md), [pyramidY](helpers/pyramidY.md), [pyramidZ](helpers/pyramidZ.md)
- [heart2D](helpers/heart2D.md)
- [triX](helpers/triX.md) / [triY](helpers/triY.md)
- [cube](helpers/cube.md)

---

## Quick usage

```js
const TAU = Math.PI * 2;

// Example: 5-point star
Steps: 10*36
X(o): starX(o, 5, 150, 70, 360, 36)
Y(o): starY(o, 5, 150, 70, 260, 36)
Z(o): 0
