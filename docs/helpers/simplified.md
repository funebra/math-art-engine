# The Triquetra


# JavaScript Code Snippet: Animated Rotating Triangle

Below is an annotated and formatted JavaScript snippet that creates an animated, rotating geometric shape using HTML `<div>` elements and 2D trigonometric transformations.

```javascript
(() => {
  // Array to store the DOM dot elements
  const dots = [];
  let angle = 0;
  const speed = 0.01;
  const totalPoints = 3; // 3 vertices form an equilateral triangle

  // Create 100 dot elements and append them to the DOM
  for (let o = 0; o < 100; o++) {
    const d = document.createElement("div");
    d.id = "bn" + o;
    d.style.position = "absolute";
    d.innerHTML = "&#149;"; // Bullet point character
    document.body.appendChild(d);
    dots.push(d);
  }

  // Animation loop updating positions on every frame
  function anim() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const CX = W * 0.5;
    const CY = H * 0.5;

    angle += speed;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let o = 0; o < 100; o++) {
      const edge = Math.floor(o / 20);
      const t = (o % 20) / 20;

      // Calculate angles for current edge endpoints
      const angle1 = (edge * 2 * Math.PI) / totalPoints;
      const angle2 = ((edge + 1) * 2 * Math.PI) / totalPoints;

      // Unused radial toggles (can be expanded for dynamic star shapes)
      const r1 = edge % 2 === 0 ? 120 : 50;
      const r2 = (edge + 1) % 2 === 0 ? 120 : 50;

      // Compute base vertex positions (Radius = 120px)
      const x1 = Math.cos(angle1) * 120;
      const x2 = Math.cos(angle2) * 120;
      const y1 = Math.sin(angle1) * 120;
      const y2 = Math.sin(angle2) * 120;

      // Linearly interpolate between vertices along the edge
      const x = (1 - t) * x1 + t * x2;
      const y = (1 - t) * y1 + t * y2;

      // Apply 2D rotation and vertical sine oscillation
      const xr = x * cosA - y * sinA;
      const yr = x * sinA + y * cosA + sinA * 54;

      // Set final screen coordinates centered on screen
      dots[o].style.left = xr + CX + "px";
      dots[o].style.top = yr + CY + "px";
    }

    requestAnimationFrame(anim);
  }

  // Start the animation loop
  anim();
})();
```

## Key Code Concepts

| Concept | Implementation | Explanation |
| :--- | :--- | :--- |
| **DOM Generation** | `document.createElement("div")` | Dynamically creates 100 elements containing bullet points (`&#149;`). |
| **Edge Interpolation** | `x = (1 - t) * x1 + t * x2` | Uses linear interpolation to distribute dots evenly along shape edges. |
| **2D Matrix Rotation** | `xr = x * cosA - y * sinA` | Rotates original $x, y$ coordinates around the origin using standard trigonometric identities. |
| **Vertical Oscillation** | `+ sinA * 54` | Adds a sinusoidal displacement to the $y$-axis to produce a subtle bobbing motion. |
| **Animation Loop** | `requestAnimationFrame(anim)` | Smoothly schedules frame updates synchronized with the browser refresh rate. |
javascript_animation.md
Displaying javascript_animation.md.
