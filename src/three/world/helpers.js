/* ==========================================================
   WORLD HELPERS — geometry/material/texture shortcuts and shared
   props (trees, palms, plants, windows, houses) used by every scene.
   Units are metres.
   ========================================================== */
import * as T from 'three';

export const MAROON = '#8a1c2b', GOLD = '#f4c542';

let seed = 7;
// seeded so the world is identical on every load (shared by every builder, so build order matters)
export const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

/* ---------------- helpers ---------------- */
export const mat = (color, roughness = 0.8, metalness = 0, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
export function mesh(parent, geo, m, x = 0, y = 0, z = 0, o = {}) {
  const me = new T.Mesh(geo, m);
  me.position.set(x, y, z);
  if (o.r) me.rotation.set(...o.r);
  if (o.s) me.scale.set(...o.s);
  me.castShadow = o.cast !== false;
  me.receiveShadow = o.receive !== false;
  parent.add(me);
  return me;
}
export const box = (p, w, h, d, m, x, y, z, o) => mesh(p, new T.BoxGeometry(w, h, d), m, x, y, z, o);
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.encoding = T.sRGBEncoding; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
export function roundedBox(w, h, d, r) {
  const s = new T.Shape(), x = -w / 2 + r, y = -h / 2 + r, iw = w - 2 * r, ih = h - 2 * r, c = Math.min(iw, ih) * 0.2;
  s.moveTo(x + c, y); s.lineTo(x + iw - c, y); s.quadraticCurveTo(x + iw, y, x + iw, y + c);
  s.lineTo(x + iw, y + ih - c); s.quadraticCurveTo(x + iw, y + ih, x + iw - c, y + ih);
  s.lineTo(x + c, y + ih); s.quadraticCurveTo(x, y + ih, x, y + ih - c); s.lineTo(x, y + c); s.quadraticCurveTo(x, y, x + c, y);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 8 });
  g.center();
  return g;
}
export function label(text, { w = 1024, h = 256, bg = '#fff', fg = '#000', font = '800 120px Archivo', border, radius = 24, sub, subFont = '600 56px Inter', subFg } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, radius) : g.rect(0, 0, w, h); g.fill();
    if (border) { g.strokeStyle = border; g.lineWidth = 12; g.beginPath(); g.roundRect ? g.roundRect(14, 14, w - 28, h - 28, radius * 0.6) : g.rect(14, 14, w - 28, h - 28); g.stroke(); }
    const fit = (str, f0) => {                   // shrink the font until the text fits inside the plate
      let size = +(/(\d+)px/.exec(f0) || [0, 100])[1];
      g.font = f0;
      while (g.measureText(str).width > w * 0.86 && size > 10) { size -= 2; g.font = f0.replace(/\d+px/, size + 'px'); }
    };
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = fg; fit(text, font);
    g.fillText(text, w / 2, sub ? h * 0.38 : h / 2);
    if (sub) { fit(sub, subFont); g.fillStyle = subFg || fg; g.fillText(sub, w / 2, h * 0.74); }
  });
}
export function wobble(geo, amt) {                       // organic lumps for foliage
  const p = geo.attributes.position, v = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + (Math.sin(v.x * 7.1 + v.y * 3.3) * 0.5 + Math.sin(v.z * 5.7 - v.y * 4.1) * 0.5) * amt;
    v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
export function glowTexture(inner = 'rgba(255,248,220,1)', outer = 'rgba(255,200,120,0)') {
  return canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, inner); gr.addColorStop(0.25, 'rgba(255,226,150,.6)'); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
}
export function skyDome(radius) {
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new T.Color('#2d3368') }, mid: { value: new T.Color('#f2a07e') }, bottom: { value: new T.Color('#ffd9a6') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(bottom, mid, smoothstep(-0.05, 0.08, h)); gl_FragColor = vec4(c, 1.0); }'
  });
  return new T.Mesh(new T.SphereGeometry(radius, 32, 16), m);
}

