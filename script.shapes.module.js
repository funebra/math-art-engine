// script.shapes.module.js — Clean, working build (Numeric 1.0 + Compat namespace)
// ------------------------------------------------------------------------------

const TAU = Math.PI * 2;

// ──────────────────────────────────────────────────────────────────────────────
// Numeric helpers (Funebra 1.0 semantics) — every function returns a Number()
// ──────────────────────────────────────────────────────────────────────────────


// Simple line segment parametric (for connecting points, etc.)
export function lineSegmentX(i, steps = 100, x1 = 0, y1 = 0, x2 = 100, y2 = 0) {
  const t = i / (steps - 1);
  return (1 - t) * x1 + t * x2;
}

export function lineSegmentY(i, steps = 100, x1 = 0, y1 = 0, x2 = 100, y2 = 0) {
  const t = i / (steps - 1);
  return (1 - t) * y1 + t * y2;
}



export function lineX(o, centerX, radius, direction, stepsPerEdge){
  const t = (o % stepsPerEdge) / stepsPerEdge;
  return centerX + Math.cos(direction) * radius * t;
}
export function lineY(o, centerY, radius, direction, stepsPerEdge){
  const t = (o % stepsPerEdge) / stepsPerEdge;
  return centerY + Math.sin(direction) * radius * t;
}

export function circleX(o, radius, centerX=0, totalSteps=360, offset=0){
  const th = ((o % totalSteps) / totalSteps) * TAU + offset;
  return centerX + Math.cos(th) * radius;
}
export function circleY(o, radius, centerY=0, totalSteps=360, offset=0){
  const th = ((o % totalSteps) / totalSteps) * TAU + offset;
  return centerY + Math.sin(th) * radius;
}

export function ellipseX(o, rx, ry, cx=0, cy=0, totalSteps=360, rotation=0, offset=0){
  const th = ((o % totalSteps) / totalSteps) * TAU + offset;
  const cs = Math.cos(th), sn = Math.sin(th);
  const xr = rx * cs, yr = ry * sn;
  const cr = Math.cos(rotation), sr = Math.sin(rotation);
  return cx + xr*cr - yr*sr;
}
export function ellipseY(o, rx, ry, cx=0, cy=0, totalSteps=360, rotation=0, offset=0){
  const th = ((o % totalSteps) / totalSteps) * TAU + offset;
  const cs = Math.cos(th), sn = Math.sin(th);
  const xr = rx * cs, yr = ry * sn;
  const cr = Math.cos(rotation), sr = Math.sin(rotation);
  return cy + xr*sr + yr*cr;
}

// Regular polygon “edge walker”
function _regularPolyX(o, sides, r, cx=0, stepsPerEdge=20, phase=-Math.PI/2){
  const n = Math.max(3, sides|0);
  const e = Math.floor(o / stepsPerEdge);
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = phase + (e     * TAU) / n;
  const a2 = phase + ((e+1) * TAU) / n;
  return (1-t) * (cx + r*Math.cos(a1)) + t * (cx + r*Math.cos(a2));
}
function _regularPolyY(o, sides, r, cy=0, stepsPerEdge=20, phase=-Math.PI/2){
  const n = Math.max(3, sides|0);
  const e = Math.floor(o / stepsPerEdge);
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = phase + (e     * TAU) / n;
  const a2 = phase + ((e+1) * TAU) / n;
  return (1-t) * (cy + r*Math.sin(a1)) + t * (cy + r*Math.sin(a2));
}
export function polygonX(o, sides, radius, centerX=0, stepsPerEdge=20, phase=-Math.PI/2){
  return _regularPolyX(o, sides, radius, centerX, stepsPerEdge, phase);
}
export function polygonY(o, sides, radius, centerY=0, stepsPerEdge=20, phase=-Math.PI/2){
  return _regularPolyY(o, sides, radius, centerY, stepsPerEdge, phase);
}

