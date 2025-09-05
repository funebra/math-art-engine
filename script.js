/* Created 09:00:00 thu 28.08.2025

   applies with any of the pLabs Graphic viewer and editor
   since 2000 */

function polygonX(o, sides, radius, centerX, stepsPerEdge) {
  const edge = Math.floor(o / stepsPerEdge);
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const x1 = Math.cos(edge * 2 * Math.PI / sides) * radius + centerX;
  const x2 = Math.cos((edge + 1) * 2 * Math.PI / sides) * radius + centerX;
  return (1 - t) * x1 + t * x2; }
function polygonY(o, sides, radius, centerY, stepsPerEdge) {
  const edge = Math.floor(o / stepsPerEdge);
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const y1 = Math.sin(edge * 2 * Math.PI / sides) * radius + centerY;
  const y2 = Math.sin((edge + 1) * 2 * Math.PI / sides) * radius + centerY;
  return (1 - t) * y1 + t * y2; }

function starX(o, sides, outerR, innerR, centerX, stepsPerEdge) {
  const totalPoints = sides * 2;
  const edge = Math.floor(o / stepsPerEdge);
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const angle1 = (edge * 2 * Math.PI) / totalPoints;
  const angle2 = ((edge + 1) * 2 * Math.PI) / totalPoints;

  const r1 = edge % 2 === 0 ? outerR : innerR;
  const r2 = (edge + 1) % 2 === 0 ? outerR : innerR;

  const x1 = Math.cos(angle1) * r1 + centerX;
  const x2 = Math.cos(angle2) * r2 + centerX;

  return (1 - t) * x1 + t * x2;
}

function starY(o, sides, outerR, innerR, centerY, stepsPerEdge) {
  const totalPoints = sides * 2;
  const edge = Math.floor(o / stepsPerEdge);
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const angle1 = (edge * 2 * Math.PI) / totalPoints;
  const angle2 = ((edge + 1) * 2 * Math.PI) / totalPoints;

  const r1 = edge % 2 === 0 ? outerR : innerR;
  const r2 = (edge + 1) % 2 === 0 ? outerR : innerR;

  const y1 = Math.sin(angle1) * r1 + centerY;
  const y2 = Math.sin(angle2) * r2 + centerY;

  return (1 - t) * y1 + t * y2;
}

function spiroX(t, R, r, d, centerX) {
  return (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t) + centerX;
}

function spiroY(t, R, r, d, centerY) {
  return (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t) + centerY;
}

function lissajousX(t, A, a, delta, centerX) {
  return A * Math.sin(a * t + delta) + centerX;
}

function lissajousY(t, B, b, centerY) {
  return B * Math.sin(b * t) + centerY;
}
function circleX(t, radius, centerX) {
  return Math.cos(t) * radius + centerX;
}

function circleY(t, radius, centerY) {
  return Math.sin(t) * radius + centerY;
}

function ellipseX(t, rx, centerX) {
  return Math.cos(t) * rx + centerX;
}

function ellipseY(t, ry, centerY) {
  return Math.sin(t) * ry + centerY;
}

function roseX(t, k, r, centerX) {
  return r * Math.cos(k * t) * Math.cos(t) + centerX;
}

function roseY(t, k, r, centerY) {
  return r * Math.cos(k * t) * Math.sin(t) + centerY;
}


/**
 * Triangle interpolation along edges
 * @param {number} o - step index
 * @param {Array} vertices - [[x1,y1], [x2,y2], [x3,y3]]
 * @param {number} stepsPerEdge - number of interpolation steps per edge
 */
function triX(o, vertices, stepsPerEdge) {
  const edge = Math.floor(o / stepsPerEdge) % 3;       // 0,1,2 for each edge
  const t = (o % stepsPerEdge) / stepsPerEdge;         // interpolation factor 0..1

  const [x1, y1] = vertices[edge];
  const [x2, y2] = vertices[(edge + 1) % 3];

  return (1 - t) * x1 + t * x2;
}