/* ---------------- shared props ---------------- */
const M = {};
export function materials() {
  if (M.ready) return M;
  Object.assign(M, {
    ready: true,
    concrete: mat('#cfc8bc', 0.95), concreteDark: mat('#a59e92', 0.95), wallA: mat('#efe6d6', 0.9), wallB: mat('#f0d6ad', 0.9),
    wallC: mat('#cfe1d6', 0.9), wallD: mat('#d8c3c0', 0.9), wallE: mat('#c3d1e2', 0.9), roof: mat('#8f3a2f', 0.75), roofGrey: mat('#7d8288', 0.6, 0.3),
    glass: mat('#a9d2f2', 0.15, 0.2, { emissive: new T.Color('#4f86b8'), emissiveIntensity: 0.3, envMapIntensity: 1.2 }), frame: mat('#f7f7f2', 0.6), wood: mat('#7a4c2a', 0.7), woodDark: mat('#4f301a', 0.8),
    trunk: mat('#6b4428', 0.95), leafA: mat('#3f7d3c', 0.9), leafB: mat('#5b9a48', 0.9), leafC: mat('#7fb85e', 0.9), frond: mat('#4f8f42', 0.85, 0, { side: T.DoubleSide }),
    metal: mat('#5c6167', 0.5, 0.6), steel: mat('#9aa0a6', 0.35, 0.8), dark: mat('#1e1f24', 0.6), black: mat('#111', 0.5),
    maroon: mat(MAROON, 0.65), gold: mat(GOLD, 0.35, 0.5), white: mat('#ffffff', 0.6), pot: mat('#b5643c', 0.85), red: mat('#c0392b', 0.6),
    sign: mat('#178452', 0.5), pole: mat('#8d9399', 0.6, 0.4), wire: mat('#1d1e22', 0.8)
  });
  return M;
}

export function tree(parent, x, z, s = 1) {
  const m = materials();
  const g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
  mesh(g, new T.CylinderGeometry(0.16 * s, 0.26 * s, 3.2 * s, 10), m.trunk, 0, 1.6 * s, 0);
  mesh(g, new T.CylinderGeometry(0.07 * s, 0.12 * s, 1.6 * s, 8), m.trunk, -0.5 * s, 3 * s, 0.1, { r: [0, 0, 0.7] });
  const crown = new T.Group(); crown.position.y = 3.4 * s; g.add(crown);
  const mats = [m.leafA, m.leafB, m.leafC];
  for (let i = 0; i < 9; i++) {
    const r = (0.9 + rnd() * 0.8) * s;
    mesh(crown, wobble(new T.SphereGeometry(r, 18, 12), 0.12), mats[i % 3], (rnd() - 0.5) * 2.6 * s, (rnd() * 1.6) * s, (rnd() - 0.5) * 2.2 * s);
  }
  return crown;
}

function leafGeometry(len, width) {
  const geo = new T.PlaneGeometry(len, width, 12, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + len / 2, y = p.getY(i);
    const t = x / len;
    p.setXYZ(i, x, -0.55 * t * t * len * 0.5, y * (1 - t * 0.85) * (t < 0.08 ? t / 0.08 : 1));
  }
  geo.computeVertexNormals();
  return geo;
}
export function palm(parent, x, z, h = 7, lean = 0.6) {
  const m = materials();
  const g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new T.Vector3(lean * t * t, h * t, 0)); }
  const curve = new T.CatmullRomCurve3(pts);
  mesh(g, new T.TubeGeometry(curve, 24, 0.17, 10, false), m.trunk);
  const top = pts[8];
  const crown = new T.Group(); crown.position.copy(top); g.add(crown);
  const leaf = leafGeometry(3.2, 0.7);
  for (let i = 0; i < 10; i++) {
    const f = mesh(crown, leaf, m.frond, 0, 0, 0, { r: [((i % 2) - 0.5) * 0.4, (i / 10) * Math.PI * 2, 0.35 + rnd() * 0.3] });
    f.castShadow = true;
  }
  for (let i = 0; i < 4; i++) mesh(crown, new T.SphereGeometry(0.15, 12, 10), m.trunk, Math.cos(i) * 0.18, -0.25, Math.sin(i) * 0.18);
  return crown;
}

