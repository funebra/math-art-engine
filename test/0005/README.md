// 1) Text
const gamez = funebraText("GAMEZ", { step: 12 });
console.log("GAMEZ points:", gamez.length / 3);  // number of points

// 2) Image sprite
(async () => {
  window.fpHead = await funebraPixelsFromImage(
    "./2025-11-14_134226_.png",   // or "./2025-10-21_061658.png"
    {
      targetHeight: 150,
      threshold: 210,
      step: 1,
    }
  );
  console.log("fpHead points:", fpHead.length / 3);
})();
