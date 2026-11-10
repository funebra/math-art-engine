/*
 * FUNEBRA LeLaDeres A1.1.07 — A2-prep native mesh sampler.
 * No imports, libraries, Canvas, WebGL, or Three.js.
 * Feed the derived OBJ through Geometry98's existing PaintV..X point painter.
 */
(function (root) {
  "use strict";

  function parseOBJ(text) {
    const vertices = [], faces = [];
    for (const line of text.split(/\r?\n/)) {
      const fields = line.trim().split(/\s+/);
      if (fields[0] === "v") {
        const v = fields.slice(1, 4).map(Number);
        if (v.length !== 3 || !v.every(Number.isFinite)) throw Error("Invalid OBJ vertex");
        vertices.push(v);
      } else if (fields[0] === "f") {
        const ids = fields.slice(1).map(token => {
          const index = Number(token.split("/")[0]);
          return index > 0 ? index - 1 : vertices.length + index;
        });
        for (let i = 1; i + 1 < ids.length; i++) faces.push([ids[0], ids[i], ids[i + 1]]);
      }
    }
    if (!vertices.length || !faces.length) throw Error("OBJ has no vertices or faces");
    for (const f of faces) for (const id of f) {
      if (id < 0 || id >= vertices.length) throw Error("OBJ face index is out of range");
    }
    return { vertices, faces };
  }

  function uniquePoints(points) {
    const seen = new Set();
    return points.filter(p => {
      const key = p.map(v => Math.round(v * 1000)).join(",");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function wireframePoints(mesh, spacing = 2) {
    if (!(spacing > 0)) throw Error("Spacing must be positive");
    const seenEdges = new Set(), points = [];
    for (const [a, b, c] of mesh.faces) {
      for (const [i, j] of [[a, b], [b, c], [c, a]]) {
        const edgeKey = i < j ? `${i}:${j}` : `${j}:${i}`;
        if (seenEdges.has(edgeKey)) continue;
        seenEdges.add(edgeKey);
        const A = mesh.vertices[i], B = mesh.vertices[j];
        const length = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const segments = Math.max(1, Math.ceil(length / spacing));
        for (let k = 0; k <= segments; k++) {
          const t = k / segments;
          points.push(A.map((v, axis) => v + (B[axis] - v) * t));
        }
      }
    }
    return uniquePoints(points);
  }

  function stipplePoints(mesh, spacing = 3) {
    if (!(spacing > 0)) throw Error("Spacing must be positive");
    const points = [];
    for (const [ia, ib, ic] of mesh.faces) {
      const A = mesh.vertices[ia], B = mesh.vertices[ib], C = mesh.vertices[ic];
      const longest = Math.max(
        Math.hypot(B[0] - A[0], B[1] - A[1]),
        Math.hypot(C[0] - B[0], C[1] - B[1]),
        Math.hypot(A[0] - C[0], A[1] - C[1])
      );
      const divisions = Math.max(1, Math.ceil(longest / spacing));
      for (let row = 0; row <= divisions; row++) {
        for (let col = 0; col + row <= divisions; col++) {
          const wb = col / divisions, wc = row / divisions, wa = 1 - wb - wc;
          points.push(A.map((_, axis) => wa * A[axis] + wb * B[axis] + wc * C[axis]));
        }
      }
    }
    return uniquePoints(points);
  }

  function paintVxBatch(points) {
    if (!points.length) throw Error("Cannot render an empty point stream");
    return {
      count: points.length,
      steps: 1,
      start: 0,
      end: points.length - 1,
      scodeX: `(${JSON.stringify(points.map(p => p[0]))})[o-1]`,
      scodeY: `(${JSON.stringify(points.map(p => p[1]))})[o-1]`,
      scodeZ: `(${JSON.stringify(points.map(p => p[2]))})[o-1]`
    };
  }

  function install(batch, doc = root.document) {
    const ids = ["steps", "stpStart", "stpEnd", "scodeX", "scodeY", "scodeZ"];
    const fields = Object.fromEntries(ids.map(id => {
      const el = doc.getElementById(id);
      if (!el) throw Error(`Geometry98 control not found: ${id}`);
      return [id, el];
    }));
    const previous = Object.fromEntries(ids.map(id => [id, fields[id].value]));
    fields.steps.value = String(batch.steps);
    fields.stpStart.value = String(batch.start);
    fields.stpEnd.value = String(batch.end);
    fields.scodeX.value = batch.scodeX;
    fields.scodeY.value = batch.scodeY;
    fields.scodeZ.value = batch.scodeZ;
    return {
      count: batch.count,
      paint() {
        if (typeof root.mvx !== "function") throw Error("Geometry98 PaintV..X (mvx) is unavailable");
        root.mvx();
      },
      restore() {
        for (const id of ids) fields[id].value = previous[id];
      }
    };
  }

  root.FunebraA2MeshNative = { parseOBJ, wireframePoints, stipplePoints, paintVxBatch, install };
})(window);