export function plant(parent, x, z, s = 1, y0 = 0) {
  const m = materials();
  mesh(parent, new T.CylinderGeometry(0.22 * s, 0.16 * s, 0.4 * s, 16), m.pot, x, y0 + 0.2 * s, z);
  for (let i = 0; i < 4; i++) mesh(parent, wobble(new T.SphereGeometry(0.22 * s, 28, 20), 0.15), [m.leafA, m.leafB, m.leafC][i % 3], x + (rnd() - 0.5) * 0.3 * s, y0 + (0.5 + rnd() * 0.3) * s, z + (rnd() - 0.5) * 0.3 * s);
}

export function windowPane(parent, x, y, z, w, h, opts = {}) {
  const m = materials();
  box(parent, w + 0.12, h + 0.12, 0.08, opts.frameMat || m.frame, x, y, z);
  box(parent, w, h, 0.1, m.glass, x, y, z + 0.01, { cast: false, receive: false });
  if (opts.bars) for (let i = 1; i < 5; i++) box(parent, 0.025, h, 0.03, m.black, x - w / 2 + (w / 5) * i, y, z + 0.08);
  box(parent, w + 0.24, 0.06, 0.18, m.concreteDark, x, y - h / 2 - 0.08, z + 0.06);
}

export function house(parent, x, z, w, d, h, wall, opts = {}) {
  const m = materials();
  const g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
  box(g, w, h, d, wall, 0, h / 2, 0);
  const shape = new T.Shape(); shape.moveTo(-w / 2 - 0.4, 0); shape.lineTo(0, opts.roofH || 1.8); shape.lineTo(w / 2 + 0.4, 0); shape.lineTo(-w / 2 - 0.4, 0);
  const roof = mesh(g, new T.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false }), opts.roofMat || m.roof, 0, h, -d / 2 - 0.3);
  roof.castShadow = true;
  const floors = Math.max(1, Math.round(h / 3));
  for (let f = 0; f < floors; f++) {
    const y = 1.6 + f * 3;
    for (let k = 0; k < Math.floor(w / 2.4); k++) {
      const wx = -w / 2 + 1.4 + k * 2.4;
      if (f === 0 && opts.door && Math.abs(wx - opts.door) < 1.2) continue;
      windowPane(g, wx, y, d / 2 + 0.02, 1.2, 1.1, { bars: f === 0 });
    }
  }
  if (opts.door != null) {
    box(g, 1.2, 2.25, 0.02, mat('#1a120c', 0.9), opts.door, 1.12, d / 2 + 0.006, { cast: false });
    const hinge = new T.Group(); hinge.position.set(opts.door - 0.575, 0, d / 2 + 0.06); g.add(hinge);
    box(hinge, 1.15, 2.2, 0.08, m.wood, 0.575, 1.1, 0);
    mesh(hinge, new T.SphereGeometry(0.04, 10, 8), m.gold, 0.975, 1.05, 0.07);
    g.userData.door = hinge;
  }
  if (opts.aircon) box(g, 0.8, 0.5, 0.45, m.white, w / 2 - 1.2, 4.2, d / 2 + 0.25);
  return g;
}

/* ---------------- seated side characters ----------------
   A jointed figure sitting on a seat whose top is at the group origin,
   facing +X. Limbs run joint-to-joint so nothing floats or detaches.
   seatH = seat top above the floor (feet land on it).
   hands: 'desk' (forearms resting on a desk top `deskY` above the seat),
   'lap', or 'wheel' (reaching forward to a steering wheel). */
