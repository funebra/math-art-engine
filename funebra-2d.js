// https://funebra.github.io/math-art-engine/funebra-2d.js
// Lightweight vector layer + scene for Funebra math-art engine.
// No external dependencies. Works in modern browsers.

export class Funebra2DLayer {
  constructor({
    name = "layer",
    paths = [],             // array of path command lists
    fill = null,            // CSS color or null
    stroke = "#000000",
    strokeWidth = 1,
    blend = "source-over",  // canvas globalCompositeOperation
    opacity = 1.0,
    visible = true
  } = {}) {
    this.name = name;
    this.paths = paths; // each path is an array of commands {cmd:'M'|'L'|'C'|'Q'|'Z', x, y, x1, y1, ...}
    this.fill = fill;
    this.stroke = stroke;
    this.strokeWidth = strokeWidth;
    this.blend = blend;
    this.opacity = opacity;
    this.visible = visible;
  }

  // Add a path (array of commands) to this layer
  addPath(cmds) {
    this.paths.push(cmds);
    return this;
  }

  // Clear all paths
  clear() {
    this.paths.length = 0;
    return this;
  }

  // Convert path commands into Canvas2D Path2D
  static pathCommandsToPath2D(cmds) {
    const p = new Path2D();
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      switch (c.cmd) {
        case "M": p.moveTo(c.x, c.y); break;
        case "L": p.lineTo(c.x, c.y); break;
        case "C": p.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y); break;
        case "Q": p.quadraticCurveTo(c.x1, c.y1, c.x, c.y); break;
        case "A": // arc: {cmd:'A', x, y, r, start, end, anticlockwise}
          p.arc(c.x, c.y, c.r, c.start, c.end, !!c.anticlockwise);
          break;
        case "Z": p.closePath(); break;
        default: console.warn("Unknown path cmd", c); break;
      }
    }
    return p;
  }

  // Render this layer onto CanvasRenderingContext2D
  render(ctx, { transform = null } = {}) {
    if (!this.visible) return;
    ctx.save();
    ctx.globalCompositeOperation = this.blend;
    ctx.globalAlpha = this.opacity;
    if (transform) ctx.setTransform(...transform); // expects DOMMatrix-like array [a,b,c,d,e,f]

    for (const cmds of this.paths) {
      const p = Funebra2DLayer.pathCommandsToPath2D(cmds);
      if (this.fill) {
        ctx.fillStyle = this.fill;
        ctx.fill(p);
      }
      if (this.stroke && this.strokeWidth > 0) {
        ctx.lineWidth = this.strokeWidth;
        ctx.strokeStyle = this.stroke;
        ctx.stroke(p);
      }
    }

    ctx.restore();
  }

  // Convert layer to SVG fragment string (relative coordinates assumed)
  toSVG({ width = 512, height = 512 } = {}) {
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    const gAttrs = [`opacity="${this.opacity}"`, `style="mix-blend-mode:${this.blend}"`].join(" ");
    const pathsSVG = this.paths.map(cmds => {
      let d = "";
      for (const c of cmds) {
        switch (c.cmd) {
          case "M": d += `M ${c.x} ${c.y} `; break;
          case "L": d += `L ${c.x} ${c.y} `; break;
          case "C": d += `C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y} `; break;
          case "Q": d += `Q ${c.x1} ${c.y1} ${c.x} ${c.y} `; break;
          case "A": d += `A ${c.r} ${c.r} 0 ${c.large?1:0} ${c.anticlockwise?0:1} ${c.x} ${c.y} `; break;
          case "Z": d += `Z `; break;
        }
      }
      const fillAttr = this.fill ? `fill="${esc(this.fill)}"` : `fill="none"`;
      const strokeAttr = this.stroke ? `stroke="${esc(this.stroke)}" stroke-width="${this.strokeWidth}"` : `stroke="none"`;
      return `<path d="${d.trim()}" ${fillAttr} ${strokeAttr} />`;
    }).join("\n");
    return `<g id="${esc(this.name)}" ${gAttrs}>${pathsSVG}</g>`;
  }
}

// Scene/compositor for layers
export class Funebra2DScene {
  constructor({ width = 1024, height = 1024, background = null } = {}) {
    this.width = width;
    this.height = height;
    this.background = background;
    this.layers = [];
  }