function triY(o, vertices, stepsPerEdge) {
  const edge = Math.floor(o / stepsPerEdge) % 3;
  const t = (o % stepsPerEdge) / stepsPerEdge;

  const [x1, y1] = vertices[edge];
  const [x2, y2] = vertices[(edge + 1) % 3];

  return (1 - t) * y1 + t * y2;
}
/*

usage
const side = 200;
const h = Math.sqrt(3) / 2 * side;
const equilateralVerts = [
  [300, 100],              
  [300 - side/2, 100 + h], 
  [300 + side/2, 100 + h]  
];

const x = triX(o, equilateralVerts, 50);
const y = triY(o, equilateralVerts, 50);

const side = 200;
const h = Math.sqrt(3) / 2 * side;
const equilateralVerts = [
  [300, 100],              // top
  [300 - side/2, 100 + h], // bottom-left
  [300 + side/2, 100 + h]  // bottom-right
];

const x = triX(o, equilateralVerts, 50);
const y = triY(o, equilateralVerts, 50);


const rightVerts = [
  [100, 100],  // right angle corner
  [300, 100],  // base corner
  [100, 300]   // height corner
];

const x = triX(o, rightVerts, 40);
const y = triY(o, rightVerts, 40);


const scaleneVerts = [
  [150, 120],
  [400, 200],
  [250, 350]
];

const x = triX(o, scaleneVerts, 60);
const y = triY(o, scaleneVerts, 60);


*/



/**
 * Square wave generator
 * @param {number} t - time or step
 * @param {number} amplitude - wave height
 * @param {number} period - length of one full cycle
 * @param {number} centerY - vertical shift
 * @returns {number} y value
 */
function squareWave(t, amplitude, period, centerY = 0) {
  const half = period / 2;
  return (t % period < half ? amplitude : -amplitude) + centerY;
}



/**

   examples

  // Basic square wave oscillating between -50 and +50
     squareWave(o, 50, 40, 0);

  // A shifted wave oscillating between 310 and 410
     squareWave(o, 50, 40, 360);


 */


function squareX(o, stepSize) {
  return o * stepSize; // x moves forward steadily
}

function squareY(o, amplitude, period, centerY) {
  return squareWave(o, amplitude, period, centerY);
}


/**
 * Wave generator
 * @param {string} type - "sine", "square", "triangle", "sawtooth"
 * @param {number} t - time or step
 * @param {number} amplitude - wave height
 * @param {number} period - length of one full cycle
 * @param {number} centerY - vertical shift
 */
function wave(type, t, amplitude, period, centerY = 0) {
  const phase = (t % period) / period; // normalized 0..1 within cycle

  switch (type) {
    case "sine":
      return Math.sin(phase * 2 * Math.PI) * amplitude + centerY;

    case "square":
      return (phase < 0.5 ? amplitude : -amplitude) + centerY;

    case "triangle":
      return (4 * amplitude * Math.abs(phase - 0.5) - amplitude) + centerY;

    case "sawtooth":
      return (2 * amplitude * (phase - 0.5)) + centerY;

    default:
      return centerY; // fallback: flat line
  }
}

/**

// Square wave bouncing between 310 and 410
wave("square", o, 50, 40, 360);

// Sine wave between 310 and 410
wave("sine", o, 50, 40, 360);

// Triangle wave between 310 and 410
wave("triangle", o, 50, 40, 360);

// Sawtooth wave
wave("sawtooth", o, 50, 40, 360);


 */


function waveX(o, stepSize) {
  return o * stepSize; // steady increase in x
}

function waveY(o, type, amplitude, period, centerY) {
  return wave(type, o, amplitude, period, centerY);
}
 
/**



 */


function currenceX(i, stepSize) {
  return i * stepSize; // each data point moves X forward
}

function currenceeY(rate, minRate, maxRate, height, centerY) {
  // normalize rate between 0..1, then map to chart height
  const norm = (rate - minRate) / (maxRate - minRate);
  return centerY + height/2 - norm * height;
}
const apiKey = "e23a6faffb38bb0618740b7b";

// Parametric wave helpers
function curwaveX(i, stepSize) {
  return i * stepSize;
}

function curwaveY(rate, minRate, maxRate, height, centerY) {
  const norm = (rate - minRate) / (maxRate - minRate);
  return centerY - norm * height;
}