// Star (alternating radii)
export function starX(o, points, rOuter, rInner, cx=0, stepsPerEdge=20, phase=-Math.PI/2){
  const totalEdges = Math.max(3, points|0) * 2;
  const e = Math.floor(o / stepsPerEdge) % totalEdges;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = phase + (e       * TAU) / totalEdges;
  const a2 = phase + ((e + 1) * TAU) / totalEdges;
  const r1 = (e % 2 === 0) ? rOuter : rInner;
  const r2 = ((e+1) % 2 === 0) ? rOuter : rInner;
  return (1-t) * (cx + r1*Math.cos(a1)) + t * (cx + r2*Math.cos(a2));
}
export function starY(o, points, rOuter, rInner, cy=0, stepsPerEdge=20, phase=-Math.PI/2){
  const totalEdges = Math.max(3, points|0) * 2;
  const e = Math.floor(o / stepsPerEdge) % totalEdges;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const a1 = phase + (e       * TAU) / totalEdges;
  const a2 = phase + ((e + 1) * TAU) / totalEdges;
  const r1 = (e % 2 === 0) ? rOuter : rInner;
  const r2 = ((e+1) % 2 === 0) ? rOuter : rInner;
  return (1-t) * (cy + r1*Math.sin(a1)) + t * (cy + r2*Math.sin(a2));
}

// Generic closed polyline helpers
function _polyPathX(o, verts, stepsPerEdge){
  const n = verts.length;
  const e = Math.floor(o / stepsPerEdge) % n;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [x1] = verts[e];
  const [x2] = verts[(e+1) % n];
  return (1-t)*x1 + t*x2;
}
function _polyPathY(o, verts, stepsPerEdge){
  const n = verts.length;
  const e = Math.floor(o / stepsPerEdge) % n;
  const t = (o % stepsPerEdge) / stepsPerEdge;
  const [,y1] = verts[e];
  const [,y2] = verts[(e+1) % n];
  return (1-t)*y1 + t*y2;
}
function _rot(v, th){ const c=Math.cos(th), s=Math.sin(th); return v.map(([x,y])=>[x*c - y*s, x*s + y*c]); }
function _tx(v, cx, cy){ return v.map(([x,y])=>[x+cx,y+cy]); }