  addLayer(layer) {
    this.layers.push(layer);
    return layer;
  }

  removeLayerByName(name) {
    this.layers = this.layers.filter(l => l.name !== name);
  }

  clear() {
    this.layers.length = 0;
  }

  // Render to an existing canvas (CanvasRenderingContext2D)
  renderToCanvas(ctx, { clear = true } = {}) {
    if (clear) {
      ctx.clearRect(0, 0, this.width, this.height);
      if (this.background) {
        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }
    // Default transform: identity. Layers provide absolute pixel coordinates.
    for (const layer of this.layers) {
      layer.render(ctx);
    }
  }

  // Create a canvas element and render into it
  createCanvas({ devicePixelRatio = window.devicePixelRatio || 1 } = {}) {
    const c = document.createElement("canvas");
    const w = this.width, h = this.height;
    c.width = Math.round(w * devicePixelRatio);
    c.height = Math.round(h * devicePixelRatio);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext("2d");
    if (devicePixelRatio !== 1) ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.renderToCanvas(ctx);
    return c;
  }

  // Export as SVG string
  toSVGString() {
    const svgParts = [];
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">`);
    if (this.background) {
      svgParts.push(`<rect width="100%" height="100%" fill="${this.background}" />`);
    }
    for (const layer of this.layers) svgParts.push(layer.toSVG());
    svgParts.push("</svg>");
    return svgParts.join("\n");
  }

  // Export PNG Blob (returns Promise<Blob>)
  exportPNG({ quality = 0.92 } = {}) {
    return new Promise((resolve) => {
      const c = this.createCanvas();
      c.toBlob((blob) => resolve(blob), "image/png", quality);
    });
  }

  // Helper: get THREE.CanvasTexture from scene (for 3D usage)
  toThreeTexture(THREE, { needsUpdate = true, minFilter = null, magFilter = null } = {}) {
    const c = this.createCanvas();
    const tex = new THREE.CanvasTexture(c);
    if (minFilter) tex.minFilter = minFilter;
    if (magFilter) tex.magFilter = magFilter;
    tex.needsUpdate = !!needsUpdate;
    return tex;
  }
}

/* ---------------------------
   Path generator helpers
   Each returns an array of path commands (as accepted by layer.addPath)
   Coordinates are in a user-space rectangle (0..width, 0..height) — scale/translate as needed.
   --------------------------- */

// Rose curve generator (r(θ) = a * cos(kθ))
export function makeRose({
  cx = 256, cy = 256, a = 120, k = 5, segments = 512, closed = true
} = {}) {
  const cmds = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * (Math.PI * 2);
    const r = a * Math.cos(k * t);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    if (i === 0) cmds.push({ cmd: "M", x, y });
    else cmds.push({ cmd: "L", x, y });
  }
  if (closed) cmds.push({ cmd: "Z" });
  return cmds;
}

// Lissajous curve (x = A sin(a t + delta), y = B sin(b t))
export function makeLissajous({
  cx = 256, cy = 256, A = 160, B = 120, a = 3, b = 2, delta = Math.PI / 2, segments = 600
} = {}) {
  const cmds = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * (Math.PI * 2);
    const x = cx + A * Math.sin(a * t + delta);
    const y = cy + B * Math.sin(b * t);
    if (i === 0) cmds.push({ cmd: "M", x, y });
    else cmds.push({ cmd: "L", x, y });
  }
  cmds.push({ cmd: "Z" });
  return cmds;
}

export function makeEllipsePath({ cx=256, cy=256, rx=120, ry=80, segments=64 } = {}) {
  const cmds = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * (Math.PI * 2);
    const x = cx + rx * Math.cos(t);
    const y = cy + ry * Math.sin(t);
    if (i === 0) cmds.push({ cmd: "M", x, y });
    else cmds.push({ cmd: "L", x, y });
  }
  cmds.push({ cmd: "Z" });
  return cmds;
}

export function makePolygon({ cx=256, cy=256, radius=120, sides=5, rotation=0 } = {}) {
  const cmds = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * (Math.PI * 2);
    const x = cx + radius * Math.cos(a);
    const y = cy + radius * Math.sin(a);
    if (i === 0) cmds.push({ cmd: "M", x, y });
    else cmds.push({ cmd: "L", x, y });
  }
  cmds.push({ cmd: "Z" });
  return cmds;
}
