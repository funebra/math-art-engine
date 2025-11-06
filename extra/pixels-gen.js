// pixels-gen.js
// Build a CSS box-shadow string from a 2D "pixel" matrix.
// Each matrix cell is an index into `palette` (string CSS colors).
// Use null / undefined / -1 to mean transparent (skip).

export function boxShadowFromMatrix(matrix, palette) {
  if (!Array.isArray(matrix) || matrix.length === 0) return "";
  const shadows = [];
  for (let y = 0; y < matrix.length; y++) {
    const row = matrix[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < row.length; x++) {
      const idx = row[x];
      if (idx == null || idx === -1) continue;
      const color = palette[idx];
      if (!color || color === "transparent") continue;
      // No blur/spread — the element is 1×1; scale the wrapper for size.
      shadows.push(`${x}px ${y}px 0 0 ${color}`);
    }
  }
  return shadows.join(",\n");
}

// Apply to an element that has the 1×1 base style (your .pixels class).
export function applyPixels(el, matrix, palette, { title } = {}) {
  const boxShadow = boxShadowFromMatrix(matrix, palette);
  el.style.boxShadow = boxShadow;
  if (title) el.setAttribute("aria-label", title);
  return boxShadow;
}

// Optional: build a matrix from ASCII art where each char maps to a palette index.
export function matrixFromAscii(lines, legend) {
  // legend: { '.': -1, 'A': 0, 'B': 1, ... }
  return lines.map(line => [...line].map(ch => (ch in legend ? legend[ch] : -1)));
}