// Rectangle / Square
export function rectangleVertices(w, h, cx=0, cy=0, theta=0){
  const rx=w/2, ry=h/2; let v=[[-rx,-ry],[rx,-ry],[rx,ry],[-rx,ry]]; if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function rectangleX(o, w, h, cx=0, cy=0, stepsPerEdge=20, theta=0){ return _polyPathX(o, rectangleVertices(w,h,cx,cy,theta), stepsPerEdge); }
export function rectangleY(o, w, h, cx=0, cy=0, stepsPerEdge=20, theta=0){ return _polyPathY(o, rectangleVertices(w,h,cx,cy,theta), stepsPerEdge); }
export function squareX(o, size, cx=0, cy=0, stepsPerEdge=20, theta=0){ return rectangleX(o, size, size, cx, cy, stepsPerEdge, theta); }
export function squareY(o, size, cx=0, cy=0, stepsPerEdge=20, theta=0){ return rectangleY(o, size, size, cx, cy, stepsPerEdge, theta); }

// Right triangle
export function rightTriangleVertices(w, h, cx=0, cy=0, theta=0){
  let v=[[-w/2, h/2], [-w/2, -h/2], [w/2, h/2]];
  if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function rightTriangleX(o, w, h, cx=0, cy=0, stepsPerEdge=30, theta=0){ return _polyPathX(o, rightTriangleVertices(w,h,cx,cy,theta), stepsPerEdge); }
export function rightTriangleY(o, w, h, cx=0, cy=0, stepsPerEdge=30, theta=0){ return _polyPathY(o, rightTriangleVertices(w,h,cx,cy,theta), stepsPerEdge); }

// Parallelogram
export function parallelogramVertices(w, h, skew=0.25, cx=0, cy=0, theta=0){
  const dx = w*skew*0.5;
  let v=[[-w/2+dx,-h/2],[w/2+dx,-h/2],[w/2-dx,h/2],[-w/2-dx,h/2]];
  if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function parallelogramX(o, w, h, skew=0.25, cx=0, cy=0, stepsPerEdge=24, theta=0){ return _polyPathX(o, parallelogramVertices(w,h,skew,cx,cy,theta), stepsPerEdge); }
export function parallelogramY(o, w, h, skew=0.25, cx=0, cy=0, stepsPerEdge=24, theta=0){ return _polyPathY(o, parallelogramVertices(w,h,skew,cx,cy,theta), stepsPerEdge); }

// Rhombus
export function rhombusVertices(w, h, cx=0, cy=0, theta=0){
  let v=[[0,-h/2],[w/2,0],[0,h/2],[-w/2,0]]; if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function rhombusX(o, w, h, cx=0, cy=0, stepsPerEdge=24, theta=0){ return _polyPathX(o, rhombusVertices(w,h,cx,cy,theta), stepsPerEdge); }
export function rhombusY(o, w, h, cx=0, cy=0, stepsPerEdge=24, theta=0){ return _polyPathY(o, rhombusVertices(w,h,cx,cy,theta), stepsPerEdge); }

// Trapezoid / Trapezium
export function trapezoidVertices(topW, bottomW, h, cx=0, cy=0, theta=0){
  const t=topW/2, b=bottomW/2, ry=h/2;
  let v=[[-t,-ry],[t,-ry],[b,ry],[-b,ry]]; if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function trapezoidX(o, topW, bottomW, h, cx=0, cy=0, stepsPerEdge=22, theta=0){
  return _polyPathX(o, trapezoidVertices(topW,bottomW,h,cx,cy,theta), stepsPerEdge);
}
export function trapezoidY(o, topW, bottomW, h, cx=0, cy=0, stepsPerEdge=22, theta=0){
  return _polyPathY(o, trapezoidVertices(topW,bottomW,h,cx,cy,theta), stepsPerEdge);
}
export const trapeziumX = trapezoidX;
export const trapeziumY = trapezoidY;

// Kite
export function kiteVertices(w, h, midY=0.1, cx=0, cy=0, theta=0){
  const rx=w/2, ry=h/2;
  let v=[[0,-ry],[rx,midY*h-ry],[0,ry],[-rx,midY*h-ry]];
  if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function kiteX(o, w, h, midY=0.1, cx=0, cy=0, stepsPerEdge=20, theta=0){ return _polyPathX(o, kiteVertices(w,h,midY,cx,cy,theta), stepsPerEdge); }
export function kiteY(o, w, h, midY=0.1, cx=0, cy=0, stepsPerEdge=20, theta=0){ return _polyPathY(o, kiteVertices(w,h,midY,cx,cy,theta), stepsPerEdge); }

// Arrow
export function arrowVertices(w, h, head=0.45, cx=0, cy=0, theta=0){
  const rx=w/2, ry=h/2, hh=Math.max(0.2,Math.min(0.8,head)), shaft=(1-hh)*w;
  let v=[[-rx,-ry*0.3],[-rx+shaft,-ry*0.3],[-rx+shaft,-ry],[rx,0],[-rx+shaft,ry],[-rx+shaft,ry*0.3],[-rx,ry*0.3]];
  if(theta) v=_rot(v,theta); return _tx(v,cx,cy);
}
export function arrowX(o, w, h, head=0.45, cx=0, cy=0, stepsPerEdge=18, theta=0){ return _polyPathX(o, arrowVertices(w,h,head,cx,cy,theta), stepsPerEdge); }
export function arrowY(o, w, h, head=0.45, cx=0, cy=0, stepsPerEdge=18, theta=0){ return _polyPathY(o, arrowVertices(w,h,head,cx,cy,theta), stepsPerEdge); }

// Semicircle (arc + chord)
export function semicircleX(o, r, cx=0, cy=0, totalSteps=180, up=false){
  if (o < totalSteps){ const th=(o/totalSteps)*Math.PI; const a=up?Math.PI - th: th; return cx + r*Math.cos(a); }
  const t=(o-totalSteps)/totalSteps; return cx + (1-t)*r + t*(-r);
}
export function semicircleY(o, r, cx=0, cy=0, totalSteps=180, up=false){
  if (o < totalSteps){ const th=(o/totalSteps)*Math.PI; const a=up?Math.PI - th: th; return cy + r*Math.sin(up?-a:a); }
  return cy;
}

// Oval alias
export function ovalX(o, rx, ry, cx=0, cy=0, totalSteps=360, rotation=0, offset=0){ return ellipseX(o, rx, ry, cx, cy, totalSteps, rotation, offset); }
export function ovalY(o, rx, ry, cx=0, cy=0, totalSteps=360, rotation=0, offset=0){ return ellipseY(o, rx, ry, cx, cy, totalSteps, rotation, offset); }

// Ring: outer circle then inner reversed
export function ringX(o, rOuter, rInner, cx=0, cy=0, totalSteps=720){
  const half = totalSteps>>1;
  return (o < half) ? circleX(o, rOuter, cx, half, 0)
                    : circleX(half-1-(o-half), rInner, cx, half, 0);
}
export function ringY(o, rOuter, rInner, cx=0, cy=0, totalSteps=720){
  const half = totalSteps>>1;
  return (o < half) ? circleY(o, rOuter, cy, half, 0)
                    : circleY(half-1-(o-half), rInner, cy, half, 0);
}

// Crescent: outer arc + inner arc (reversed) with x-offset
export function crescentX(o, r=60, offset=20, cx=0, cy=0, totalSteps=512){
  const half=totalSteps>>1; if(o<half) return circleX(o, r, cx, half, 0);
  const r2=Math.abs(r-offset); return circleX(half-1-(o-half), r2, cx - offset, half, 0);
}
export function crescentY(o, r=60, offset=20, cx=0, cy=0, totalSteps=512){
  const half=totalSteps>>1; if(o<half) return circleY(o, r, cy, half, 0);
  const r2=Math.abs(r-offset); return circleY(half-1-(o-half), r2, cy, half, 0);
}

// Latin cross (rectilinear)
export function crossVertices(cx=0, cy=0, H=240, stemW=60, barW=200, barT=60, barCenterY=-H/6, theta=0){
  const H2=H/2, s=stemW/2, b=barW/2, th=barT/2, yb=barCenterY;
  const raw=[[-s,-H2],[ s,-H2],[ s,yb-th],[ b,yb-th],[ b,yb+th],[ s,yb+th],[ s, H2],[-s, H2],[-s,yb+th],[-b,yb+th],[-b,yb-th],[-s,yb-th]];
  const c=Math.cos(theta), sn=Math.sin(theta);
  return raw.map(([x,y])=>[cx + x*c - y*sn, cy + x*sn + y*c]);
}
export function crossX(o, stepsPerEdge=18, ...cfg){ return _polyPathX(o, crossVertices(...cfg), stepsPerEdge); }
export function crossY(o, stepsPerEdge=18, ...cfg){ return _polyPathY(o, crossVertices(...cfg), stepsPerEdge); }

// Named polygon wrappers (numeric)
export const triangleX  = (o, r, cx=0, s=20)=>_regularPolyX(o,3,r,cx,s);
export const triangleY  = (o, r, cy=0, s=20)=>_regularPolyY(o,3,r,cy,s);
export const pentagonX  = (o, r, cx=0, s=20)=>_regularPolyX(o,5,r,cx,s);
export const pentagonY  = (o, r, cy=0, s=20)=>_regularPolyY(o,5,r,cy,s);
export const hexagonX   = (o, r, cx=0, s=20)=>_regularPolyX(o,6,r,cx,s);
export const hexagonY   = (o, r, cy=0, s=20)=>_regularPolyY(o,6,r,cy,s);
export const heptagonX  = (o, r, cx=0, s=20)=>_regularPolyX(o,7,r,cx,s);
export const heptagonY  = (o, r, cy=0, s=20)=>_regularPolyY(o,7,r,cy,s);
export const octagonX   = (o, r, cx=0, s=20)=>_regularPolyX(o,8,r,cx,s);
export const octagonY   = (o, r, cy=0, s=20)=>_regularPolyY(o,8,r,cy,s);
export const nonagonX   = (o, r, cx=0, s=20)=>_regularPolyX(o,9,r,cx,s);
export const nonagonY   = (o, r, cy=0, s=20)=>_regularPolyY(o,9,r,cy,s);
export const decagonX   = (o, r, cx=0, s=20)=>_regularPolyX(o,10,r,cx,s);
export const decagonY   = (o, r, cy=0, s=20)=>_regularPolyY(o,10,r,cy,s);

// ──────────────────────────────────────────────────────────────────────────────
// 3D builders (THREE optional)
// ──────────────────────────────────────────────────────────────────────────────
function _hasTHREE(){ return typeof THREE !== 'undefined' && THREE?.BufferGeometry; }

function buildPrism({ sides=6, radius=1, height=1 }){
  if(!_hasTHREE()) return { kind:'prism', sides, radius, height };
  const shape = new THREE.Shape();
  for(let i=0;i<sides;i++){
    const a = -Math.PI/2 + TAU*(i/sides);
    const x = radius*Math.cos(a), y = radius*Math.sin(a);
    (i? shape.lineTo(x,y) : shape.moveTo(x,y));
  }
  const geom = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled:false });
  geom.translate(0,0,-height/2);
  return geom;
}
function buildPyramid({ sides=4, radius=1, height=1 }){
  if(!_hasTHREE()) return { kind:'pyramid', sides, radius, height };
  return new THREE.ConeGeometry(radius, height, Math.max(3, sides));
}
function buildHemisphere({ radius=1, widthSegments=32, heightSegments=16 }){
  if(!_hasTHREE()) return { kind:'hemisphere', radius, widthSegments, heightSegments };
  return new THREE.SphereGeometry(radius, widthSegments, heightSegments, 0, TAU, 0, Math.PI/2);
}
export function build3D(name, opts={}){
  switch((name||'').toLowerCase()){
    case 'cube': return _hasTHREE()? new THREE.BoxGeometry(opts.size??1, opts.size??1, opts.size??1) : {kind:'box',...opts};
    case 'cuboid':
    case 'rectangular prism': return _hasTHREE()? new THREE.BoxGeometry(opts.w??1.2, opts.h??0.8, opts.d??1) : {kind:'box',...opts};
    case 'cylinder': return _hasTHREE()? new THREE.CylinderGeometry(opts.r??0.6, opts.r??0.6, opts.height??1.2, opts.segments??32) : {kind:'cylinder',...opts};
    case 'sphere': return _hasTHREE()? new THREE.SphereGeometry(opts.r??0.7, opts.widthSegments??32, opts.heightSegments??18) : {kind:'sphere',...opts};
    case 'hemisphere': return buildHemisphere(opts);
    case 'cone': return _hasTHREE()? new THREE.ConeGeometry(opts.r??0.6, opts.height??1.2, opts.segments??32) : {kind:'cone',...opts};
    case 'tetrahedron': return _hasTHREE()? new THREE.TetrahedronGeometry(opts.r??0.8) : {kind:'tetra',...opts};
    case 'octahedron': return _hasTHREE()? new THREE.OctahedronGeometry(opts.r??0.8) : {kind:'octa',...opts};
    case 'pyramid':
    case 'square pyramid': return buildPyramid({ sides:4, radius:opts.r??0.7, height:opts.height??1.2 });
    case 'hexagonal pyramid': return buildPyramid({ sides:6, radius:opts.r??0.7, height:opts.height??1.2 });
    case 'triangular prism': return buildPrism({ sides:3, radius:opts.radius??0.7, height:opts.height??1.2 });
    case 'pentagonal prism': return buildPrism({ sides:5, radius:opts.radius??0.7, height:opts.height??1.2 });
    case 'prism': return buildPrism({ sides:opts.sides??6, radius:opts.radius??0.7, height:opts.height??1.2 });
    default: return { kind:'unknown', name, opts };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Object-arg compatibility API (no name collisions with numeric functions)
// Access via: FunebraShapesCompat.*
// ──────────────────────────────────────────────────────────────────────────────
function _pointsRegularPolygon(n, r, phase=-Math.PI/2){
  const out=[]; const nn=Math.max(3, n|0);
  for(let i=0;i<nn;i++){ const a=phase + TAU*(i/nn); out.push({x:r*Math.cos(a), y:r*Math.sin(a)}); }
  return out;
}

// Minimal SVG path helpers for compat “Y” variants
function _mt(x,y){ return `M ${x} ${y}`; }
function _lt(x,y){ return `L ${x} ${y}`; }
function _cz(){ return 'Z'; }

function _regularPolygonPath({sides=5, r=60, phase=-Math.PI/2}={}){
  const n=Math.max(3, sides|0); let d='';
  for(let i=0;i<n;i++){ const a=phase + TAU*(i/n); const x=r*Math.cos(a), y=r*Math.sin(a); d+= (i? _lt(x,y) : _mt(x,y)); }
  return d+_cz();
}
function _circlePath({r=50}={}){ return `M ${-r} 0 a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0`; }
function _ellipsePath({rx=60, ry=40}={}){ return `M ${-rx} 0 a ${rx} ${ry} 0 1 0 ${2*rx} 0 a ${rx} ${ry} 0 1 0 ${-2*rx} 0`; }
function _trapezoidPath({top=70, bottom=110, height=80}={}){ const t=top/2, b=bottom/2, h=height/2; return [_mt(-t,-h),_lt(t,-h),_lt(b,h),_lt(-b,h),_cz()].join(' '); }

const FunebraShapesCompat = {
  // polygons
  polygonX: (p)=>_pointsRegularPolygon((p&&p.sides)||5, (p&&p.r)||60),
  polygonY: (p)=>_regularPolygonPath({sides:(p&&p.sides)||5, r:(p&&p.r)||60}),

  // circle / ellipse / oval
  circleX:  (p)=>{ const r=(p&&p.r)||50, N=(p&&p.samples)||96; const out=[]; for(let i=0;i<N;i++){const a=TAU*(i/N); out.push({x:r*Math.cos(a), y:r*Math.sin(a)});} return out; },
  circleY:  (p)=>_circlePath({ r:(p&&p.r)||50 }),

  ovalX:    (p)=>{ const rx=(p&&p.rx)||60, ry=(p&&p.ry)||40, N=(p&&p.samples)||96; const out=[]; for(let i=0;i<N;i++){const a=TAU*(i/N); out.push({x:rx*Math.cos(a), y:ry*Math.sin(a)});} return out; },
  ovalY:    (p)=>_ellipsePath({ rx:(p&&p.rx)||60, ry:(p&&p.ry)||40 }),

  // ring
  ringX:    (p)=>{ const rO=(p&&p.rOuter)||60, rI=(p&&p.rInner)||40, N=(p&&p.samples)||128; const out=[]; for(let i=0;i<N;i++){const a=TAU*(i/N); out.push({x:rO*Math.cos(a), y:rO*Math.sin(a)});} for(let i=N;i>=0;i--){const a=TAU*(i/N); out.push({x:rI*Math.cos(a), y:rI*Math.sin(a)});} return out; },
  ringY:    (p)=>{ const rO=(p&&p.rOuter)||60, rI=(p&&p.rInner)||40; const c=(r)=>`M ${-r} 0 a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0`; return `${c(rO)} ${c(rI)}`; },

  // trapezoid
  trapezoidX: (p)=>{ const t=((p&&p.top)||70)/2, b=((p&&p.bottom)||110)/2, h=((p&&p.height)||80)/2; return [{x:-t,y:-h},{x:t,y:-h},{x:b,y:h},{x:-b,y:h}]; },
  trapezoidY: (p)=>_trapezoidPath({ top:(p&&p.top)||70, bottom:(p&&p.bottom)||110, height:(p&&p.height)||80 }),
};

export { FunebraShapesCompat };

// Default export bundle (handy namespace)
const Shapes = {
  // numeric 2D
  lineX, lineY,
  circleX, circleY, ellipseX, ellipseY,
  polygonX, polygonY, starX, starY,
  rectangleX, rectangleY, squareX, squareY,
  rightTriangleX, rightTriangleY,
  parallelogramX, parallelogramY,
  rhombusX, rhombusY,
  trapezoidX, trapezoidY, trapeziumX, trapeziumY,
  kiteX, kiteY,
  arrowX, arrowY,
  semicircleX, semicircleY,
  ovalX, ovalY,
  ringX, ringY,
  crescentX, crescentY,
  crossX, crossY,
  triangleX, triangleY,
  pentagonX, pentagonY,
  hexagonX, hexagonY,
  heptagonX, heptagonY,
  octagonX, octagonY,
  nonagonX, nonagonY,
  decagonX, decagonY,
  // 3D
  build3D,
};
export default {
  SHAPES, PRESETS_2D, PRESETS_3D,
  shapeByName, draw2D, build3D, toSVG,
  regularPolygonPath, starPath, ringPath, heartPath,
  trapezoidPath, kitePath, arrowPath, crossPath,
  circlePath, ellipsePath, rectPath, rightTrianglePath,
  parallelogramPath, rhombusPath, semicirclePath,
  lerp, clamp, TAU,
  lineSegmentX, lineSegmentY // ← add these two lines
};

export default Shapes;