const _geo = new Map(), _mat = new Map();
const geoOnce = (key, make) => _geo.get(key) || (_geo.set(key, make()), _geo.get(key));
const matOnce = (color, rough = 0.8) => { const k = color + rough; return _mat.get(k) || (_mat.set(k, mat(color, rough)), _mat.get(k)); };
const _up = new T.Vector3(0, 1, 0);
function limb(parent, a, b, r, m) {
  const d = new T.Vector3().subVectors(b, a), len = d.length();
  const g = geoOnce(`cap${r}:${len.toFixed(3)}`, () => new T.CapsuleGeometry(r, len, 4, 10));
  const me = mesh(parent, g, m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  me.quaternion.setFromUnitVectors(_up, d.normalize());
  return me;
}
export function seatedPerson(parent, x, y, z, o = {}) {
  const { face = 0, shirt = '#dde1e6', pants = '#303236', hair = '#1d140e', skin = '#c98d6a', seatH = 0.46, hands = 'lap', deskY = 0.32, tilt = 0, lanyard = false } = o;
  const p = new T.Group(); p.position.set(x, y, z); p.rotation.y = face; parent.add(p);
  const sm = matOnce(shirt, 0.85), pm = matOnce(pants, 0.8), km = matOnce(skin, 0.6), hm = matOnce(hair, 0.9), shoe = matOnce('#17171a', 0.4);
  const V = (a, b, c) => new T.Vector3(a, b, c);

  // hips + legs
  mesh(p, geoOnce('pelvis', () => new T.SphereGeometry(0.14, 16, 10)), pm, 0.03, 0.08, 0, { s: [0.85, 0.6, 1.1] });
  const footY = -seatH + 0.05;
  for (const s of [1, -1]) {
    const hip = V(0.02, 0.07, s * 0.085), knee = V(0.42, 0.07, s * 0.09), ankle = V(0.45, footY + 0.03, s * 0.095);
    limb(p, hip, knee, 0.064, pm);
    limb(p, knee, ankle, 0.052, pm);
    mesh(p, geoOnce('shoe', () => new T.BoxGeometry(0.22, 0.07, 0.09)), shoe, ankle.x + 0.06, footY - 0.015, ankle.z);
  }
  // torso, collar, neck, head
  mesh(p, geoOnce('torso', () => new T.CapsuleGeometry(0.14, 0.24, 6, 16)), sm, 0, 0.37, 0, { s: [0.72, 1, 1.06] });
  mesh(p, geoOnce('collar', () => new T.TorusGeometry(0.055, 0.016, 6, 16)), sm, 0, 0.62, 0, { r: [Math.PI / 2, 0, 0] });
  if (lanyard) {
    const lm = matOnce('#8a1c2b', 0.7);
    for (const s of [1, -1]) limb(p, V(0.02, 0.62, s * 0.05), V(0.1, 0.42, s * 0.01), 0.006, lm);
    mesh(p, geoOnce('idcard', () => new T.BoxGeometry(0.006, 0.075, 0.055)), matOnce('#ffffff', 0.5), 0.108, 0.38, 0);
  }
  mesh(p, geoOnce('neck', () => new T.CylinderGeometry(0.04, 0.047, 0.1, 12)), km, 0, 0.67, 0);
  const head = new T.Group(); head.position.set(0, 0.7, 0); head.rotation.z = -tilt; p.add(head);   // pivots at the neck
  mesh(head, geoOnce('head', () => new T.SphereGeometry(0.1, 20, 14)), km, 0.01, 0.11, 0, { s: [1, 1.12, 0.92] });
  mesh(head, geoOnce('hair', () => new T.SphereGeometry(0.107, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)), hm, -0.008, 0.13, 0, { s: [1, 1.05, 0.95] });
  mesh(head, geoOnce('fringe', () => new T.SphereGeometry(0.09, 14, 10)), hm, -0.035, 0.1, 0, { s: [0.8, 1.05, 1.02] });
  // arms: shoulder → elbow → hand
  for (const s of [1, -1]) {
    const sh = V(0, 0.56, s * 0.16);
    const [el, hd] = hands === 'desk' ? [V(0.16, deskY + 0.05, s * 0.2), V(0.44, deskY + 0.03, s * 0.11)]
      : hands === 'wheel' ? [V(0.18, 0.36, s * 0.2), V(0.4, 0.46, s * 0.13)]
        : [V(0.08, 0.3, s * 0.19), V(0.3, 0.17, s * 0.1)];
    mesh(p, geoOnce('shoulder', () => new T.SphereGeometry(0.055, 12, 10)), sm, sh.x, sh.y, sh.z);
    limb(p, sh, V(sh.x + (el.x - sh.x) * 0.45, sh.y + (el.y - sh.y) * 0.45, sh.z + (el.z - sh.z) * 0.45), 0.052, sm);   // short sleeve
    limb(p, sh, el, 0.04, km);
    limb(p, el, hd, 0.035, km);
    mesh(p, geoOnce('hand', () => new T.SphereGeometry(0.04, 10, 8)), km, hd.x + 0.02, hd.y, hd.z, { s: [1.2, 0.7, 0.9] });
  }
  return p;
}
