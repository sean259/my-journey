import * as T from 'three';
import { MAROON, GOLD, rnd, mat, mesh, box, canvasTex, roundedBox, label, glowTexture, skyDome, materials, tree, palm, plant, windowPane, house } from './helpers.js';

/* ==========================================================
   THE STREET — walk from home (x≈0) to CIT-U's door (x = DOOR_X)
   Sean walks along z = 0.3; building fronts are at z ≈ -3.
   ========================================================== */
export const DOOR_X = 220, PATH_Z = 0.3;            // CIT-U sits far down the road: the commute should feel like a trip
export function buildStreet() {
  const m = materials();
  const scene = new T.Scene();
  const sky = skyDome(260); scene.add(sky);
  scene.fog = new T.Fog('#f2b48e', 40, 170);

  const hemi = new T.HemisphereLight('#ffd9b8', '#6a5a48', 0.55); scene.add(hemi);
  const sun = new T.DirectionalLight('#ffd2a1', 1.1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 14, bottom: -8, near: 1, far: 90 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const sunDisc = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  sunDisc.scale.set(70, 70, 1); scene.add(sunDisc);

  // ground: lots, sidewalk, curb, road
  mesh(scene, new T.PlaneGeometry(600, 300), mat('#8a9a6a', 1), 40, -0.02, -140, { r: [-Math.PI / 2, 0, 0], cast: false });
  const swTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#d3ccc0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 3, h); g.fillRect(0, h / 2, w, 2); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }, [120, 1]);
  box(scene, 320, 0.14, 3.6, mat('#ffffff', 0.95, 0, { map: swTex }), 120, 0.07, -0.05, { cast: false });
  box(scene, 320, 0.18, 0.22, m.concreteDark, 120, 0.09, 1.86, { cast: false });
  const roadTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#45484f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.fillStyle = '#e9e6dc'; g.fillRect(0, h * 0.62, w * 0.55, 8); }, [80, 1]);
  mesh(scene, new T.PlaneGeometry(320, 12), mat('#ffffff', 0.85, 0, { map: roadTex }), 120, 0.005, 8, { r: [-Math.PI / 2, 0, 0], cast: false });
  // forecourt tiles in front of buildings
  box(scene, 320, 0.06, 2.2, m.concrete, 120, 0.03, -3, { cast: false });

  // distant hills + city
  for (const [z, col, amp] of [[-150, '#9fb3d6', 26], [-110, '#8ea7c9', 16]]) {
    const geo = new T.PlaneGeometry(760, 60, 180, 1); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, 6 + amp * (0.55 + 0.45 * Math.sin(p.getX(i) / 37) * Math.sin(p.getX(i) / 13 + 1)));
    geo.computeVertexNormals();
    mesh(scene, geo, mat(col, 1), 130, 0, z, { cast: false, receive: false });
  }
  for (let x = -60; x < 340;) {
    const w = 4 + rnd() * 8, h = 10 + rnd() * 34;
    box(scene, w, h, 6, mat(rnd() > 0.5 ? '#b9c6da' : '#a6b6cf', 0.6, 0.2), x, h / 2, -70 - rnd() * 18, { cast: false });
    x += w + 2 + rnd() * 6;
  }
  // back rows of houses (depth)
  const walls = [m.wallA, m.wallB, m.wallC, m.wallD, m.wallE];
  for (let x = -20; x < 300;) { const w = 6 + rnd() * 4; house(scene, x, -16 - rnd() * 4, w, 6, 3 + Math.round(rnd()) * 3, walls[Math.floor(rnd() * 5)], { roofMat: rnd() > 0.5 ? m.roof : m.roofGrey }); x += w + 1.5 + rnd() * 3; }

  const sway = [];
  // HOME — two-storey house, fence & gate
  const home = house(scene, -2.5, -7, 9, 7, 6, m.wallB, { door: -1.5, aircon: true, roofH: 2.2 });
  const plate = label('LORICO', { w: 512, h: 160, bg: '#fffaf0', fg: '#5b4a35', font: '800 84px Archivo', border: '#8a7a62' });
  mesh(home, new T.PlaneGeometry(0.6, 0.19), mat('#fff', 0.8, 0, { map: plate }), -0.3, 2.0, 3.53, { cast: false });
  box(scene, 4, 1.5, 0.2, m.wallA, -5.5, 0.75, -2.6); box(scene, 3.5, 1.5, 0.2, m.wallA, 2.9, 0.75, -2.6);
  const gateL = new T.Group(); gateL.position.set(-3.3, 0, -2.6); scene.add(gateL);
  const gateR = new T.Group(); gateR.position.set(0.9, 0, -2.6); scene.add(gateR);
  for (let i = 0; i < 7; i++) { box(gateL, 0.04, 1.6, 0.04, m.black, 0.15 + i * 0.3, 0.8, 0); box(gateR, 0.04, 1.6, 0.04, m.black, -0.15 - i * 0.3, 0.8, 0); }
  for (const y of [1.55, 0.15]) { box(gateL, 2.1, 0.06, 0.06, m.black, 1.05, y, 0); box(gateR, 2.1, 0.06, 0.06, m.black, -1.05, y, 0); }
  gateL.rotation.y = -0.95; gateR.rotation.y = 0.95;
  plant(scene, -6.5, -2.2, 1.4); plant(scene, 4, -2.2, 1.2);

  // wooden sign
  const ama = label('AMA ITER  →', { w: 768, h: 192, bg: '#7a4c2a', fg: '#fff3d6', font: '900 92px Archivo', radius: 14 });
  box(scene, 0.12, 2.2, 0.12, m.wood, 6, 1.1, -1.6);
  mesh(scene, new T.BoxGeometry(2.2, 0.55, 0.08), [m.wood, m.wood, m.wood, m.wood, mat('#fff', 0.8, 0, { map: ama }), m.wood], 6.2, 1.9, -1.55);

  // green road signs (Philippine style) at each school milestone
  function roadSign(x, name, sub) {
    const H = 360, FONT = '700 124px Inter', SUB = '600 66px Inter';
    const g = document.createElement('canvas').getContext('2d');
    g.font = FONT; const w1 = g.measureText(name).width;
    g.font = SUB; const w2 = g.measureText(sub).width;
    const W = Math.ceil((Math.max(w1, w2) + 150) / 0.86);       // plate grows to fit the full school name
    const tex = label(name, { w: W, h: H, bg: '#178452', fg: '#ffffff', font: FONT, border: '#ffffff', radius: 28, sub, subFont: SUB, subFg: '#d5f0e1' });
    const sh = 1.2, sw = sh * W / H;
    for (const dx of [-sw / 2 + 0.4, sw / 2 - 0.4]) mesh(scene, new T.CylinderGeometry(0.06, 0.06, 4.8, 10), m.pole, x + dx, 2.4, -1.6);
    mesh(scene, new T.BoxGeometry(sw, sh, 0.08), [m.sign, m.sign, m.sign, m.sign, mat('#fff', 0.5, 0, { map: tex }), m.sign], x, 4.35, -1.55);
  }
  roadSign(30, "St. Scholastica's Academy", '2015 – 2019 · ELEMENTARY');
  roadSign(78, 'Divino Amore Academy', '2020 – 2022 · JUNIOR HIGH');
  roadSign(126, 'Asian College of Technology', '2022 – 2023 · SENIOR HIGH');
  roadSign(174, 'Cebu Institute of Technology – University', '2023 – PRESENT · COLLEGE  →');

  // the neighbourhood along the whole route (generated so the trip has something to pass)

  const busy = [[50, 60], [144, 158], [DOOR_X - 18, DOOR_X + 20]];      // store, jeepney lot, campus
  const free = (x0, x1) => !busy.some(([a, b]) => x1 > a && x0 < b);
  let lastTree = 0;
  for (let x = 8; x < DOOR_X - 18;) {
    const w = 5 + rnd() * 1.8;
    if (free(x - 0.5, x + w + 0.5)) {
      house(scene, x + w / 2, -7 - rnd() * 0.6, w, 6, rnd() > 0.45 ? 6 : 3, walls[Math.floor(rnd() * 5)], { door: (rnd() - 0.5) * (w - 2.5), aircon: rnd() > 0.6, roofMat: rnd() > 0.35 ? m.roof : m.roofGrey });
      box(scene, w - 1.2, 1.3, 0.18, rnd() > 0.5 ? m.wallA : m.wallE, x + w / 2 - 0.6, 0.65, -2.6);
      if (rnd() > 0.55) plant(scene, x + w - 0.4, -2.2, 1 + rnd() * 0.4);
    }
    x += w + 1.2 + rnd() * 2.5;
    if (x - lastTree > 11 && free(x - 2, x + 2)) {
      sway.push(rnd() > 0.5 ? tree(scene, x, -4.2, 0.95 + rnd() * 0.25) : palm(scene, x, -3.4, 6.5 + rnd() * 1.5, (rnd() - 0.5) * 1.6));
      lastTree = x; x += 2.5;
    }
  }
  sway.push(tree(scene, DOOR_X + 16, -4.5, 1.2)); sway.push(palm(scene, DOOR_X + 22, -3.5, 7.8, 0.6));

  // SARI-SARI store
  const store = new T.Group(); store.position.set(55, 0, -4); scene.add(store);
  box(store, 6, 3.2, 3.4, m.wallC, 0, 1.6, 0);
  const roof = box(store, 6.8, 0.08, 4.2, m.roofGrey, 0, 3.35, 0.3); roof.rotation.x = 0.1;
  const signTex = label('SARI-SARI STORE', { w: 1400, h: 260, bg: '#c0392b', fg: '#ffffff', font: '900 150px Archivo', radius: 20 });
  mesh(store, new T.PlaneGeometry(4.6, 0.85), mat('#fff', 0.6, 0, { map: signTex }), 0, 3.95, 1.9, { cast: false });
  const goods = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = '#3b2b22'; g.fillRect(0, 0, w, h); const cs = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#ecf0f1']; for (let r = 0; r < 4; r++) for (let c = 0; c < 16; c++) { g.fillStyle = cs[(c + r * 3) % 7]; g.fillRect(14 + c * 63, 20 + r * 122, 48, 96); } g.fillStyle = '#6d6d6d'; for (let i = 0; i <= 16; i++) g.fillRect(i * 64, 0, 6, h); });
  mesh(store, new T.PlaneGeometry(3.8, 1.6), mat('#fff', 0.7, 0, { map: goods }), -0.6, 1.75, 1.71, { cast: false });
  box(store, 4, 0.12, 0.4, m.wood, -0.6, 0.9, 1.85);
  box(store, 1.0, 2.3, 0.06, m.wood, 2.2, 1.15, 1.72);
  box(store, 1.8, 0.07, 0.4, m.wood, 1.6, 0.45, 2.3); for (const dx of [0.85, 2.35]) box(store, 0.07, 0.45, 0.35, m.woodDark, dx, 0.22, 2.3);

  // power poles + sagging wires along the curb
  const poleXs = []; for (let x = 8; x < DOOR_X + 30; x += 19) poleXs.push(x);
  for (const x of poleXs) {
    mesh(scene, new T.CylinderGeometry(0.11, 0.15, 9, 12), m.concreteDark, x, 4.5, 1.55);
    box(scene, 1.8, 0.12, 0.12, m.metal, x, 8.3, 1.55);
    mesh(scene, new T.CylinderGeometry(0.22, 0.22, 0.7, 14), m.steel, x, 6.6, 1.25);
  }
  const wireGeo = (x0, x1, y, z) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new T.Vector3(x0 + (x1 - x0) * t, y - Math.sin(Math.PI * t) * 0.8, z)); } return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.016, 4, false); };
  for (let i = 0; i < poleXs.length - 1; i++) for (const dz of [-0.6, 0, 0.6]) mesh(scene, wireGeo(poleXs[i], poleXs[i + 1], 8.35, 1.55 + dz * 0.2), m.wire, 0, 0, 0, { receive: false });

  // JEEPNEYS — the one Sean rides, plus one parked in a lot
  function passenger(parent, x, z, face, shirt, hair = '#1d140e', skin = '#c98d6a') {
    const p = new T.Group(); p.position.set(x, 1.3, z); p.rotation.y = face; parent.add(p);
    const sm = mat(shirt, 0.8), km = mat(skin, 0.6), pm = mat('#2b2f3f', 0.8);
    mesh(p, new T.CapsuleGeometry(0.13, 0.26, 6, 14), sm, 0, 0.3, 0, { s: [0.75, 1, 1] });
    mesh(p, new T.CylinderGeometry(0.045, 0.05, 0.08, 10), km, 0, 0.55, 0);
    mesh(p, new T.SphereGeometry(0.1, 18, 14), km, 0.01, 0.68, 0, { s: [1, 1.1, 0.92] });
    mesh(p, new T.SphereGeometry(0.106, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hair, 0.9), -0.012, 0.7, 0);
    box(p, 0.42, 0.13, 0.26, pm, 0.2, 0.02, 0);
    box(p, 0.12, 0.42, 0.24, pm, 0.38, -0.2, 0);
    for (const zz of [-0.17, 0.17]) mesh(p, new T.CapsuleGeometry(0.04, 0.26, 4, 8), sm, 0.08, 0.28, zz, { r: [0, 0, -0.6] });
    return p;
  }
  function makeJeep(o = {}) {
    const jeep = new T.Group();
    const body = new T.Group(); jeep.add(body);
    const silver = mat('#eceef1', 0.3, 0.35), chrome = mat('#f4f7fa', 0.12, 0.75), paint = mat(o.paint || MAROON, 0.4, 0.25);
    const dark = mat('#26262b', 0.8), seatM = mat(o.seat || '#6a2a22', 0.55);
    box(body, 5.7, 0.12, 2.0, dark, 0, 0.78, 0);
    for (const z of [-1, 1]) {
      box(body, 5.7, 0.72, 0.06, silver, 0, 1.2, z);
      for (const [y, c] of [[1.34, o.stripe1 || '#1d4f91'], [1.26, GOLD], [1.18, '#c0392b']]) box(body, 5.72, 0.05, 0.075, mat(c, 0.45, 0.2), 0, y, z);
      for (let i = 0; i < 7; i++) box(body, 0.1, 0.66, 0.07, silver, -2.8 + i * 0.93, 1.88, z);
      box(body, 5.7, 0.06, 0.09, chrome, 0, 1.57, z);
    }
    box(body, 6.0, 0.1, 2.16, paint, 0, 2.25, 0);
    box(body, 6.05, 0.04, 2.2, chrome, 0, 2.19, 0);
    for (const z of [-0.75, 0.75]) box(body, 0.06, 0.72, 0.5, silver, -2.85, 1.2, z);
    for (const z of [-0.45, 0.45]) mesh(body, new T.CylinderGeometry(0.025, 0.025, 1.3, 8), chrome, -2.88, 1.55, z);
    box(body, 0.45, 0.06, 1.0, chrome, -3.05, 0.5, 0);
    box(body, 0.06, 0.72, 2.0, silver, 2.85, 1.2, 0);
    const ws = box(body, 0.05, 0.62, 1.9, mat('#bfe0f7', 0.05, 0.3, { transparent: true, opacity: 0.3 }), 2.95, 1.88, 0, { cast: false, receive: false }); ws.rotation.z = -0.12;
    mesh(body, roundedBox(1.75, 0.95, 1.92, 0.1), silver, 3.75, 1.2, 0);
    box(body, 0.08, 0.55, 1.3, chrome, 4.63, 1.1, 0);
    for (let i = 0; i < 6; i++) box(body, 0.09, 0.03, 1.2, dark, 4.66, 0.92 + i * 0.07, 0, { cast: false });
    for (const z of [-0.72, 0.72]) mesh(body, new T.SphereGeometry(0.12, 16, 12), new T.MeshBasicMaterial({ color: '#fff4c2' }), 4.6, 1.42, z, { cast: false });
    for (const z of [-0.42, 0.42]) { mesh(body, new T.SphereGeometry(0.07, 14, 10), chrome, 4.25, 1.72, z, { s: [1.6, 1, 0.6] }); mesh(body, new T.CylinderGeometry(0.012, 0.012, 0.5, 6), chrome, 4.0, 1.9, z, { r: [0, 0, 1.2] }); }
    box(body, 0.14, 0.18, 2.2, chrome, 4.75, 0.72, 0); box(body, 0.14, 0.14, 2.1, chrome, -3.22, 0.66, 0);
    for (const z of [-0.68, 0.68]) { box(body, 4.6, 0.1, 0.42, seatM, -0.4, 1.22, z); box(body, 4.6, 0.36, 0.06, seatM, -0.4, 1.46, z > 0 ? 0.93 : -0.93); }
    const route = label(o.route || 'BULACAO · CIT-U · COLON', { w: 1400, h: 180, bg: GOLD, fg: '#1b1b2f', font: '900 104px Archivo', radius: 16 });
    for (const z of [1.06, -1.06]) mesh(body, new T.PlaneGeometry(3.6, 0.46), mat('#fff', 0.5, 0, { map: route }), 0.3, 2.56, z, { cast: false, r: [0, z > 0 ? 0 : Math.PI, 0] });
    box(body, 3.6, 0.46, 0.06, mat(GOLD), 0.3, 2.56, 1.02); box(body, 3.6, 0.46, 0.06, mat(GOLD), 0.3, 2.56, -1.02);
    const wheels = [];
    for (const wx of [-1.8, 3.4]) for (const z of [-1.02, 1.02]) {
      const wg = new T.Group(); wg.position.set(wx, 0.42, z); jeep.add(wg);
      mesh(wg, new T.CylinderGeometry(0.42, 0.42, 0.28, 28), mat('#161618', 0.85), 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
      mesh(wg, new T.CylinderGeometry(0.24, 0.24, 0.29, 24), chrome, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
      for (let n = 0; n < 5; n++) box(wg, 0.05, 0.36, 0.3, mat('#3a3a40', 0.5, 0.5), 0, 0, 0, { r: [0, 0, n * Math.PI / 5] });
      wheels.push(wg);
      box(body, 1.1, 0.08, 0.32, dark, wx, 0.92, z * 0.98);
    }
    if (o.passengers !== false) {
      passenger(body, 0.3, -0.62, -Math.PI / 2, '#e9a23b');
      passenger(body, 1.45, -0.62, -Math.PI / 2, '#5b8bd9', '#2a1a10', '#b97a55');
      passenger(body, -0.2, 0.62, Math.PI / 2, '#d9d4c8');
      passenger(body, 2.35, -0.42, 0, '#3a6b4a', '#111', '#a86b48');   // driver
    }
    return { group: jeep, body, wheels };
  }
  const jeep = makeJeep(); jeep.group.position.set(-40, 0, 4.2); scene.add(jeep.group);
  const parked = makeJeep({ paint: '#1d4f91', stripe1: '#8a1c2b', route: 'MANDAUE · CARBON', passengers: false });
  parked.group.position.set(151, 0, -5.2); scene.add(parked.group);
  const puffs = []; const pTex = glowTexture('rgba(220,220,220,.8)', 'rgba(220,220,220,0)');
  for (let i = 0; i < 5; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: pTex, transparent: true, depthWrite: false })); sp.position.set(-40, 0.5, 5); scene.add(sp); puffs.push(sp); }
  box(scene, 9, 0.05, 4.4, m.concrete, 151, 0.025, -5, { cast: false });

  // CIT-U
  const cit = new T.Group(); cit.position.set(DOOR_X, 0, -3.3); scene.add(cit);
  const citWall = mat('#f2ece0', 0.85);
  box(cit, 26, 11, 9, citWall, 0, 5.5, -4.5);
  box(cit, 26.3, 1.3, 9.2, m.maroon, 0, 0.65, -4.5);
  box(cit, 26.6, 0.7, 9.4, m.maroon, 0, 11.2, -4.5); box(cit, 26.6, 0.12, 9.42, m.gold, 0, 10.82, -4.5);
  const citSign = label('CEBU INSTITUTE OF TECHNOLOGY – UNIVERSITY', { w: 2048, h: 180, bg: MAROON, fg: '#ffe08a', font: '900 104px Archivo', radius: 10 });
  mesh(cit, new T.PlaneGeometry(17, 1.5), mat('#fff', 0.6, 0, { map: citSign }), 0, 9.6, 0.02, { cast: false });
  for (const y of [3.1, 6.3]) for (let k = -5; k <= 5; k++) { const x = k * 2.3; if (Math.abs(x) < 4.6) continue; windowPane(cit, x, y, 0.02, 1.5, 1.6); }
  // portico + columns + emblem
  box(cit, 9, 0.45, 3.2, m.maroon, 0, 5.0, 1.4); box(cit, 9.05, 0.08, 3.25, m.gold, 0, 4.76, 1.4);
  for (const x of [-4, -2.4, 2.4, 4]) mesh(cit, new T.CylinderGeometry(0.24, 0.27, 4.8, 20), mat('#e8e2d6', 0.5), x, 2.4, 2.75);
  const emblem = canvasTex(512, 512, (g) => { g.fillStyle = '#d4a226'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill(); g.fillStyle = MAROON; g.beginPath(); g.arc(256, 256, 205, 0, 7); g.fill(); g.fillStyle = '#ffe08a'; g.font = '900 120px Archivo'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CIT-U', 256, 262); });
  mesh(cit, new T.CircleGeometry(0.75, 40), mat('#fff', 0.4, 0.2, { map: emblem }), 0, 4.0, 0.05, { cast: false });
  // doorway: warm interior + two glass doors on hinges
  box(cit, 2.5, 2.8, 0.2, m.dark, 0, 1.4, -0.02);
  const interior = mesh(cit, new T.PlaneGeometry(2.2, 2.55), new T.MeshBasicMaterial({ color: '#ffe3a3', toneMapped: false }), 0, 1.33, 0.05, { cast: false });
  const doorMat = new T.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55 });
  const hingeL = new T.Group(); hingeL.position.set(-1.1, 0, 0.12); cit.add(hingeL);
  const hingeR = new T.Group(); hingeR.position.set(1.1, 0, 0.12); cit.add(hingeR);
  box(hingeL, 1.1, 2.55, 0.04, doorMat, 0.55, 1.33, 0, { cast: false }); box(hingeL, 0.04, 0.7, 0.06, m.steel, 0.95, 1.2, 0.05);
  box(hingeR, 1.1, 2.55, 0.04, doorMat, -0.55, 1.33, 0, { cast: false }); box(hingeR, 0.04, 0.7, 0.06, m.steel, -0.95, 1.2, 0.05);
  for (const [hg, sx] of [[hingeL, 0.55], [hingeR, -0.55]]) { box(hg, 1.1, 0.06, 0.06, m.dark, sx, 2.6, 0); box(hg, 1.1, 0.06, 0.06, m.dark, sx, 0.06, 0); }
  const doorLight = new T.PointLight('#ffd98a', 0, 9, 2); doorLight.position.set(0, 1.6, 0.8); cit.add(doorLight);
  const spillTex = glowTexture('rgba(255,230,160,.9)', 'rgba(255,220,140,0)');
  const spill = mesh(cit, new T.PlaneGeometry(5, 4), new T.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: 0, depthWrite: false }), 0, 0.08, 2.2, { r: [-Math.PI / 2, 0, 0], cast: false });
  for (const [x, w] of [[0, 3.2], [0, 3.8]]) box(cit, w, 0.12, 0.5, m.concrete, x, w === 3.2 ? 0.18 : 0.06, w === 3.2 ? 0.45 : 0.85);
  for (const x of [-5.5, 5.5]) plant(cit, x, 1.2, 1.6);
  // flag
  mesh(cit, new T.CylinderGeometry(0.05, 0.06, 13, 10), m.steel, -15, 6.5, 2);
  const flagGeo = new T.PlaneGeometry(2.4, 1.4, 24, 8);
  const flagTex = canvasTex(256, 128, (g) => { g.fillStyle = MAROON; g.fillRect(0, 0, 256, 64); g.fillStyle = GOLD; g.fillRect(0, 64, 256, 64); });
  const flag = mesh(cit, flagGeo, mat('#fff', 0.8, 0, { map: flagTex, side: T.DoubleSide }), -13.8, 12.2, 2);

  // clouds + birds
  const clouds = new T.Group(); scene.add(clouds);
  const cloudM = new T.MeshLambertMaterial({ color: '#ffffff', emissive: '#f4e8e0', emissiveIntensity: 0.35, fog: false });
  for (let i = 0; i < 14; i++) {
    const c = new T.Group(); c.position.set(-40 + i * 16 + rnd() * 10, 32 + rnd() * 16, -95 - rnd() * 40); clouds.add(c);
    for (let k = 0; k < 6; k++) mesh(c, new T.SphereGeometry(3 + rnd() * 3, 16, 12), cloudM, (k - 2.5) * 3.2, Math.sin(k) * 1.6, rnd() * 2, { cast: false, receive: false, s: [1, 0.7, 1] });
  }
  const birds = [];
  const birdM = new T.MeshBasicMaterial({ color: '#2b2d42', side: T.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const b = new T.Group(); scene.add(b);
    const wing = new T.PlaneGeometry(0.5, 0.12);
    const l = new T.Mesh(wing, birdM), r = new T.Mesh(wing, birdM); l.position.x = -0.25; r.position.x = 0.25;
    const lp = new T.Group(), rp = new T.Group(); lp.add(l); rp.add(r); b.add(lp, rp);
    birds.push({ g: b, lp, rp, off: rnd() * 100, y: 14 + rnd() * 8, z: -20 - rnd() * 20 });
  }

  return { scene, sky, sun, sunDisc, hemi, fog: scene.fog, hingeL, hingeR, doorLight, spill, interior, sway, flag, flagGeo, jeep, parked, puffs, clouds, birds, homeDoor: home.userData.door, DOOR_X, PATH_Z, DOOR_Z: -3.3, LANE_Z: 4.2 };
}