// Generic parametric curve wrapper
function makeParametric(xFunc, yFunc) {
  return {
    x: (o, steps, ...params) => {
      const t = (o / steps) * 2 * Math.PI; // normalized angle/phase
      return xFunc(t, ...params);
    },
    y: (o, steps, ...params) => {
      const t = (o / steps) * 2 * Math.PI;
      return yFunc(t, ...params);
    }
  };
}

const circle = makeParametric(
  (t, r, cx) => Math.cos(t) * r + cx,
  (t, r, cy) => Math.sin(t) * r + cy
);
/**
// Usage (o = step index):
circle.x(o, 360, 100, 200); // radius=100, centerX=200
circle.y(o, 360, 100, 200);
*/


const rose = makeParametric(
  (t, k, r, cx) => r * Math.cos(k * t) * Math.cos(t) + cx,
  (t, k, r, cy) => r * Math.cos(k * t) * Math.sin(t) + cy
);
/**
// 5-petal rose:
rose.x(o, 720, 5, 150, 200);
rose.y(o, 720, 5, 150, 200);
*/

const spiro = makeParametric(
  (t, R, r, d, cx) => (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t) + cx,
  (t, R, r, d, cy) => (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t) + cy
);
/**
// Hypotrochoid:
spiro.x(o, 2000, 100, 30, 40, 200);
spiro.y(o, 2000, 100, 30, 40, 200);
*/










function makeParametric3D(xFunc, yFunc, zFunc) {
  return {
    x: (o, steps, ...params) => {
      const t = (o / steps) * 2 * Math.PI;
      return xFunc(t, ...params);
    },
    y: (o, steps, ...params) => {
      const t = (o / steps) * 2 * Math.PI;
      return yFunc(t, ...params);
    },
    z: (o, steps, ...params) => {
      const t = (o / steps) * 2 * Math.PI;
      return zFunc(t, ...params);
    }
  };
}


const rose3D = makeParametric3D(
  (t, k, r, cx) => r * Math.cos(k * t) * Math.cos(t) + cx,
  (t, k, r, cy) => r * Math.cos(k * t) * Math.sin(t) + cy,
  (t, k, r, cz, h = 10) => h * t + cz
);


/**

// Draw a 3D rose with 5 petals
rose3D.x(o, 720, 5, 150, 0);    // k=5, r=150, cx=0
rose3D.y(o, 720, 5, 150, 0);    // cy=0
rose3D.z(o, 720, 5, 150, 0, 20); // cz=0, h=20


*/


const chaos = makeParametric(
  (t) => Math.random() * 500,  // Random x position
  (t) => Math.random() * 500  // Random y position
);





/**
 * Cube edge point generator (wireframe, dotted)
 * @param {number} t - step index (0..N-1)
 * @param {number} size - cube side length
 * @param {number} centerX - horizontal offset
 * @param {number} centerY - vertical offset
 * @param {number} stepsPerEdge - how many dots per edge
 * @returns {{x:number, y:number}}
 */
function cube(t, size, centerX = 0, centerY = 0, stepsPerEdge = 10) {
  const half = size / 2;

  // 3D cube vertices
  const V = [
    [-half, -half, -half], // 0
    [ half, -half, -half], // 1
    [ half,  half, -half], // 2
    [-half,  half, -half], // 3
    [-half, -half,  half], // 4
    [ half, -half,  half], // 5
    [ half,  half,  half], // 6
    [-half,  half,  half], // 7
  ];

  // edges as vertex index pairs
  const edges = [
    [0,1],[1,2],[2,3],[3,0], // bottom
    [4,5],[5,6],[6,7],[7,4], // top
    [0,4],[1,5],[2,6],[3,7]  // verticals
  ];

  const edgeIndex = Math.floor(t / stepsPerEdge) % edges.length;
  const localT = (t % stepsPerEdge) / stepsPerEdge;

  const [i1, i2] = edges[edgeIndex];
  const [x1, y1, z1] = V[i1];
  const [x2, y2, z2] = V[i2];

  // interpolate along the edge
  const x3d = (1 - localT) * x1 + localT * x2;
  const y3d = (1 - localT) * y1 + localT * y2;
  const z3d = (1 - localT) * z1 + localT * z2;

  // simple 3D → 2D projection
  const x2d = centerX + x3d + 0.5 * z3d;
  const y2d = centerY - y3d - 0.3 * z3d;

  return { x: x2d, y: y2d };
}




