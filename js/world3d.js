/* ==========================================================
   3D WORLDS (Three.js) — the room, the Cebu street, the CIT-U hallway.
   Units are metres. Each builder returns { scene, ...handles } that
   js/main.js animates from the scroll timeline.
   ========================================================== */
(() => {
  'use strict';
  const T = window.THREE;
  const MAROON = '#8a1c2b', GOLD = '#f4c542';

  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  /* ---------------- helpers ---------------- */
  const mat = (color, roughness = 0.8, metalness = 0, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  function mesh(parent, geo, m, x = 0, y = 0, z = 0, o = {}) {
    const me = new T.Mesh(geo, m);
    me.position.set(x, y, z);
    if (o.r) me.rotation.set(...o.r);
    if (o.s) me.scale.set(...o.s);
    me.castShadow = o.cast !== false;
    me.receiveShadow = o.receive !== false;
    parent.add(me);
    return me;
  }
  const box = (p, w, h, d, m, x, y, z, o) => mesh(p, new T.BoxGeometry(w, h, d), m, x, y, z, o);
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...repeat); }
    return t;
  }
  function roundedBox(w, h, d, r) {
    const s = new T.Shape(), x = -w / 2 + r, y = -h / 2 + r, iw = w - 2 * r, ih = h - 2 * r, c = Math.min(iw, ih) * 0.2;
    s.moveTo(x + c, y); s.lineTo(x + iw - c, y); s.quadraticCurveTo(x + iw, y, x + iw, y + c);
    s.lineTo(x + iw, y + ih - c); s.quadraticCurveTo(x + iw, y + ih, x + iw - c, y + ih);
    s.lineTo(x + c, y + ih); s.quadraticCurveTo(x, y + ih, x, y + ih - c); s.lineTo(x, y + c); s.quadraticCurveTo(x, y, x + c, y);
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 8 });
    g.center();
    return g;
  }
  function label(text, { w = 1024, h = 256, bg = '#fff', fg = '#000', font = '800 120px Archivo', border, radius = 24, sub, subFont = '600 56px Inter', subFg } = {}) {
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
  function wobble(geo, amt) {                       // organic lumps for foliage
    const p = geo.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = 1 + (Math.sin(v.x * 7.1 + v.y * 3.3) * 0.5 + Math.sin(v.z * 5.7 - v.y * 4.1) * 0.5) * amt;
      v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }
  function glowTexture(inner = 'rgba(255,248,220,1)', outer = 'rgba(255,200,120,0)') {
    return canvasTex(256, 256, (g) => {
      const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, inner); gr.addColorStop(0.25, 'rgba(255,226,150,.6)'); gr.addColorStop(1, outer);
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    });
  }
  function skyDome(radius) {
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
  function materials() {
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

  function tree(parent, x, z, s = 1) {
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
  function palm(parent, x, z, h = 7, lean = 0.6) {
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

  function plant(parent, x, z, s = 1, y0 = 0) {
    const m = materials();
    mesh(parent, new T.CylinderGeometry(0.22 * s, 0.16 * s, 0.4 * s, 16), m.pot, x, y0 + 0.2 * s, z);
    for (let i = 0; i < 4; i++) mesh(parent, wobble(new T.SphereGeometry(0.22 * s, 28, 20), 0.15), [m.leafA, m.leafB, m.leafC][i % 3], x + (rnd() - 0.5) * 0.3 * s, y0 + (0.5 + rnd() * 0.3) * s, z + (rnd() - 0.5) * 0.3 * s);
  }

  function windowPane(parent, x, y, z, w, h, opts = {}) {
    const m = materials();
    box(parent, w + 0.12, h + 0.12, 0.08, opts.frameMat || m.frame, x, y, z);
    box(parent, w, h, 0.1, m.glass, x, y, z + 0.01, { cast: false, receive: false });
    if (opts.bars) for (let i = 1; i < 5; i++) box(parent, 0.025, h, 0.03, m.black, x - w / 2 + (w / 5) * i, y, z + 0.08);
    box(parent, w + 0.24, 0.06, 0.18, m.concreteDark, x, y - h / 2 - 0.08, z + 0.06);
  }

  function house(parent, x, z, w, d, h, wall, opts = {}) {
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

  /* ==========================================================
     ROOM
     ========================================================== */
  function buildRoom(opts) {
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
    // curved screen with a live canvas texture (boot sequence drawn by main.js)
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
    const shade = mesh(lamp, new T.ConeGeometry(0.09, 0.14, 24, 1, true), mat('#c24a3a', 0.5, 0.2, { side: T.DoubleSide }), -0.36, 0.5, 0.1, { r: [0, 0, 0.5] });
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

    const hemi = new T.HemisphereLight('#3a4a8a', '#0a0a12', 0.5); scene.add(hemi);
    const moon = new T.DirectionalLight('#8fa8ff', 0.35); moon.position.set(-2, 3, 1); scene.add(moon);

    return { scene, screen, screenCanvas, screenTex, screenMat, screenGlow, lampLight, lampFill, bulb, led, rain, steam, handH, handM, handS,
      screenCenter: new T.Vector3(0, 0.775 + 0.33, -0.78 + 0.188), screenSize: [0.37, 0.278] };
  }

  /* ==========================================================
     THE STREET — walk from home (x≈0) to CIT-U's door (x = DOOR_X)
     Sean walks along z = 0.3; building fronts are at z ≈ -3.
     ========================================================== */
  const DOOR_X = 220, PATH_Z = 0.3;            // CIT-U sits far down the road: the commute should feel like a trip
  function buildStreet() {
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

  /* ==========================================================
     THE HALLWAY — one door per portfolio section
     ========================================================== */
  function buildHall(labels) {
    const m = materials();
    const scene = new T.Scene();
    scene.background = new T.Color('#e9dfcb');
    scene.fog = new T.Fog('#e9dfcb', 12, 40);
    const L = 12 * labels.length + 30;
    const floorTex = canvasTex(256, 256, (g) => { g.fillStyle = '#e3d8c3'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#c9bca2'; g.fillRect(128, 0, 128, 128); g.fillRect(0, 128, 128, 128); }, [L / 1.6, 6]);
    mesh(scene, new T.PlaneGeometry(L, 10), mat('#fff', 0.28, 0.05, { map: floorTex }), L / 2 - 10, 0, 2, { r: [-Math.PI / 2, 0, 0], cast: false });
    mesh(scene, new T.PlaneGeometry(L, 10), mat('#f3ecdf', 0.9), L / 2 - 10, 3.3, 2, { r: [Math.PI / 2, 0, 0], cast: false });
    const wallTex = canvasTex(512, 512, (g) => { g.fillStyle = '#f4ecdc'; g.fillRect(0, 0, 512, 512); g.fillStyle = MAROON; g.fillRect(0, 300, 512, 18); g.fillStyle = GOLD; g.fillRect(0, 318, 512, 6); g.fillStyle = '#e7dcc6'; g.fillRect(0, 324, 512, 188); }, [L / 4, 1]);
    mesh(scene, new T.PlaneGeometry(L, 3.3), mat('#fff', 0.9, 0, { map: wallTex }), L / 2 - 10, 1.65, -1.6, { cast: false });
    box(scene, L, 0.12, 0.05, m.woodDark, L / 2 - 10, 0.06, -1.57);

    const lockerM = mat('#8a1c2b', 0.45, 0.35), ventM = mat('#3d0a12', 0.8);
    const corkM = mat('#c08a54', 0.95), paperM = [mat('#fffaf0'), mat('#ffe38a'), mat('#cfe8ff'), mat('#ffc9d3')];
    const doors = [];
    labels.forEach((name, i) => {
      const x = 4 + i * 12;
      // door + frame + room sign
      box(scene, 1.5, 2.6, 0.1, m.woodDark, x, 1.3, -1.55);
      box(scene, 1.3, 2.45, 0.08, m.wood, x, 1.23, -1.5);
      box(scene, 0.55, 0.5, 0.09, m.glass, x, 1.75, -1.49, { cast: false, receive: false });
      box(scene, 0.06, 0.22, 0.06, m.gold, x + 0.48, 1.15, -1.44);
      const tex = label(name, { w: 1024, h: 220, bg: '#fffaf0', fg: MAROON, font: '900 104px Archivo', border: MAROON, radius: 18 });
      mesh(scene, new T.PlaneGeometry(1.7, 0.36), mat('#fff', 0.6, 0, { map: tex }), x, 2.85, -1.54, { cast: false });
      doors.push(x);
      // lockers
      for (let k = 0; k < 8; k++) {
        const lx = x + 2.4 + k * 0.62;
        box(scene, 0.6, 1.95, 0.42, lockerM, lx, 0.975, -1.38);
        for (let v = 0; v < 4; v++) box(scene, 0.34, 0.02, 0.01, ventM, lx, 1.75 - v * 0.05, -1.165, { cast: false });
        box(scene, 0.03, 0.18, 0.03, m.gold, lx + 0.2, 1.05, -1.16);
      }
      // bulletin board + notes, high windows, ceiling light
      box(scene, 1.8, 1.1, 0.06, corkM, x - 3.2, 1.6, -1.56);
      for (let n = 0; n < 5; n++) box(scene, 0.32, 0.3, 0.01, paperM[n % 4], x - 3.85 + (n % 3) * 0.55, 1.78 - Math.floor(n / 3) * 0.42, -1.52, { r: [0, 0, (rnd() - 0.5) * 0.2], cast: false });
      mesh(scene, new T.PlaneGeometry(2.4, 0.7), new T.MeshBasicMaterial({ color: '#dff1ff', toneMapped: false }), x + 4.6, 2.75, -1.58, { cast: false });
      box(scene, 1.6, 0.05, 0.5, new T.MeshBasicMaterial({ color: '#fffbe6', toneMapped: false }), x + 1, 3.27, 0.4, { cast: false });
    });

    scene.add(new T.HemisphereLight('#fff6e6', '#b9a888', 0.75));
    const key = new T.DirectionalLight('#fff1d6', 0.8);
    key.position.set(4, 7, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 6, bottom: -3, near: 1, far: 30 });
    key.shadow.bias = -0.0004;
    scene.add(key, key.target);
    const warm = new T.PointLight('#ffe0b0', 0.5, 10, 2); scene.add(warm);
    return { scene, doors, key, warm };
  }

  /* ==========================================================
     THE CLASSROOM — where the portfolio chapters happen.
     Students face +X (the whiteboard). Windows are on the -Z wall,
     the door on the back (-X) wall. Sean's seat is at (-0.35, 0.5).
     ========================================================== */
  function buildClassroom() {
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

    // classmates (simple seated figures)
    function classmate(sx, sz, shirt, hair, skin, lookDown) {
      const p = new T.Group(); p.position.set(sx, 0.46, sz); scene.add(p);
      const sm = mat(shirt, 0.8), km = mat(skin, 0.6), pm = mat('#2b2f3f', 0.8);
      mesh(p, new T.CapsuleGeometry(0.15, 0.3, 6, 14), sm, 0, 0.38, 0, { s: [0.75, 1, 1] });
      mesh(p, new T.SphereGeometry(0.11, 18, 14), km, 0.02, 0.8, 0, { s: [1, 1.1, 0.92] });
      mesh(p, new T.SphereGeometry(0.117, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hair, 0.9), -0.01, 0.82, 0, { r: [0, 0, lookDown ? -0.4 : 0] });
      box(p, 0.44, 0.13, 0.28, pm, 0.2, 0.04, 0);
      box(p, 0.12, 0.44, 0.26, pm, 0.4, -0.2, 0);
      for (const z of [-0.2, 0.2]) mesh(p, new T.CapsuleGeometry(0.045, 0.28, 4, 8), sm, 0.16, 0.36, z, { r: [0, 0, -1.1] });
      box(scene, 0.22, 0.02, 0.3, mat('#fffaf0'), sx + 0.6, 0.77, sz);
      return p;
    }
    classmate(-2.6, -1.4, '#f4f4ef', '#1d140e', '#c98d6a', true);
    classmate(1.9, -3.3, '#f4f4ef', '#2a1a10', '#b97a55', false);
    classmate(-2.6, 2.4, '#f4f4ef', '#111', '#d4a07a', true);
    classmate(1.9, 0.5, '#f4f4ef', '#3b2416', '#a86b48', false);
    classmate(-0.35, -3.3, '#f4f4ef', '#1d140e', '#c98d6a', true);

    // --- Sean's props ---
    // notebook: starts at the far edge of the desk, slides over, opens; pages can turn
    const pageTex = (title, n) => canvasTex(512, 640, (g, w, h) => {
      g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(80,120,200,.28)'; g.lineWidth = 2; for (let y = 110; y < h; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = 'rgba(200,60,60,.35)'; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, h); g.stroke();
      g.fillStyle = MAROON; g.font = 'italic 400 64px "Instrument Serif"'; g.fillText(title, 90, 90);
      g.fillStyle = '#2b2b3a'; g.font = '400 30px Inter'; for (let i = 0; i < 8; i++) g.fillRect(90, 140 + i * 38, 120 + ((i * 97) % 260), 3);
      if (n) { g.font = 'italic 400 120px "Instrument Serif"'; g.fillStyle = 'rgba(138,28,43,.18)'; g.fillText(n, 300, 560); }
    });
    const nb = new T.Group(); scene.add(nb);
    const coverM = mat(MAROON, 0.6), paperL = mat('#fff', 0.9, 0, { map: pageTex('Quests', '') }), paperR = mat('#fff', 0.9, 0, { map: pageTex('Quest 01', '01') });
    const nbW = 0.34, nbD = 0.26;                                   // along z (width when open = 2*nbW/2), along x
    box(nb, nbD, 0.012, nbW / 2, coverM, 0, 0.006, nbW / 4);           // back cover (right half)
    mesh(nb, new T.PlaneGeometry(nbD, nbW / 2), paperR, 0, 0.0135, nbW / 4, { r: [-Math.PI / 2, 0, -Math.PI / 2], cast: false });
    const leftHinge = new T.Group(); nb.add(leftHinge);           // front cover + left page, hinged at the spine (z = 0)
    box(leftHinge, nbD, 0.012, nbW / 2, coverM, 0, 0.016, nbW / 4);
    mesh(leftHinge, new T.PlaneGeometry(nbD, nbW / 2), paperL, 0, 0.0095, nbW / 4, { r: [Math.PI / 2, 0, -Math.PI / 2], cast: false });
    const pageHinge = new T.Group(); nb.add(pageHinge);           // a turning page
    const turnPage = mesh(pageHinge, new T.PlaneGeometry(nbD * 0.98, nbW / 2 * 0.98), mat('#fffdf6', 0.9, 0, { side: T.DoubleSide, map: pageTex('Quest 02', '02') }), 0, 0.015, nbW / 4, { r: [-Math.PI / 2, 0, -Math.PI / 2], cast: false });
    turnPage.visible = false;
    const pageTexs = [pageTex('Quest 01', '01'), pageTex('Quest 02', '02'), pageTex('Quest 03', '03')];
    // pencil + water bottle on the desk
    mesh(scene, new T.CylinderGeometry(0.005, 0.005, 0.17, 6), mat('#f4c542', 0.5), 0.55, 0.765, 0.88, { r: [Math.PI / 2, 0.4, 0] });
    mesh(scene, new T.CylinderGeometry(0.035, 0.035, 0.22, 18), mat('#5bb3e8', 0.2, 0.1, { transparent: true, opacity: 0.85 }), 0.78, 0.87, 0.15);

    // backpack on the floor by his chair, flap opens
    const bag = new T.Group(); bag.position.set(-0.25, 0, 1.05); bag.rotation.y = 0.5; scene.add(bag);
    const bagM = mat('#2f5d9e', 0.62), bagD = mat('#1f416f', 0.7);
    mesh(bag, roundedBox(0.32, 0.42, 0.18, 0.05), bagM, 0, 0.21, 0);
    mesh(bag, roundedBox(0.24, 0.16, 0.06, 0.02), bagD, 0, 0.13, 0.11);
    const items = new T.Group(); bag.add(items);
    box(items, 0.22, 0.26, 0.02, mat('#2b2b33', 0.4, 0.3), -0.02, 0.38, -0.03);           // laptop
    box(items, 0.18, 0.24, 0.04, mat('#c0392b', 0.7), 0.06, 0.34, 0.02);                 // book
    mesh(items, new T.CylinderGeometry(0.02, 0.02, 0.2, 10), mat('#f4c542', 0.5), -0.09, 0.36, 0.04);   // pen case
    items.position.y = -0.14;
    const flap = new T.Group(); flap.position.set(0, 0.42, -0.09); bag.add(flap);
    mesh(flap, roundedBox(0.33, 0.04, 0.22, 0.015), bagD, 0, 0.0, 0.1);

    // light
    scene.add(new T.HemisphereLight('#fff6e8', '#b6a385', 0.7));
    const sun = new T.DirectionalLight('#fff0d4', 1.25);
    sun.position.set(2, 7, -9); sun.target.position.set(0, 0, 0.5);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 1, far: 25 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    for (const [x, z] of [[-2.5, -1], [2, -1], [-2.5, 2.4], [2, 2.4]]) {
      box(scene, 1.4, 0.04, 0.3, new T.MeshBasicMaterial({ color: '#fffbea', toneMapped: false }), x, 3.37, z, { cast: false });
      const pl = new T.PointLight('#fff1d8', 0.25, 6, 2); pl.position.set(x, 3.1, z); scene.add(pl);
    }

    return { scene, nb, leftHinge, pageHinge, turnPage, paperR, pageTexs, bag, flap, items, doorHinge, SEAT: [-0.35, 0.5], DOOR: [-5.6, 3.6] };
  }

  window.World3D = { buildRoom, buildStreet, buildHall, buildClassroom, DOOR_X, PATH_Z };
})();
