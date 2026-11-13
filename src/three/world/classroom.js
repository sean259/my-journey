import * as T from 'three';
import { MAROON, GOLD, rnd, mat, mesh, box, canvasTex, roundedBox, glowTexture, materials, seatedPerson } from './helpers.js';

/* ==========================================================
   THE CLASSROOM — where the portfolio chapters happen.
   Students face +X (the whiteboard). Windows are on the -Z wall,
   the door on the back (-X) wall. Sean's seat is at (-0.35, 0.5).
   ========================================================== */
export function buildClassroom() {
  const m = materials();
  const scene = new T.Scene();
  scene.background = new T.Color('#efe4cf');
  scene.fog = new T.Fog('#efe4cf', 14, 30);

  // floor, walls, ceiling
  const floorTex = canvasTex(256, 256, (g) => { g.fillStyle = '#e6dcc7'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#d3c6aa'; g.fillRect(128, 0, 128, 128); g.fillRect(0, 128, 128, 128); g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, 127, 256, 2); g.fillRect(127, 0, 2, 256); }, [10, 10]);
  mesh(scene, new T.PlaneGeometry(14, 12), mat('#fff', 0.35, 0.02, { map: floorTex }), 0, 0, 0, { r: [-Math.PI / 2, 0, 0], cast: false });
  mesh(scene, new T.PlaneGeometry(14, 12), mat('#f6efe2', 0.95), 0, 3.4, 0, { r: [Math.PI / 2, 0, 0], cast: false });
  const wallTex = canvasTex(512, 512, (g) => { g.fillStyle = '#f3ead8'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#e4d8bf'; g.fillRect(0, 360, 512, 152); g.fillStyle = MAROON; g.fillRect(0, 346, 512, 14); g.fillStyle = GOLD; g.fillRect(0, 360, 512, 4); }, [3, 1]);
  const wallM = mat('#fff', 0.92, 0, { map: wallTex });
  mesh(scene, new T.PlaneGeometry(12, 3.4), wallM, 6, 1.7, 0, { r: [0, -Math.PI / 2, 0], cast: false });          // front
  mesh(scene, new T.PlaneGeometry(12, 3.4), wallM, -6, 1.7, 0, { r: [0, Math.PI / 2, 0], cast: false });          // back
  // window wall (-Z) with big sunny windows
  const outside = canvasTex(1024, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6fb0ef'); sky.addColorStop(0.7, '#cfe8ff'); sky.addColorStop(1, '#e9f5ff');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.95)'; for (let i = 0; i < 7; i++) { const x = rnd() * w, y = 40 + rnd() * 140; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + k * 26, y - Math.sin(k) * 14, 24 + rnd() * 10, 0, 7); g.fill(); } }
    for (let x = 0; x < w;) { const bw = 60 + rnd() * 90, bh = 90 + rnd() * 150; g.fillStyle = rnd() > 0.5 ? '#d8cfc1' : '#c9bfb0'; g.fillRect(x, h - bh, bw, bh); g.fillStyle = 'rgba(120,160,200,.6)'; for (let y = h - bh + 14; y < h - 20; y += 26) for (let xx = x + 10; xx < x + bw - 16; xx += 22) g.fillRect(xx, y, 12, 14); x += bw + 10; }
    g.fillStyle = '#4f8a4a'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd() * w, h - 10 - rnd() * 40, 30 + rnd() * 26, 0, 7); g.fill(); }
  });
  mesh(scene, new T.PlaneGeometry(12, 3.4), wallM, 0, 1.7, -5, { cast: false });
  const glowWin = new T.MeshBasicMaterial({ map: outside, toneMapped: false });
  const windows = [];
  for (const x of [-3.6, 0, 3.6]) {
    mesh(scene, new T.PlaneGeometry(2.8, 1.7), glowWin, x, 1.95, -4.98, { cast: false, receive: false });
    for (const [w, h, dx, dy] of [[2.95, 0.08, 0, 0.88], [2.95, 0.08, 0, -0.88], [0.08, 1.8, -1.44, 0], [0.08, 1.8, 1.44, 0], [0.05, 1.7, 0, 0], [2.8, 0.05, 0, 0.25]]) box(scene, w, h, 0.08, m.frame, x + dx, 1.95 + dy, -4.94);
    box(scene, 3.1, 0.06, 0.28, m.frame, x, 1.06, -4.86);
    windows.push(x);
  }
  // window light falling into the room
  const shaftTex = glowTexture('rgba(255,244,214,.55)', 'rgba(255,244,214,0)');
  for (const x of [-3.6, 0, 3.6]) mesh(scene, new T.PlaneGeometry(3.4, 4.2), new T.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.55, depthWrite: false }), x + 0.8, 0.02, -2.6, { r: [-Math.PI / 2, 0, 0.25], cast: false, receive: false });

  // whiteboard on the front wall
  const board = canvasTex(1600, 640, (g, w, h) => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d3f8f'; g.font = '700 74px Inter'; g.fillText('CpE 301 — Systems Design', 70, 120);
    g.fillStyle = MAROON; g.font = 'italic 400 64px "Instrument Serif"'; g.fillText('"Ama iter, non finem."', 70, 210);
    g.strokeStyle = '#1d3f8f'; g.lineWidth = 6;
    for (const [x, y, t] of [[80, 330, 'Input'], [520, 330, 'Process'], [980, 330, 'Output']]) { g.strokeRect(x, y - 60, 320, 110); g.fillStyle = '#1d3f8f'; g.font = '600 54px Inter'; g.fillText(t, x + 40, y + 12); }
    g.beginPath(); g.moveTo(400, 325); g.lineTo(510, 325); g.moveTo(840, 325); g.lineTo(970, 325); g.stroke();
    g.fillStyle = '#2f7d3f'; g.font = '500 44px Inter'; g.fillText('Due Friday: Portfolio ✓', 80, 520);
  });
  box(scene, 0.06, 1.5, 4.2, m.frame, 5.94, 1.75, 0);
  mesh(scene, new T.PlaneGeometry(4.0, 1.38), mat('#fff', 0.25, 0, { map: board }), 5.9, 1.75, 0, { r: [0, -Math.PI / 2, 0], cast: false });
  box(scene, 0.14, 0.04, 3.6, m.metal, 5.86, 0.98, 0);
  // teacher's desk + clock + flag of CIT-U
  box(scene, 0.8, 0.76, 1.6, m.wood, 4.6, 0.38, 2.6);
  const clock = canvasTex(256, 256, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#333'; g.stroke(); g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 50); g.moveTo(128, 128); g.lineTo(186, 150); g.stroke(); });
  mesh(scene, new T.CircleGeometry(0.22, 32), mat('#fff', 0.5, 0, { map: clock }), 5.92, 2.95, 2.6, { r: [0, -Math.PI / 2, 0], cast: false });

  // door on the back wall (Sean walks in here)
  box(scene, 0.1, 2.3, 1.3, m.woodDark, -5.95, 1.15, 3.6);
  const doorHinge = new T.Group(); doorHinge.position.set(-5.9, 0, 3.0); scene.add(doorHinge);
  box(doorHinge, 0.06, 2.2, 1.15, m.wood, 0, 1.1, 0.58);
  box(doorHinge, 0.08, 0.04, 0.2, m.gold, 0.06, 1.05, 1.0);
  doorHinge.rotation.y = -1.25;

  // desks + chairs (Sean's is at x = -0.35, z = 0.5)
  const deskTop = mat('#c9a476', 0.55), deskLeg = mat('#3a3b40', 0.4, 0.6), chairM = mat('#8a1c2b', 0.55);
  function desk(sx, sz) {
    const g = new T.Group(); g.position.set(sx, 0, sz); scene.add(g);
    box(g, 0.62, 0.04, 0.92, deskTop, 0.67, 0.74, 0);
    for (const dx of [0.42, 0.92]) for (const dz of [-0.4, 0.4]) box(g, 0.035, 0.72, 0.035, deskLeg, dx, 0.36, dz);
    box(g, 0.44, 0.04, 0.44, chairM, 0, 0.44, 0);
    box(g, 0.04, 0.46, 0.42, chairM, -0.22, 0.7, 0);
    for (const dx of [-0.18, 0.18]) for (const dz of [-0.18, 0.18]) box(g, 0.03, 0.44, 0.03, deskLeg, dx, 0.22, dz);
    return g;
  }
  const seats = [];
  for (const sx of [-2.6, -0.35, 1.9]) for (const sz of [-3.3, -1.4, 0.5, 2.4]) { desk(sx, sz); seats.push([sx, sz]); }

  // classmates in the CIT-U uniform, seated on the chair (top at y = 0.46) with forearms on the desk
  const paperM = mat('#fffaf0');
  function classmate(sx, sz, hair, skin, lookDown) {
    seatedPerson(scene, sx, 0.46, sz, { hair, skin, seatH: 0.46, hands: 'desk', deskY: 0.3, tilt: lookDown ? 0.35 : 0.05, lanyard: true });
    box(scene, 0.22, 0.004, 0.3, paperM, sx + 0.66, 0.762, sz, { cast: false });
  }
  classmate(-2.6, -1.4, '#1d140e', '#c98d6a', true);
  classmate(1.9, -3.3, '#2a1a10', '#b97a55', false);
  classmate(-2.6, 2.4, '#111', '#d4a07a', true);
  classmate(1.9, 0.5, '#3b2416', '#a86b48', false);
  classmate(-0.35, -3.3, '#1d140e', '#c98d6a', true);

  // --- Sean's props ---
  // notebook: starts at the far edge of the desk, slides over, opens; pages can turn
  const pageTex = (title, n) => canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,120,200,.14)'; g.lineWidth = 2; for (let y = 110; y < h; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(200,60,60,.2)'; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, h); g.stroke();
  });
  const nb = new T.Group(); scene.add(nb);
  const coverM = mat(MAROON, 0.6), paperL = mat('#fff', 0.9, 0, { map: pageTex('Quests', '') }), paperR = mat('#fff', 0.9, 0, { map: pageTex('Quest 01', '01') });
  const nbW = 0.34, nbD = 0.26;                                   // along z (width when open = 2*nbW/2), along x
  box(nb, nbD, 0.012, nbW / 2, coverM, 0, 0.006, nbW / 4);           // back cover (right half)
  mesh(nb, new T.PlaneGeometry(nbW / 2, nbD), paperR, 0, 0.0135, nbW / 4, { r: [-Math.PI / 2, 0, -Math.PI / 2], cast: false });
  const leftHinge = new T.Group(); nb.add(leftHinge);           // front cover + left page, hinged at the spine (z = 0)
  box(leftHinge, nbD, 0.012, nbW / 2, coverM, 0, 0.016, nbW / 4);
  mesh(leftHinge, new T.PlaneGeometry(nbW / 2, nbD), paperL, 0, 0.0095, nbW / 4, { r: [Math.PI / 2, 0, -Math.PI / 2], cast: false });
  const pageHinge = new T.Group(); nb.add(pageHinge);           // a turning page
  const turnPage = mesh(pageHinge, new T.PlaneGeometry(nbW / 2 * 0.98, nbD * 0.98), mat('#fffdf6', 0.9, 0, { side: T.DoubleSide, map: pageTex('Quest 02', '02') }), 0, 0.015, nbW / 4, { r: [-Math.PI / 2, 0, -Math.PI / 2], cast: false });
  turnPage.visible = false;
  const pageTexs = [pageTex('Quest 01', '01'), pageTex('Quest 02', '02'), pageTex('Quest 03', '03')];
  // pencil + water bottle on the desk
  mesh(scene, new T.CylinderGeometry(0.005, 0.005, 0.17, 6), mat('#f4c542', 0.5), 0.55, 0.765, 0.88, { r: [Math.PI / 2, 0.4, 0] });
  // (desk top spans x 0.01–0.63, z 0.04–0.96 at y 0.76 — the bottle stands on its far corner)
  mesh(scene, new T.CylinderGeometry(0.035, 0.035, 0.22, 18), mat('#5bb3e8', 0.2, 0.1, { transparent: true, opacity: 0.85 }), 0.52, 0.87, 0.14);
  mesh(scene, new T.CylinderGeometry(0.024, 0.03, 0.035, 14), mat('#1f416f', 0.5), 0.52, 0.997, 0.14);   // cap

  // backpack on the floor by his chair, flap opens
  const bag = new T.Group(); bag.position.set(-0.25, 0, 1.05); bag.rotation.y = 0.5; scene.add(bag);
  const bagM = mat('#2f5d9e', 0.62), bagD = mat('#1f416f', 0.7);
  mesh(bag, roundedBox(0.32, 0.42, 0.18, 0.05), bagM, 0, 0.21, 0);
  mesh(bag, roundedBox(0.24, 0.16, 0.06, 0.02), bagD, 0, 0.13, 0.11);
  const items = new T.Group(); bag.add(items);
  box(items, 0.18, 0.24, 0.04, mat('#c0392b', 0.7), 0.06, 0.34, 0.02);                 // book
  mesh(items, new T.CylinderGeometry(0.02, 0.02, 0.2, 10), mat('#f4c542', 0.5), -0.09, 0.36, 0.04);   // pen case
  items.position.y = -0.14;
  const flap = new T.Group(); flap.position.set(0, 0.42, -0.09); bag.add(flap);
  mesh(flap, roundedBox(0.33, 0.04, 0.22, 0.015), bagD, 0, 0.0, 0.1);

  // laptop: lives in the backpack until he takes it out (hinge on the far edge, screen faces him)
  const laptop = new T.Group(); laptop.visible = false; scene.add(laptop);
  const lapM = mat('#2e2f36', 0.35, 0.55), keyM = mat('#3f414b', 0.7, 0.2);
  mesh(laptop, roundedBox(0.22, 0.016, 0.31, 0.006), lapM, 0, 0.008, 0);
  box(laptop, 0.1, 0.002, 0.27, keyM, 0.04, 0.0165, 0, { cast: false });
  box(laptop, 0.06, 0.002, 0.09, mat('#4a4c57', 0.5), -0.065, 0.0165, 0, { cast: false });
  const lid = new T.Group(); lid.position.set(0.11, 0.016, 0); laptop.add(lid);
  mesh(lid, roundedBox(0.22, 0.01, 0.31, 0.004), lapM, -0.11, 0.005, 0);
  mesh(lid, new T.PlaneGeometry(0.2, 0.29), new T.MeshBasicMaterial({ color: '#f3eee4', toneMapped: false }), -0.11, -0.0012, 0, { r: [Math.PI / 2, 0, 0], cast: false });

  // light
  scene.add(new T.HemisphereLight('#fff6e8', '#b6a385', 0.82));   // stands in for the ceiling lamps' fill
  const sun = new T.DirectionalLight('#fff0d4', 1.25);
  sun.position.set(2, 7, -9); sun.target.position.set(0, 0, 0.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 1, far: 25 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  for (const [x, z] of [[-2.5, -1], [2, -1], [-2.5, 2.4], [2, 2.4]]) {
    box(scene, 1.4, 0.04, 0.3, new T.MeshBasicMaterial({ color: '#fffbea', toneMapped: false }), x, 3.37, z, { cast: false });   // lamp panels (glow only; 4 point lights here cost every pixel)
  }

  return { scene, nb, leftHinge, pageHinge, turnPage, paperR, pageTexs, bag, flap, items, doorHinge, laptop, lid, SEAT: [-0.35, 0.5], DOOR: [-5.6, 3.6] };
}