/**

usage

for (let o = 0; o < 120; o++) {
  const p = cube(o, 200, 400, 300, 10);
  drawDot(p.x, p.y);
}


*/
/**



*/
/**
// Fetch EUR rate for given date using history endpoint
async function fetchEURRateOn(dateStr, apiKey) {
  const [year, month, day] = dateStr.split('-');
  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD/`;
  const res = await fetch(url);
  const json = await res.json();
  return json.conversion_rates;
}


/**
async function getLastMonthRates(apiKey) {
  const rates = [];
  const today = new Date();
  for (let d = 30; d >= 0; d--) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - d);
    const iso = dt.toISOString().slice(0, 10);
    const rate = await fetchEURRateOn(iso, apiKey);
    rates.push({ date: iso, rate });
  }
  */
  
  
  
  /*
  async function getLastMonthRates() {
  const today = new Date().toISOString().slice(0, 10);
  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 30);
  const start = lastMonth.toISOString().slice(0, 10);

  const url = `https://api.frankfurter.app/${start}..${today}?from=USD&to=EUR`;
  const res = await fetch(url);
  const json = await res.json();

  return Object.entries(json.rates).map(([date, obj]) => ({
    date,
    rate: obj.EUR
  }));
}

  return rates;
}

// Main: gather data and map to points
async function buildEURWavePoints(apiKey) {
  const data = await getLastMonthRates(apiKey);
  const rates = data.map(d => d.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const stepSize = 10;     // horizontal spacing
  const height = 200;
  const centerY = 300;

  return data.map((d, i) => ({
    x: curwaveX(i, stepSize),
    y: curwaveY(d.rate, minRate, maxRate, height, centerY),
    date: d.date,
    rate: d.rate
  }));
}
 */










    async function getLastMonthRates() {
      const today = new Date().toISOString().slice(0, 10);
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      const start = lastMonth.toISOString().slice(0, 10);

      const url = `https://api.frankfurter.app/${start}..${today}?from=USD&to=EUR`;
      console.log("Fetching:", url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();

      return Object.entries(json.rates).map(([date, obj]) => ({
        date,
        rate: obj.EUR
      }));
    }
async function getEURWaveX() {
  const data = await getLastMonthRates();

  const stepSize = 1; // you can adjust this if your tool needs scaling
  return data.map((d, i) => waveX(i, stepSize));
}

async function getEURWaveY() {
  const data = await getLastMonthRates();

  const rates = data.map(d => d.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const height = 100;  // arbitrary scale for your plotting tool
  const centerY = 50;  // baseline shift

  return data.map(d => waveY(d.rate, minRate, maxRate, height, centerY));
}

// Initialize global arrays
    async function initEURWave() {
      const data = await getLastMonthRates();

      // X values
      const stepSize = 1;
      eurXVals = data.map((d, i) => curwaveX(i, stepSize));

      // Y values
      const rates = data.map(d => d.rate);
      const minRate = Math.min(...rates);
      const maxRate = Math.max(...rates);
      const height = 100;  // scale
      const centerY = 50;

      eurYVals = data.map(d => waveY(d.rate, minRate, maxRate, height, centerY));
      ready = true;

      // Show preview in the page
      const out = data.slice(0, 100).map((d, i) => {
        return `(${eurXVals[i].toFixed(2)}, ${eurYVals[i].toFixed(2)}) -> rate=${d.rate}`;
      }).join("\n");
      //document.getElementById("bn1").textContent = out;
    }

    // Public functions for plotting tool
    function eurX(o) {
      if (!ready) return 0;
      return eurXVals[o] ?? 0;
    }
    function eurY(o) {
      if (!ready) return 0;
      return eurYVals[o] ?? 0;
    }