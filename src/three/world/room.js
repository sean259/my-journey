import * as T from 'three';
import { rnd, mat, mesh, box, canvasTex, roundedBox, wobble, glowTexture, materials, plant } from './helpers.js';

/* ==========================================================
   ROOM
   ========================================================== */
export function buildRoom(opts) {
  const m = materials();
  const scene = new T.Scene();
  scene.background = new T.Color('#07080d');
  scene.fog = new T.Fog('#07080d', 6, 14);

  const floorTex = canvasTex(512, 512, (g) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#5a3f2c' : '#64462f'; g.fillRect(0, i * 64, 512, 64); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, i * 64, 512, 2); g.fillRect(((i * 197) % 512), i * 64, 2, 64); }
  }, [4, 4]);
  mesh(scene, new T.PlaneGeometry(10, 10), mat('#ffffff', 0.7, 0, { map: floorTex }), 0, 0, 0, { r: [-Math.PI / 2, 0, 0], cast: false });
  const wallM = mat('#2e3242', 0.95);
  mesh(scene, new T.PlaneGeometry(8, 3.4), wallM, 0, 1.7, -1.25, { cast: false });
  mesh(scene, new T.PlaneGeometry(6, 3.4), wallM, -2.6, 1.7, 1.75, { r: [0, Math.PI / 2, 0], cast: false });
  box(scene, 8, 0.12, 0.03, mat('#1a1b22'), 0, 0.06, -1.23);

  // window with a rainy night city
  const nightTex = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#2a3870'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) g.fillRect(rnd() * w, rnd() * h * 0.5, 2, 2);
    g.fillStyle = '#f3ecce'; g.beginPath(); g.arc(380, 110, 42, 0, Math.PI * 2); g.fill();
    for (let x = 0; x < w;) { const bw = 40 + rnd() * 50, bh = 120 + rnd() * 200; g.fillStyle = '#0a0d1d'; g.fillRect(x, h - bh, bw, bh); g.fillStyle = '#ffd27a'; for (let k = 0; k < 10; k++) if (rnd() > 0.4) g.fillRect(x + 6 + rnd() * (bw - 12), h - bh + 10 + rnd() * (bh - 20), 4, 6); x += bw + 4; }
  });
  mesh(scene, new T.PlaneGeometry(1.2, 1.1), new T.MeshBasicMaterial({ map: nightTex, toneMapped: false }), -1.5, 1.75, -1.24, { cast: false });
  const wf = mat('#14151c', 0.6);
  for (const [w, h, x, y] of [[1.32, 0.07, -1.5, 2.33], [1.32, 0.07, -1.5, 1.17], [0.07, 1.2, -2.13, 1.75], [0.07, 1.2, -0.87, 1.75], [0.04, 1.1, -1.5, 1.75], [1.2, 0.04, -1.5, 1.75]]) box(scene, w, h, 0.08, wf, x, y, -1.2);
  box(scene, 1.5, 0.05, 0.2, wf, -1.5, 1.13, -1.12);
  // rain streaks
  const rainGeo = new T.BufferGeometry(); const rp = [];
  for (let i = 0; i < 160; i++) { const x = -2.05 + rnd() * 1.1, y = 1.2 + rnd() * 1.1; rp.push(x, y, -1.21, x - 0.01, y - 0.06, -1.21); }
  rainGeo.setAttribute('position', new T.Float32BufferAttribute(rp, 3));
  const rain = new T.LineSegments(rainGeo, new T.LineBasicMaterial({ color: '#9fb6ff', transparent: true, opacity: 0.45 }));
  scene.add(rain);
  // curtains
  for (const cx of [-2.35, -0.65]) mesh(scene, wobble(new T.BoxGeometry(0.28, 1.6, 0.08, 6, 12, 1), 0.05), mat('#6b3446', 0.95), cx, 1.6, -1.15);

  // desk
  const deskM = mat('#6e4a31', 0.6), deskD = mat('#4b3121', 0.7);
  box(scene, 1.9, 0.05, 0.8, deskM, 0, 0.75, -0.75);
  for (const sx of [-0.78, 0.78]) box(scene, 0.32, 0.72, 0.74, deskD, sx, 0.36, -0.75);
  for (const sx of [-0.78, 0.78]) for (const y of [0.55, 0.3]) { box(scene, 0.28, 0.2, 0.02, deskM, sx, y, -0.37); box(scene, 0.08, 0.02, 0.02, m.gold, sx, y, -0.355); }

  // CRT monitor
  const beige = mat('#ddd5c1', 0.55), beigeD = mat('#bdb39c', 0.6);
  const crt = new T.Group(); crt.position.set(0, 0.775, -0.78); scene.add(crt);
  mesh(crt, roundedBox(0.52, 0.03, 0.3, 0.012), beige, 0, 0.015, 0);
  mesh(crt, new T.CylinderGeometry(0.06, 0.09, 0.06, 16), beigeD, 0, 0.06, 0);
  mesh(crt, roundedBox(0.52, 0.44, 0.24, 0.035), beige, 0, 0.31, 0.06);
  const back = mesh(crt, new T.CylinderGeometry(0.16, 0.24, 0.26, 4, 1), beigeD, 0, 0.31, -0.16, { r: [Math.PI / 2, Math.PI / 4, 0] });
  back.scale.set(1, 1, 0.85);
  box(crt, 0.42, 0.33, 0.01, mat('#a69e88', 0.7), 0, 0.33, 0.181);
  // curved screen with a live canvas texture (boot sequence drawn by story/stages/room.js)
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 1024; screenCanvas.height = 768;
  const screenTex = new T.CanvasTexture(screenCanvas); screenTex.encoding = T.sRGBEncoding;
  const sg = new T.PlaneGeometry(0.37, 0.278, 24, 18);
  { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.012 * (1 - 0.5 * (x / 0.185) ** 2 - 0.5 * (y / 0.139) ** 2)); } sg.computeVertexNormals(); }
  const screenMat = new T.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const screen = mesh(crt, sg, screenMat, 0, 0.33, 0.188, { cast: false });
  const led = mesh(crt, new T.SphereGeometry(0.006, 8, 6), new T.MeshBasicMaterial({ color: '#333' }), 0.17, 0.13, 0.185);
  mesh(crt, new T.PlaneGeometry(0.07, 0.065), mat('#f7e16b', 0.8), -0.215, 0.14, 0.19, { r: [0, 0, 0.12] });
  const screenGlow = new T.PointLight('#7dffad', 0, 1.6, 2); screenGlow.position.set(0, 1.1, -0.35); scene.add(screenGlow);

  // keyboard, mouse, mug, plant
  const kbTex = canvasTex(512, 160, (g) => { g.fillStyle = '#cfc7b0'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#e6dfcb'; for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) g.fillRect(8 + c * 33, 8 + r * 30, 28, 24); });
  mesh(scene, roundedBox(0.46, 0.03, 0.16, 0.008), mat('#ffffff', 0.6, 0, { map: kbTex }), 0, 0.79, -0.4, { r: [0.06, 0, 0] });
  mesh(scene, new T.CapsuleGeometry(0.022, 0.04, 6, 12), beige, 0.36, 0.79, -0.42, { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.6] });
  const mug = new T.Group(); mug.position.set(-0.55, 0.775, -0.55); scene.add(mug);
  mesh(mug, new T.CylinderGeometry(0.045, 0.042, 0.11, 20), mat('#f0ebe0', 0.4), 0, 0.055, 0);
  mesh(mug, new T.CylinderGeometry(0.0455, 0.0455, 0.02, 20), mat('#5b5ff5', 0.4), 0, 0.075, 0);
  mesh(mug, new T.TorusGeometry(0.028, 0.008, 8, 16), mat('#f0ebe0', 0.4), 0.05, 0.055, 0);
  const steam = []; const sTex = glowTexture('rgba(255,255,255,.5)', 'rgba(255,255,255,0)');
  for (let i = 0; i < 3; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: sTex, transparent: true, opacity: 0.3, depthWrite: false })); s.scale.set(0.08, 0.08, 1); s.position.set(-0.55, 0.9, -0.55); scene.add(s); steam.push(s); }
  plant(scene, -0.8, -0.95, 0.55, 0.775);

  // desk lamp + its real light
  const lampM = mat('#2b2c35', 0.5, 0.4);
  const lamp = new T.Group(); lamp.position.set(0.65, 0.775, -0.85); scene.add(lamp);
  mesh(lamp, new T.CylinderGeometry(0.09, 0.1, 0.02, 20), lampM, 0, 0.01, 0);
  mesh(lamp, new T.CylinderGeometry(0.012, 0.012, 0.42, 8), lampM, -0.05, 0.22, 0, { r: [0, 0, 0.25] });
  mesh(lamp, new T.CylinderGeometry(0.012, 0.012, 0.36, 8), lampM, -0.2, 0.46, 0.05, { r: [0, 0.3, -1.1] });
  mesh(lamp, new T.ConeGeometry(0.09, 0.14, 24, 1, true), mat('#c24a3a', 0.5, 0.2, { side: T.DoubleSide }), -0.36, 0.5, 0.1, { r: [0, 0, 0.5] });
  const bulb = mesh(lamp, new T.SphereGeometry(0.03, 12, 10), new T.MeshBasicMaterial({ color: '#3a3020' }), -0.33, 0.45, 0.1, { cast: false });
  const lampLight = new T.SpotLight('#ffcf8f', 0, 4, 0.9, 0.7, 1.2);
  lampLight.position.set(0.3, 1.22, -0.75); lampLight.target.position.set(0.05, 0.75, -0.55);
  lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.0005;
  scene.add(lampLight, lampLight.target);
  const lampFill = new T.PointLight('#ffb36b', 0, 4.5, 2); lampFill.position.set(0.3, 1.3, -0.4); scene.add(lampFill);

  // shelf + books + poster + clock
  box(scene, 0.9, 0.03, 0.22, deskM, 0, 1.75, -1.13);
  const bookC = ['#8c3b3b', '#3b5c8c', '#c9a227', '#2f6b4f', '#d8d2c0', '#6e4a8c', '#b5643c'];
  let bx = -0.38; for (let i = 0; i < 9; i++) { const bw = 0.03 + rnd() * 0.03, bh = 0.18 + rnd() * 0.08; box(scene, bw, bh, 0.15, mat(bookC[i % 7], 0.8), bx, 1.765 + bh / 2, -1.13, { r: [0, 0, i === 8 ? 0.3 : 0] }); bx += bw + 0.008; }
  const posterTex = canvasTex(512, 720, (g, w, h) => {
    g.fillStyle = '#1c0709'; g.fillRect(0, 0, w, h);
    if (opts.posterImage) g.drawImage(opts.posterImage, 24, 24, w - 48, w - 48);
    g.fillStyle = '#f1ece0'; g.font = '900 88px Archivo'; g.fillText('AMA', 30, h - 150);
    g.fillStyle = '#e30613'; g.fillText('ITER.', 30, h - 60);
    g.fillStyle = '#bdb6a8'; g.font = '600 26px Inter'; g.fillText('NON FINEM.', 34, h - 22);
  });
  mesh(scene, new T.PlaneGeometry(0.5, 0.7), mat('#fff', 0.8, 0, { map: posterTex }), 1.15, 1.75, -1.24, { cast: false });
  const clock = new T.Group(); clock.position.set(0.75, 2.3, -1.23); scene.add(clock);
  mesh(clock, new T.CylinderGeometry(0.13, 0.13, 0.03, 32), mat('#ece6d6', 0.5), 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
  mesh(clock, new T.TorusGeometry(0.13, 0.012, 8, 32), mat('#15161c', 0.4), 0, 0, 0.015);
  const handH = new T.Group(), handM = new T.Group(), handS = new T.Group();
  for (const [hg, len, wdt, c] of [[handH, 0.065, 0.01, '#15161c'], [handM, 0.1, 0.007, '#15161c'], [handS, 0.11, 0.003, '#d9472b']]) { clock.add(hg); hg.position.z = 0.02; box(hg, wdt, len, 0.004, mat(c), 0, len / 2, 0, { cast: false }); }

  // an orange tabby loafing on the desk
  const cat = new T.Group(); cat.position.set(0.43, 0.775, -0.63); cat.rotation.y = 0.35; scene.add(cat);
  const fur = mat('#d98a3d', 0.85), furD = mat('#a8612a', 0.9), furL = mat('#f2d2a8', 0.85), pink = mat('#e89a9a', 0.7), catEye = mat('#1a1a14', 0.3);
  const catBody = new T.Group(); cat.add(catBody);
  mesh(catBody, new T.SphereGeometry(0.1, 28, 20), fur, 0, 0.065, 0, { s: [1.2, 0.7, 0.8] });
  for (let i = 0; i < 4; i++) mesh(catBody, new T.TorusGeometry(0.084, 0.007, 6, 24, Math.PI), furD, -0.07 + i * 0.035, 0.07, 0, { r: [0, Math.PI / 2, 0], s: [1, 0.72, 0.85] });
  mesh(catBody, new T.SphereGeometry(0.05, 18, 14), furL, 0.085, 0.045, 0, { s: [0.7, 0.8, 1.2] });
  for (const z of [-0.035, 0.035]) mesh(catBody, new T.SphereGeometry(0.022, 12, 10), furL, 0.11, 0.012, z, { s: [1.3, 0.6, 1] });
  const catHead = new T.Group(); catHead.position.set(0.1, 0.12, 0); cat.add(catHead);
  mesh(catHead, new T.SphereGeometry(0.052, 24, 18), fur, 0, 0, 0, { s: [0.95, 0.88, 1.05] });
  mesh(catHead, new T.SphereGeometry(0.024, 14, 10), furL, 0.04, -0.016, 0, { s: [0.8, 0.7, 1.2] });
  mesh(catHead, new T.SphereGeometry(0.006, 8, 6), pink, 0.06, -0.004, 0);
  for (const z of [-0.022, 0.022]) mesh(catHead, new T.CapsuleGeometry(0.004, 0.012, 4, 8), catEye, 0.045, 0.012, z, { r: [Math.PI / 2, 0, 0.15] });   // sleepy closed eyes
  for (let i = 0; i < 3; i++) mesh(catHead, new T.BoxGeometry(0.008, 0.004, 0.012), furD, -0.01 + i * 0.012, 0.045, 0, { cast: false });
  const ears = [];
  for (const z of [-0.03, 0.03]) {
    const ear = new T.Group(); ear.position.set(-0.005, 0.04, z); ear.rotation.x = z > 0 ? -0.25 : 0.25; catHead.add(ear);
    mesh(ear, new T.ConeGeometry(0.019, 0.04, 4), fur, 0, 0.016, 0);
    mesh(ear, new T.ConeGeometry(0.011, 0.026, 4), pink, 0.006, 0.012, 0);
    ears.push(ear);
  }
  const tailPts = [[-0.11, 0.04, 0], [-0.14, 0.02, 0.05], [-0.1, 0.012, 0.1], [0, 0.01, 0.105], [0.07, 0.012, 0.09]];
  const catTail = new T.Group(); cat.add(catTail);
  const tailMesh = mesh(catTail, new T.TubeGeometry(new T.CatmullRomCurve3(tailPts.map((p) => new T.Vector3(...p))), 28, 0.014, 8, false), fur);
  const tailTip = mesh(catTail, new T.SphereGeometry(0.016, 10, 8), furD, 0.07, 0.012, 0.09);

  const hemi = new T.HemisphereLight('#3a4a8a', '#0a0a12', 0.5); scene.add(hemi);
  const moon = new T.DirectionalLight('#8fa8ff', 0.35); moon.position.set(-2, 3, 1); scene.add(moon);

  return { scene, cat: { body: catBody, head: catHead, ears, tail: catTail, tailPts, tailMesh, tailTip }, screen, screenCanvas, screenTex, screenMat, screenGlow, lampLight, lampFill, bulb, led, rain, steam, handH, handM, handS,
    screenCenter: new T.Vector3(0, 0.775 + 0.33, -0.78 + 0.188), screenSize: [0.37, 0.278] };
}
