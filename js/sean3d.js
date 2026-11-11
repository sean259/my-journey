/* ==========================================================
   SEAN — 3D character (Three.js), built from smooth primitives.
   Units are metres (≈1.72 m tall). He faces +X; the camera sits on +Z.

   Skeleton: body → pelvis → hips → knees → ankles
                          → torso → shoulders → elbows
                                  → neck → head
   The walk uses keyed gait curves (hip, knee, foot pitch per stride,
   Catmull-Rom interpolated). Body height comes from whichever foot is
   lowest, and stride length is derived from the gait so planted feet
   don't slide.

   const sean = Sean3D.create();  scene.add(sean.root);
   sean.update(distanceWalkedInMetres, performance.now(), { onStep, face });
   ========================================================== */
(() => {
  'use strict';
  const T = window.THREE;

  const THIGH = 0.43, SHIN = 0.42, HIP_H = 0.925;
  const SOLE = [[-0.065, 0.078], [0.2, 0.078]];   // heel & toe relative to ankle (x fwd, y down)
  const D2R = Math.PI / 180;

  const GAIT = [
    [0.00, 24, 3, 14], [0.10, 20, 16, 0], [0.25, 10, 10, 0], [0.40, -2, 5, 0], [0.50, -10, 8, -8],
    [0.60, -14, 34, -32], [0.70, -4, 60, -24], [0.82, 16, 46, -6], [0.92, 26, 14, 6]
  ];
  function sampler(col) {
    const n = GAIT.length;
    const P = (j) => { const k = ((j % n) + n) % n; return [GAIT[k][0] + Math.floor(j / n), GAIT[k][col]]; };
    return (phi) => {
      phi = ((phi % 1) + 1) % 1;
      let i = 0;
      while (i < n - 1 && phi >= GAIT[i + 1][0]) i++;
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const span = p2[0] - p1[0], u = (phi - p1[0]) / span;
      const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * span, m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * span;
      const u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
    };
  }
  const hipAt = sampler(1), kneeAt = sampler(2), pitchAt = sampler(3);
  const armAt = (phi) => -0.75 * (hipAt(phi) - 6);
  const elbowAt = (phi) => 14 + 0.7 * Math.max(0, armAt(phi - 0.06));

  function lowest(hip, knee, pitch) {           // lowest sole point below the hip (m)
    const a1 = hip * D2R, a2 = (hip - knee) * D2R, p = pitch * D2R;
    const ay = THIGH * Math.cos(a1) + SHIN * Math.cos(a2);
    let low = -Infinity;
    for (const [x, y] of SOLE) low = Math.max(low, ay + (-x * Math.sin(p) + y * Math.cos(p)));
    return low;
  }
  function footX(hip, knee) { return THIGH * Math.sin(hip * D2R) + SHIN * Math.sin((hip - knee) * D2R); }
  const clampSit = (v) => Math.max(0, Math.min(1, v || 0));
  const STRIDE = (footX(hipAt(0.1), kneeAt(0.1)) - footX(hipAt(0.5), kneeAt(0.5))) / 0.4;

  /* ---------------- build ---------------- */
  const mat = (color, roughness = 0.7, metalness = 0, extra = {}) =>
    new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });

  function roundedBox(w, h, d, r) {
    const s = new T.Shape(), x = -w / 2 + r, y = -h / 2 + r, iw = w - 2 * r, ih = h - 2 * r, c = Math.min(iw, ih) * 0.25;
    s.moveTo(x + c, y); s.lineTo(x + iw - c, y); s.quadraticCurveTo(x + iw, y, x + iw, y + c);
    s.lineTo(x + iw, y + ih - c); s.quadraticCurveTo(x + iw, y + ih, x + iw - c, y + ih);
    s.lineTo(x + c, y + ih); s.quadraticCurveTo(x, y + ih, x, y + ih - c);
    s.lineTo(x, y + c); s.quadraticCurveTo(x, y, x + c, y);
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 6 });
    g.center();
    return g;
  }

  function create() {
    const M = {
      skin: mat('#d9a07a', 0.55), shirt: mat('#f2f2ec', 0.85), shirtShade: mat('#e2e2da', 0.9),
      pants: mat('#262a40', 0.78), shoe: mat('#141416', 0.32, 0.1), sole: mat('#3a3a3d', 0.85),
      hair: mat('#3d2313', 0.92), lens: mat('#ff8a1e', 0.1, 0.55, { emissive: new T.Color('#ff5a00'), emissiveIntensity: 0.22 }),
      frame: mat('#1b1b1d', 0.3, 0.6), lany: mat('#8a1c2b', 0.7), card: mat('#ffffff', 0.5), gold: mat('#f4c542', 0.4, 0.3),
      bag: mat('#2f5d9e', 0.62), bagDark: mat('#1f416f', 0.7), belt: mat('#2b211b', 0.6), buckle: mat('#c9b37a', 0.3, 0.8),
      mouth: mat('#9a5a48', 0.6), button: mat('#d4d4cc', 0.5)
    };
    const add = (parent, geo, m, x = 0, y = 0, z = 0, opts = {}) => {
      const o = new T.Mesh(geo, m);
      o.position.set(x, y, z);
      if (opts.s) o.scale.set(...opts.s);
      if (opts.r) o.rotation.set(...opts.r);
      o.castShadow = true; o.receiveShadow = true;
      parent.add(o);
      return o;
    };
    const tube = (parent, pts, r, m) => {
      const curve = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p)));
      return add(parent, new T.TubeGeometry(curve, 24, r, 6, false), m);
    };

    const root = new T.Group();
    const body = new T.Group(); root.add(body);
    const pelvis = new T.Group(); pelvis.position.y = HIP_H; body.add(pelvis);
    add(pelvis, new T.SphereGeometry(0.15, 24, 16), M.pants, 0, 0.02, 0, { s: [0.82, 0.62, 1.12] });

    function leg(side) {
      const hip = new T.Group(); hip.position.z = side * 0.09; pelvis.add(hip);
      add(hip, new T.CapsuleGeometry(0.076, 0.28, 8, 18), M.pants, 0, -0.215, 0, { s: [1.05, 1, 0.95] });
      const knee = new T.Group(); knee.position.y = -THIGH; hip.add(knee);
      add(knee, new T.SphereGeometry(0.068, 16, 12), M.pants);
      add(knee, new T.CapsuleGeometry(0.062, 0.3, 8, 18), M.pants, -0.004, -0.21, 0);
      add(knee, new T.CylinderGeometry(0.066, 0.072, 0.07, 18, 1, true), M.pants, 0, -0.385, 0);
      const ankle = new T.Group(); ankle.position.y = -SHIN; knee.add(ankle);
      add(ankle, new T.CapsuleGeometry(0.05, 0.17, 8, 18), M.shoe, 0.066, -0.032, 0, { r: [0, 0, Math.PI / 2], s: [0.86, 1, 1.05] });
      add(ankle, new T.BoxGeometry(0.28, 0.022, 0.1), M.sole, 0.066, -0.07, 0);
      return { hip, knee, ankle };
    }
    const legN = leg(1), legF = leg(-1);

    const torso = new T.Group(); pelvis.add(torso);
    add(torso, new T.CapsuleGeometry(0.17, 0.2, 10, 28), M.shirt, 0, 0.27, 0, { s: [0.72, 1, 1.12] });
    add(torso, new T.CylinderGeometry(0.128, 0.128, 0.05, 28), M.belt, 0, 0.03, 0, { s: [0.97, 1, 1.5] });
    add(torso, new T.BoxGeometry(0.012, 0.04, 0.05), M.buckle, 0.124, 0.03, 0);
    add(torso, new T.TorusGeometry(0.068, 0.02, 10, 28), M.shirtShade, 0, 0.5, 0, { r: [Math.PI / 2, 0, 0] });
    add(torso, new T.BoxGeometry(0.06, 0.012, 0.05), M.shirt, 0.07, 0.49, 0.03, { r: [0, -0.4, -0.5] });
    add(torso, new T.BoxGeometry(0.06, 0.012, 0.05), M.shirt, 0.07, 0.49, -0.03, { r: [0, 0.4, -0.5] });
    for (const y of [0.43, 0.37]) add(torso, new T.SphereGeometry(0.008, 8, 6), M.button, 0.124, y, 0);
    // CIT-U lanyard + ID
    tube(torso, [[0.0, 0.52, 0.075], [0.07, 0.46, 0.065], [0.118, 0.36, 0.025], [0.126, 0.3, 0.004]], 0.006, M.lany);
    tube(torso, [[0.0, 0.52, -0.075], [0.07, 0.46, -0.065], [0.118, 0.36, -0.025], [0.126, 0.3, -0.004]], 0.006, M.lany);
    const id = new T.Group(); id.position.set(0.13, 0.25, 0); id.rotation.z = -0.08; torso.add(id);
    const idRest = new T.Group(); torso.add(idRest);   // the badge without its swing (the camera frames this)
    add(id, new T.BoxGeometry(0.006, 0.085, 0.062), M.card);
    add(id, new T.PlaneGeometry(0.062, 0.085), new T.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 248; c.height = 340; const g = c.getContext('2d'); ((g, w, h) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8a1c2b'; g.fillRect(0, 0, w, 74); g.fillStyle = '#f4c542'; g.fillRect(0, 74, w, 8);
      g.fillStyle = '#ffe08a'; g.font = '900 34px Archivo, Arial'; g.textAlign = 'center'; g.fillText('CIT-U', w / 2, 50);
      g.fillStyle = '#d9a07a'; g.fillRect(64, 104, 120, 132); g.fillStyle = '#3d2313'; g.fillRect(64, 104, 120, 40);
      g.fillStyle = '#ff8a1e'; g.fillRect(84, 156, 80, 18);
      g.fillStyle = '#17151c'; g.font = '700 24px Inter, Arial'; g.fillText('SEAN LORICO', w / 2, 272);
      g.fillStyle = '#6b6478'; g.font = '500 18px Inter, Arial'; g.fillText('BS COMPUTER ENG.', w / 2, 300);
      g.fillStyle = '#17151c'; for (let i = 0; i < 26; i++) g.fillRect(40 + i * 6.5, 314, (i % 3) + 1.5, 18);
    })(g, 248, 340); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.center.set(0.5, 0.5); t.rotation = Math.PI; return t; })() }), 0.0035, 0, 0, { r: [0, Math.PI / 2, 0] });
    // backpack (springy)
    const bag = new T.Group(); bag.position.set(-0.165, 0.29, 0); torso.add(bag);
    add(bag, roundedBox(0.3, 0.38, 0.15, 0.04), M.bag, 0, 0, 0, { r: [0, Math.PI / 2, 0] });
    add(bag, roundedBox(0.22, 0.17, 0.07, 0.025), M.bagDark, -0.09, -0.08, 0, { r: [0, Math.PI / 2, 0] });
    add(bag, new T.TorusGeometry(0.04, 0.01, 8, 16, Math.PI), M.bagDark, 0, 0.2, 0, { r: [0, Math.PI / 2, 0] });
    for (const s of [1, -1]) tube(torso, [[-0.1, 0.48, s * 0.11], [0.0, 0.53, s * 0.12], [0.1, 0.45, s * 0.125], [0.11, 0.3, s * 0.13], [0.07, 0.13, s * 0.13]], 0.016, M.bagDark);

    // neck + head
    const neck = new T.Group(); neck.position.y = 0.52; torso.add(neck);
    add(neck, new T.CylinderGeometry(0.047, 0.055, 0.11, 18), M.skin, 0, 0.03, 0);
    const head = new T.Group(); head.position.y = 0.155; neck.add(head);
    add(head, new T.SphereGeometry(0.105, 32, 24), M.skin, 0.005, 0.01, 0, { s: [1, 1.12, 0.9] });
    add(head, new T.SphereGeometry(0.085, 24, 16), M.skin, 0.022, -0.055, 0, { s: [1, 0.82, 0.86] });
    add(head, new T.ConeGeometry(0.018, 0.05, 14), M.skin, 0.108, -0.01, 0, { r: [0, 0, -Math.PI / 2] });
    for (const s of [1, -1]) add(head, new T.SphereGeometry(0.026, 14, 10), M.skin, -0.005, -0.005, s * 0.098, { s: [0.6, 1, 0.45] });
    add(head, new T.BoxGeometry(0.006, 0.006, 0.034), M.mouth, 0.096, -0.07, 0);
    // hair: cap tilted back + fringe + tufts
    add(head, new T.SphereGeometry(0.118, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), M.hair, -0.012, 0.03, 0, { s: [1.06, 1, 0.97], r: [0, 0, 0.32] });
    add(head, new T.SphereGeometry(0.108, 24, 16), M.hair, -0.045, 0.0, 0, { s: [0.78, 1.02, 0.97] });
    for (let k = -2; k <= 2; k++) add(head, new T.SphereGeometry(0.036, 12, 10), M.hair, 0.072, 0.075 - Math.abs(k) * 0.006, k * 0.032, { s: [1, 0.62, 1] });
    for (const [x, y, z] of [[0.02, 0.13, 0.03], [-0.03, 0.13, -0.04], [0.04, 0.12, -0.05], [-0.06, 0.1, 0.05]]) add(head, new T.SphereGeometry(0.04, 12, 10), M.hair, x, y, z, { s: [1, 0.7, 1] });
    // sunglasses
    add(head, new T.BoxGeometry(0.012, 0.01, 0.2), M.frame, 0.098, 0.03, 0);
    for (const s of [1, -1]) {
      add(head, roundedBox(0.075, 0.042, 0.012, 0.005), M.lens, 0.104, 0.008, s * 0.043, { r: [0, Math.PI / 2 + s * 0.28, 0] });
      add(head, new T.BoxGeometry(0.12, 0.008, 0.008), M.frame, 0.045, 0.028, s * 0.101);
    }

    function arm(side) {
      const sh = new T.Group(); sh.position.set(0, 0.44, side * 0.2); torso.add(sh);
      add(sh, new T.SphereGeometry(0.07, 18, 14), M.shirt);
      add(sh, new T.CylinderGeometry(0.07, 0.066, 0.16, 20, 1, true), M.shirt, 0, -0.07, 0);
      add(sh, new T.CapsuleGeometry(0.047, 0.18, 8, 16), M.skin, 0, -0.15, 0);
      const elbow = new T.Group(); elbow.position.y = -0.28; sh.add(elbow);
      add(elbow, new T.CapsuleGeometry(0.041, 0.17, 8, 16), M.skin, 0, -0.12, 0);
      add(elbow, new T.SphereGeometry(0.045, 14, 12), M.skin, 0.004, -0.25, 0, { s: [0.62, 1.12, 0.9] });
      add(elbow, new T.CapsuleGeometry(0.014, 0.03, 6, 8), M.skin, 0.03, -0.235, 0, { r: [0, 0, 0.4] });
      return { sh, elbow };
    }
    const armN = arm(1), armF = arm(-1);
    const phone = new T.Group(); phone.position.set(0.035, -0.375, 0.02); phone.rotation.set(0, 0, 0.18); armN.elbow.add(phone);
    add(phone, roundedBox(0.012, 0.15, 0.075, 0.004), M.frame);
    add(phone, new T.PlaneGeometry(0.066, 0.138), new T.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 264; c.height = 552; const g = c.getContext('2d'); ((g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2d3368'); gr.addColorStop(0.55, '#8a1c2b'); gr.addColorStop(1, '#f4c542');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '300 92px Inter, Arial'; g.fillText('9:41', w / 2, 150);
      g.font = '500 22px Inter, Arial'; g.fillText('Tuesday · Cebu', w / 2, 186);
      const apps = [['#17151c', 'GH'], ['#1877f2', 'f'], ['#ffffff', 'M']];
      apps.forEach(([c, t], i) => { const x = 46 + i * 66; g.fillStyle = c; g.beginPath(); g.roundRect ? g.roundRect(x, 420, 50, 50, 12) : g.rect(x, 420, 50, 50); g.fill(); g.fillStyle = c === '#ffffff' ? '#ea4335' : '#fff'; g.font = '700 22px Inter, Arial'; g.fillText(t, x + 25, 453); });
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(w / 2 - 50, h - 22, 100, 6);
    })(g, 264, 552); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.center.set(0.5, 0.5); t.rotation = Math.PI; return t; })(), toneMapped: false }), 0.0065, 0, 0, { r: [0, Math.PI / 2, 0] });
    phone.scale.setScalar(0.0001);

    /* ---------------- animate ---------------- */
    const IDLE = { hipN: 2, hipF: -2, knee: 3, armN: -3, armF: 3, el: 12 };
    let last = null, dist = 0, lastMove = -1e9, dir = 1, w = 0, lastT = performance.now(), lastPhase = 0;
    let bagY = 0, bagV = 0, prevBob = 0, yaw = 0;

    function update(src, now, opts = {}) {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
      if (last === null) last = src;
      const d = src - last;
      if (Math.abs(d) > 1e-5) { dist += Math.abs(d); dir = d > 0 ? 1 : -1; lastMove = now; }
      last = src;
      const walking = now - lastMove < 160;
      w += ((walking ? 1 : 0) - w) * Math.min(1, dt * (walking ? 9 : 4));

      const ph = (dist / STRIDE) % 1;
      if (walking && opts.onStep && ((lastPhase < 0.02 && ph >= 0.02) || (lastPhase < 0.52 && ph >= 0.52))) opts.onStep();
      if (walking) lastPhase = ph;

      const mix = (a, b) => a + (b - a) * w;
      let hipN = mix(IDLE.hipN, hipAt(ph)), kneeN = mix(IDLE.knee, kneeAt(ph)), pitchN = mix(0, pitchAt(ph));
      let hipF = mix(IDLE.hipF, hipAt(ph + 0.5)), kneeF = mix(IDLE.knee, kneeAt(ph + 0.5)), pitchF = mix(0, pitchAt(ph + 0.5));
      let aN = mix(IDLE.armN, armAt(ph)), aF = mix(IDLE.armF, armAt(ph + 0.5));
      let eN = mix(IDLE.el, elbowAt(ph)), eF = mix(IDLE.el, elbowAt(ph + 0.5));

      // seated pose (riding the jeepney): thighs forward, shins down, hands on lap
      const sit = clampSit(opts.sit);
      if (sit > 0) {
        const sm = (a, b) => a + (b - a) * sit;
        hipN = sm(hipN, 88); hipF = sm(hipF, 84); kneeN = sm(kneeN, 90); kneeF = sm(kneeF, 86); pitchN = sm(pitchN, 0); pitchF = sm(pitchF, 0);
        aN = sm(aN, 26); aF = sm(aF, 22); eN = sm(eN, 58); eF = sm(eF, 52);
      }

      // acting poses layered on top (classroom beats)
      let look = 0, turn = 0, leanX = 0, idLift = 0, phoneOn = 0;
      for (const p of opts.pose || []) {
        const k = Math.max(0, Math.min(1, p.w || 0)); if (!k) continue;
        const bl = (a, b) => (b == null ? a : a + (b - a) * k);
        aN = bl(aN, p.aN); eN = bl(eN, p.eN); aF = bl(aF, p.aF); eF = bl(eF, p.eF);
        look += (p.look || 0) * k; turn += (p.turn || 0) * k; leanX += (p.lean || 0) * k;
        idLift += (p.idLift || 0) * k; phoneOn += (p.phone || 0) * k;
      }

      const low = Math.max(lowest(hipN, kneeN, pitchN), lowest(hipF, kneeF, pitchF));
      const bob = HIP_H - low;
      body.position.y = bob * (1 - sit);

      const vel = (bob - prevBob) / dt; prevBob = bob;
      bagV += (-bagY * 260 - bagV * 16 - vel * 1.2) * dt;
      bagY = Math.max(-0.02, Math.min(0.02, bagY + bagV * dt));
      bag.position.y = 0.29 + bagY;

      const t = now / 1000;
      const breathe = (1 - w) * Math.sin(t * 1.7) * 0.004;
      const lean = (1 + 4 * w) * D2R * (1 - sit);
      torso.rotation.z = -lean - leanX * D2R;
      torso.position.y = breathe;
      head.rotation.z = lean * 0.6 + (w * Math.sin(ph * 4 * Math.PI) * 1.2 + (1 - w) * Math.sin(t * 0.6) * 2) * D2R;
      head.rotation.y = (1 - w) * Math.sin(t * 0.35) * 0.18 * (1 - Math.min(1, Math.abs(turn) * 2)) + turn;
      head.rotation.z += look * D2R;
      {
        // grab: the badge flips up and stands straight in front of him (face toward him)…
        const k = Math.max(0, Math.min(1, idLift)), e = k * k * (3 - 2 * k), L = (a, b) => a + (b - a) * e;
        id.position.set(L(0.13, 0.36), L(0.25, 0.4), 0);
        id.rotation.set(0, 0, L(-0.08, Math.PI));
        // …then swings gently from its clip while he reads it
        idRest.position.copy(id.position); idRest.quaternion.copy(id.quaternion);
        const held = Math.max(0, Math.min(1, (k - 0.85) / 0.15));
        const sw = (Math.sin(t * 1.9) * 0.12 + Math.sin(t * 0.73 + 1) * 0.035) * held;
        if (sw) {
          const P = 0.06;   // clip sits just above the card's top edge
          swOff.set(0, -P + P * Math.cos(sw), P * Math.sin(sw)).applyQuaternion(id.quaternion);
          id.position.add(swOff);
          swQ.setFromAxisAngle(X_AXIS, sw); id.quaternion.multiply(swQ);
        }
      }
      phone.scale.setScalar(Math.max(0.0001, Math.min(1, phoneOn)));

      const setLeg = (L, hip, knee, pitch) => {
        L.hip.rotation.z = hip * D2R;
        L.knee.rotation.z = -knee * D2R;
        L.ankle.rotation.z = (pitch - (hip - knee)) * D2R;
      };
      setLeg(legN, hipN, kneeN, pitchN);
      setLeg(legF, hipF, kneeF, pitchF);
      armN.sh.rotation.z = aN * D2R + lean; armN.elbow.rotation.z = eN * D2R;
      armF.sh.rotation.z = aF * D2R + lean; armF.elbow.rotation.z = eF * D2R;
      armN.sh.rotation.x = -0.06; armF.sh.rotation.x = 0.06;

      // facing: walking direction, or an explicit target (e.g. towards a door)
      let target = opts.face != null ? opts.face : (dir > 0 || now - lastMove > 900 ? 0 : Math.PI);
      let dYaw = target - yaw; dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));   // always turn the short way
      yaw += dYaw * Math.min(1, dt * 6);
      root.rotation.y = yaw;
    }

    function headWorld(v) { return head.getWorldPosition(v); }
    update(0, performance.now());
    // world-space corners (TL, TR, BR, BL as read by the viewer) of a face on +x of obj
    const quad = (obj, x, w, h, arr) => {
      obj.updateWorldMatrix(true, false);
      [[x, -h / 2, -w / 2], [x, -h / 2, w / 2], [x, h / 2, w / 2], [x, h / 2, -w / 2]]
        .forEach((p, i) => (arr[i] || (arr[i] = new T.Vector3())).set(p[0], p[1], p[2]).applyMatrix4(obj.matrixWorld));
      return arr;
    };
    const swOff = new T.Vector3(), swQ = new T.Quaternion(), X_AXIS = new T.Vector3(1, 0, 0);
    const idQuad = (arr = [], rest) => quad(rest ? idRest : id, 0.0042, 0.062, 0.085, arr);
    const phoneQuad = (arr = []) => quad(phone, 0.0075, 0.066, 0.138, arr);
    const idWorld = (v) => id.localToWorld(v.set(0.01, 0, 0));
    const phoneWorld = (v) => phone.localToWorld(v.set(0.01, 0, 0));
    return { root, update, headWorld, idWorld, phoneWorld, idQuad, phoneQuad, stride: STRIDE };
  }

  window.Sean3D = { create, STRIDE };
})();
