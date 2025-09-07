
/* ========= GLOBALS ========= */
let eurXVals = [], eurYVals = [], ready = false;

/* ========= MATH HELPERS (non-module) ========= */
function polygonX(o, sides, radius, centerX, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  return (1-t) * (Math.cos(a1)*radius + centerX) + t * (Math.cos(a2)*radius + centerX);
}
function polygonY(o, sides, radius, centerY, stepsPerEdge){
  const edge = Math.floor(o / stepsPerEdge);
  const t    = (o % stepsPerEdge) / stepsPerEdge;
  const a1   = (edge     * 2*Math.PI) / sides;
  const a2   = ((edge+1) * 2*Math.PI) / sides;
  return (1-t) * (Math.sin(a1)*radius + centerY) + t * (Math.sin(a2)*radius + centerY);
}

function starX(o, sides, outerR, innerR, centerX, stepsPerEdge){
  const total = sides*2, edge = Math.floor(o/stepsPerEdge), t=(o%stepsPerEdge)/stepsPerEdge;
  const a1=(edge*2*Math.PI)/total, a2=((edge+1)*2*Math.PI)/total;
  const r1 = edge%2===0 ? outerR : innerR;
  const r2 = (edge+1)%2===0 ? outerR : innerR;
  return (1-t)*(Math.cos(a1)*r1 + centerX) + t*(Math.cos(a2)*r2 + centerX);
}
function starY(o, sides, outerR, innerR, centerY, stepsPerEdge){
  const total = sides*2, edge = Math.floor(o/stepsPerEdge), t=(o%stepsPerEdge)/stepsPerEdge;
  const a1=(edge*2*Math.PI)/total, a2=((edge+1)*2*Math.PI)/total;
  const r1 = edge%2===0 ? outerR : innerR;
  const r2 = (edge+1)%2===0 ? outerR : innerR;
  return (1-t)*(Math.sin(a1)*r1 + centerY) + t*(Math.sin(a2)*r2 + centerY);
}

function squareWave(t, A, period, cy=0){ return ((t%period) < period/2 ? A : -A) + cy; }
function wave(type, t, A, period, cy=0){
  const ph=(t%period)/period;
  if(type==="sine")     return Math.sin(ph*2*Math.PI)*A + cy;
  if(type==="square")   return (ph<.5?A:-A) + cy;
  if(type==="triangle") return (4*A*Math.abs(ph-.5)-A) + cy;
  if(type==="sawtooth") return (2*A*(ph-.5)) + cy;
  return cy;
}
function waveX(o, step){ return o*step; }
function waveY(o, type, A, period, cy){ return wave(type, o, A, period, cy); }

/* Currency helpers (use THESE with EUR data) */
function curwaveX(i, step){ return i*step; }
function curwaveY(rate, minRate, maxRate, height, centerY){
  const n = (rate - minRate) / (maxRate - minRate || 1);
  return centerY + height/2 - n*height; // screen Y (0 top)
}

/* ========= TRIANGLE EDGES ========= */
function triX(o, verts, stepsPerEdge){
  const e=Math.floor(o/stepsPerEdge)%3, t=(o%stepsPerEdge)/stepsPerEdge;
  return (1-t)*verts[e][0] + t*verts[(e+1)%3][0];
}
function triY(o, verts, stepsPerEdge){
  const e=Math.floor(o/stepsPerEdge)%3, t=(o%stepsPerEdge)/stepsPerEdge;
  return (1-t)*verts[e][1] + t*verts[(e+1)%3][1];
}

/* ========= SIMPLE 3D CUBE → 2D PROJ ========= */
function cube(o, size, cx=0, cy=0, stepsPerEdge=10){
  const h=size/2, V=[[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]];
  const E=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const ei=Math.floor(o/stepsPerEdge)%E.length, t=(o%stepsPerEdge)/stepsPerEdge;
  const [a,b]=E[ei], [x1,y1,z1]=V[a], [x2,y2,z2]=V[b];
  const x=x1+(x2-x1)*t, y=y1+(y2-y1)*t, z=z1+(z2-z1)*t;
  return { x: cx + x + 0.5*z, y: cy - y - 0.3*z };
}

/* ========= EUR DATA (Frankfurter) ========= */
async function getLastMonthRates(){
  const today = new Date().toISOString().slice(0,10);
  const startD = new Date(); startD.setDate(startD.getDate()-30);
  const start = startD.toISOString().slice(0,10);
  const url = `https://api.frankfurter.app/${start}..${today}?from=USD&to=EUR`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Object.entries(json.rates).map(([date,obj]) => ({ date, rate: obj.EUR }));
}

/* Build global arrays your UI can read: eurX(o), eurY(o) */
async function initEURWave(){
  const data = await getLastMonthRates();

  const step = 1;
  eurXVals = data.map((d,i)=>curwaveX(i, step));

  const rates = data.map(d=>d.rate);
  const minR = Math.min(...rates), maxR = Math.max(...rates);
  const height = 100, centerY = 50;

  // FIX: use curwaveY (not waveY)
  eurYVals = data.map(d => curwaveY(d.rate, minR, maxR, height, centerY));

  ready = true;

  // Optional preview
  const out = data.slice(0, 20).map((d,i)=>`(${eurXVals[i].toFixed(1)}, ${eurYVals[i].toFixed(1)}) = ${d.rate}`).join("\n");
  //const el = document.getElementById("bn1");
 // if(el) el.textContent = out;
}

/* Public readers for your plotter */
function eurX(o){ return ready ? (eurXVals[o] ?? 0) : 0; }
function eurY(o){ return ready ? (eurYVals[o] ?? 0) : 0; }

/* ========= HEARTS (non-module, global) ========= */
/* 2D classic heart (parametric) */
function heart2D_x(o, steps=360, s=6, cx=0){
  const t = (o/steps)*2*Math.PI;
  return cx + s*16*Math.pow(Math.sin(t),3);
}
function heart2D_y(o, steps=360, s=6, cy=0){
  const t = (o/steps)*2*Math.PI;
  return cy - s*(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t));
}

/* 3D puffy heart via lathe (single-index sampler) */
function heart3D_steps(U=140, V=96){ return (U+1)*(V+1); }
function _heartProfile(u, scale){
  return {
    x: scale*16*Math.pow(Math.sin(u),3),
    y: scale*(13*Math.cos(u) - 5*Math.cos(2*u) - 2*Math.cos(3*u) - Math.cos(4*u))
  };
}
function _ij(o,U,V){ const cols=V+1; return { i:Math.floor(o/cols), j:o%cols }; }

function heart3D_x(o, steps, scale=0.30, U=140, V=96){
  const {i,j}=_ij(o,U,V); const u=(i/U)*Math.PI, phi=(j/V)*2*Math.PI;
  const r=Math.max(_heartProfile(u,scale).x,0);
  return r*Math.cos(phi);
}
function heart3D_y(o, steps, scale=0.30, U=140, V=96){
  const {i}=_ij(o,U,V); const u=(i/U)*Math.PI;
  return _heartProfile(u,scale).y;
}
function heart3D_z(o, steps, scale=0.30, U=140, V=96){
  const {i,j}=_ij(o,U,V); const u=(i/U)*Math.PI, phi=(j/V)*2*Math.PI;
  const r=Math.max(_heartProfile(u,scale).x,0);
  return r*Math.sin(phi);
}

/* ========= OPTIONAL: kick off EUR fetch on click or load ========= */
// window.addEventListener('load', () => { initEURWave().catch(console.error); });

